// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Interface for ERC20 token (subset needed for balanceOf)
interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
}

contract BTCPricePredictionGameV4 is Pausable, Ownable {

    // =========================================================================
    // Data Types
    // =========================================================================

    struct Round {
        uint256 roundEndTime;
        uint256 predictionDeadline;
        bool resolved;
    }

    struct Bet {
        uint256 rawPrediction; 
        uint256 amount; // Amount paid as entry fee for this bet
        bool claimed;
        bool placed; // NEW: Flag to indicate if a bet has been made for this round by this user
    }

    struct PredictionDifference {
        address payable bettor;
        uint256 difference;
        uint256 originalRawPrediction;
    }

    // =========================================================================
    // State Variables
    // =========================================================================

    mapping(uint256 => mapping(address => Bet)) public bets;
    mapping(uint256 => Round) public rounds;
    mapping(uint256 => address payable[]) public winners; 
    mapping(uint256 => address[]) public bettorsInRound; 
    mapping(uint256 => uint256) public totalCollectedPerRound; // Includes entry fees + contributions

    AggregatorV3Interface public priceFeed;
    uint256 public entryFee;
    uint256 public prizePoolPercentage;
    uint256 public maxBetAmount;
    uint256 public currentRoundId;
    uint256 public accumulatedAdminFees;

    IERC20 public gatingToken;
    uint256 public minGatingTokenBalance;
    bool public tokenGatingEnabled; 

    // =========================================================================
    // Constants
    // =========================================================================

    uint256 public constant PRICE_DECIMALS = 8;
    uint256 public constant USER_PREDICTION_DECIMALS = 4;
    uint256 public constant MAX_WINNERS = 5;
    uint256 public constant STALE_PRICE_THRESHOLD = 1 hours;

    // =========================================================================
    // Events
    // =========================================================================

    event BetPlaced(address indexed user, uint256 rawPrediction, uint256 indexed roundId, uint256 amount);
    event RoundCreated(uint256 indexed roundId, uint256 roundEndTime, uint256 predictionDeadline);
    event RoundResolved(uint256 indexed roundId, uint256 actualPrice, uint256 numberOfWinners);
    event PrizeClaimed(address indexed winner, uint256 indexed roundId, uint256 amount);
    event BetCancelled(address indexed user, uint256 indexed roundId);
    event GamePaused();
    event GameUnpaused();
    event OracleAddressChanged(address indexed newOracle);
    event EntryFeeChanged(uint256 newEntryFee);
    event PrizePoolPercentageChanged(uint256 newPercentage);
    event MaxBetAmountChanged(uint256 newMaxBetAmount);
    event AdminFeesWithdrawn(address indexed to, uint256 amount);
    event TokenGatingToggled(bool enabled);
    event GatingTokenSet(address indexed tokenAddress, uint256 minBalance);
    event StakeRaisedForRound(uint256 indexed roundId, address indexed funder, uint256 amount);

    // =========================================================================
    // Modifiers
    // =========================================================================

    modifier roundInitialized(uint256 _roundId) {
        require(rounds[_roundId].roundEndTime > 0, "Round not initialized");
        _;
    }

    modifier onlyBeforePredictionDeadline(uint256 _roundId) {
        require(block.timestamp < rounds[_roundId].predictionDeadline, "Prediction deadline has passed");
        _;
    }

    modifier onlyAfterRoundEndTime(uint256 _roundId) {
        require(block.timestamp >= rounds[_roundId].roundEndTime, "Round end time has not passed");
        _;
    }

    modifier onlyUnresolvedRound(uint256 _roundId) {
        require(!rounds[_roundId].resolved, "Round is already resolved");
        _;
    }

    modifier onlyWinner(uint256 _roundId, address _user) {
        bool isWinnerFlag = false; 
        for (uint256 i = 0; i < winners[_roundId].length; i++) {
            if (winners[_roundId][i] == _user) {
                isWinnerFlag = true;
                break;
            }
        }
        require(isWinnerFlag, "Not a winner for this round");
        _;
    }

    // =========================================================================
    // Constructor
    // =========================================================================

    constructor(
        address _priceFeedAddress,
        uint256 _initialEntryFee,
        uint256 _initialPrizePoolPercentage,
        uint256 _initialMaxBetAmount
    ) Ownable(msg.sender) { 
        _setOracleAddress(_priceFeedAddress);
        _setMaxBetAmount(_initialMaxBetAmount); 
        _setEntryFee(_initialEntryFee); 
        _setPrizePoolPercentage(_initialPrizePoolPercentage);
        currentRoundId = 1; 
        tokenGatingEnabled = false;
    }

    // =========================================================================
    // User Functions 
    // =========================================================================
    function placeBet(uint256 _rawPrediction, uint256 _roundId)
        external
        payable
        whenNotPaused
        roundInitialized(_roundId)
        onlyBeforePredictionDeadline(_roundId)
    {
        require(msg.value == entryFee, "Incorrect entry fee"); 
        require(!bets[_roundId][msg.sender].placed, "Bet already placed for this round"); 
        require(_rawPrediction > 0, "Prediction must be greater than 0");

        if (tokenGatingEnabled) {
            require(address(gatingToken) != address(0), "Gating token not set");
            require(gatingToken.balanceOf(msg.sender) >= minGatingTokenBalance, "Insufficient token balance");
        }

        bets[_roundId][msg.sender] = Bet({
            rawPrediction: _rawPrediction,
            amount: msg.value, 
            claimed: false,
            placed: true 
        });
        totalCollectedPerRound[_roundId] += msg.value; 
        bettorsInRound[_roundId].push(msg.sender);

        emit BetPlaced(msg.sender, _rawPrediction, _roundId, msg.value);
    }

    function claimPrize(uint256 _roundId)
        external
        whenNotPaused 
        roundInitialized(_roundId)
        onlyWinner(_roundId, msg.sender)
    {
        require(rounds[_roundId].resolved, "Round not resolved yet");
        Bet storage userBet = bets[_roundId][msg.sender];
        require(!userBet.claimed, "Prize already claimed");

        uint256 roundTotalPot = totalCollectedPerRound[_roundId];
        uint256 prizePool = (roundTotalPot * prizePoolPercentage) / 100; 
        
        uint256 numberOfWinnersInRound = winners[_roundId].length;
        require(numberOfWinnersInRound > 0, "No winners for this round");
        uint256 individualPrize = prizePool / numberOfWinnersInRound; 

        userBet.claimed = true; 
        if (individualPrize > 0) { 
            (bool success, ) = msg.sender.call{value: individualPrize}(""); 
            require(success, "Prize transfer failed");
        }

        emit PrizeClaimed(msg.sender, _roundId, individualPrize);
    }

    function cancelBet(uint256 _roundId)
        external
        whenNotPaused
        roundInitialized(_roundId)
        onlyBeforePredictionDeadline(_roundId)
    {
        Bet storage userBet = bets[_roundId][msg.sender];
        require(userBet.placed, "No bet placed for this round to cancel"); 
        
        uint256 refundAmount = userBet.amount; 

        totalCollectedPerRound[_roundId] -= refundAmount; 
        _removeAddressFromArray(bettorsInRound[_roundId], msg.sender);
        
        delete bets[_roundId][msg.sender]; 

        if (refundAmount > 0) { 
            (bool success, ) = msg.sender.call{value: refundAmount}("");
            require(success, "Refund transfer failed");
        }
        emit BetCancelled(msg.sender, _roundId);
    }

    function raiseStakeInRound(uint256 _roundId) 
        external 
        payable 
        whenNotPaused 
        roundInitialized(_roundId) 
        onlyUnresolvedRound(_roundId) 
    {
        require(msg.value > 0, "Must send ETH to raise stake");
        totalCollectedPerRound[_roundId] += msg.value; 
        emit StakeRaisedForRound(_roundId, msg.sender, msg.value);
    }

    // =========================================================================
    // Owner Functions 
    // =========================================================================
    function createRound(uint256 _roundEndTime, uint256 _predictionDeadline) external onlyOwner {
        require(_roundEndTime > block.timestamp, "End time must be in the future");
        require(_predictionDeadline > block.timestamp, "Prediction deadline must be in the future");
        require(_predictionDeadline < _roundEndTime, "Deadline must be before end time");
        uint256 roundIdToCreate = currentRoundId;
        require(rounds[roundIdToCreate].roundEndTime == 0, "Round ID already in use");
        rounds[roundIdToCreate] = Round({
            roundEndTime: _roundEndTime,
            predictionDeadline: _predictionDeadline,
            resolved: false
        });
        currentRoundId++;
        emit RoundCreated(roundIdToCreate, _roundEndTime, _predictionDeadline);
    }

    function resolveRound(uint256 _roundId)
        external
        onlyOwner
        roundInitialized(_roundId)
        onlyAfterRoundEndTime(_roundId)
        onlyUnresolvedRound(_roundId)
    {
        rounds[_roundId].resolved = true; 
        int256 oraclePriceInt = getBtcPriceFromOracle(); 
        uint256 actualPriceScaled = SafeCast.toUint256(oraclePriceInt); 
        uint256 roundPot = totalCollectedPerRound[_roundId];
        if (roundPot > 0) { 
            uint256 feesForThisRound = (roundPot * (100 - prizePoolPercentage)) / 100;
            accumulatedAdminFees += feesForThisRound;
        }

        PredictionDifference[MAX_WINNERS] memory topPredictions;
        for (uint i = 0; i < MAX_WINNERS; i++) {
            topPredictions[i] = PredictionDifference(payable(address(0)), type(uint256).max, 0);
        }
        uint256 scalingFactor = 10**(PRICE_DECIMALS - USER_PREDICTION_DECIMALS); 
        address[] storage currentBettors = bettorsInRound[_roundId];

        if (currentBettors.length > 0) {
            for (uint j = 0; j < currentBettors.length; j++) {
                address payable user = payable(currentBettors[j]); 
                Bet storage userBet = bets[_roundId][user];
                
                uint256 userRawPrediction = userBet.rawPrediction; 
                uint256 userPredictionScaled = userRawPrediction * scalingFactor; 
                uint256 diff; 
                if (actualPriceScaled >= userPredictionScaled) {
                    diff = actualPriceScaled - userPredictionScaled;
                } else {
                    diff = userPredictionScaled - actualPriceScaled;
                }
                if (diff < topPredictions[MAX_WINNERS - 1].difference) {
                    topPredictions[MAX_WINNERS - 1] = PredictionDifference(user, diff, userRawPrediction);
                    for (uint k = MAX_WINNERS - 1; k > 0; k--) {
                        if (topPredictions[k].difference < topPredictions[k-1].difference) {
                            PredictionDifference memory temp = topPredictions[k];
                            topPredictions[k] = topPredictions[k-1];
                            topPredictions[k-1] = temp;
                        } else { break; }
                    }
                }
            }
        }
        delete winners[_roundId]; 
        for (uint i = 0; i < MAX_WINNERS; i++) {
            if (topPredictions[i].bettor != address(0)) { 
                winners[_roundId].push(topPredictions[i].bettor);
            } else { break; }
        }
        emit RoundResolved(_roundId, actualPriceScaled, winners[_roundId].length);
    }
    
    function _setOracleAddress(address _oracleAddress) internal {
        require(_oracleAddress != address(0), "Invalid oracle address");
        priceFeed = AggregatorV3Interface(_oracleAddress);
        emit OracleAddressChanged(_oracleAddress);
    }

    function _setEntryFee(uint256 _newEntryFee) internal {
        require(_newEntryFee >= 0, "Entry fee must be non-negative"); 
        require(_newEntryFee <= maxBetAmount, "Entry fee cannot exceed max bet amount");
        entryFee = _newEntryFee;
        emit EntryFeeChanged(_newEntryFee);
    }

    function _setPrizePoolPercentage(uint256 _newPercentage) internal {
        require(_newPercentage <= 100, "Percentage must be 0-100"); 
        prizePoolPercentage = _newPercentage;
        emit PrizePoolPercentageChanged(_newPercentage);
    }
    function _setMaxBetAmount(uint256 _newMaxBetAmount) internal {
        require(_newMaxBetAmount > 0 || (_newMaxBetAmount == 0 && entryFee == 0) , "Max bet amount must be positive unless entry fee is zero");
        maxBetAmount = _newMaxBetAmount;
        emit MaxBetAmountChanged(_newMaxBetAmount);
    }

    function setOracleAddress(address _oracleAddress) external onlyOwner { _setOracleAddress(_oracleAddress); }
    function setEntryFee(uint256 _newEntryFee) external onlyOwner { _setEntryFee(_newEntryFee); }
    function setPrizePoolPercentage(uint256 _newPercentage) external onlyOwner { _setPrizePoolPercentage(_newPercentage); }
    function setMaxBetAmount(uint256 _newMaxBetAmount) external onlyOwner { _setMaxBetAmount(_newMaxBetAmount); }

    function pauseGame() external onlyOwner { _pause(); emit GamePaused(); }
    function unpauseGame() external onlyOwner { _unpause(); emit GameUnpaused(); }

    function withdrawAdminFees(address payable _to) external onlyOwner {
        require(_to != address(0), "Cannot withdraw to zero address");
        uint256 amountToWithdraw = accumulatedAdminFees;
        require(amountToWithdraw > 0, "No fees to withdraw");
        accumulatedAdminFees = 0; 
        (bool success, ) = _to.call{value: amountToWithdraw}("");
        require(success, "Fee withdrawal failed");
        emit AdminFeesWithdrawn(_to, amountToWithdraw);
    }

    function setGatingToken(address _tokenAddress, uint256 _minBalance) external onlyOwner {
        require( _tokenAddress != address(0) || (_tokenAddress == address(0) && _minBalance == 0),
            "To clear gating token, min balance must also be 0. Or, provide a valid token address." );
        if (_tokenAddress == address(0)) { 
             gatingToken = IERC20(address(0));
             minGatingTokenBalance = 0;
             tokenGatingEnabled = false; 
        } else {
            gatingToken = IERC20(_tokenAddress);
            minGatingTokenBalance = _minBalance;
        }
        emit GatingTokenSet(_tokenAddress, _minBalance);
    }

    function toggleTokenGating(bool _enable) external onlyOwner {
        if (_enable) {
            require(address(gatingToken) != address(0), "Gating token must be set to enable");
        }
        tokenGatingEnabled = _enable; 
        emit TokenGatingToggled(_enable);
    }

    // =========================================================================
    // View Functions
    // =========================================================================
    function getBtcPriceFromOracle() public view returns (int256) {
        require(address(priceFeed) != address(0), "Oracle address not set");
        (, int256 price, , uint256 timestamp, ) = priceFeed.latestRoundData();
        require(price > 0, "Oracle price must be positive");
        require(timestamp > 0, "Oracle round data not available");
        require(block.timestamp - timestamp < STALE_PRICE_THRESHOLD, "Oracle price is stale");
        return price;
    }

    function getNextRoundId() external view returns (uint256) { return currentRoundId; }
    function getLatestCreatedRoundId() external view returns (uint256) {
        if (currentRoundId == 1 && rounds[1].roundEndTime == 0) return 0;
        return currentRoundId - 1;
    }
    // tokenGatingEnabled() is auto-generated due to public state variable

    function getWinnersForRound(uint256 _roundId) external view returns (address payable[] memory) {
        return winners[_roundId];
    }

    function getBettorsForRound(uint256 _roundId) external view returns (address[] memory) {
        return bettorsInRound[_roundId];
    }
    
    // =========================================================================
    // Internal Helper Functions
    // =========================================================================
    function _removeAddressFromArray(address[] storage array, address addrToRemove) internal {
        uint256 length = array.length;
        for (uint i = 0; i < length; i++) {
            if (array[i] == addrToRemove) {
                array[i] = array[length - 1]; 
                array.pop(); 
                return; 
            }
        }
    }
}