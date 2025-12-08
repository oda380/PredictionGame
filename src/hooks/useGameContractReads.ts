// src/hooks/useGameContractReads.ts
import { useReadContract } from 'wagmi';
import { Address } from 'viem';
import { GAME_CONTRACT_ABI, GAME_CONTRACT_ADDRESS, TARGET_CHAIN_ID, ZERO_ADDRESS } from '../config/contract';
import { formatWeiToEthString } from '../utils/formatting';
import { useCallback } from 'react';

const DEFAULT_STALE_TIME = 3 * 60 * 1000;
const LONG_STALE_TIME = 5 * 60 * 1000;

interface UseGameContractReadsReturn {
    nextRoundId: string;
    latestCreatedRoundId: string;
    entryFeeInWei: bigint | undefined;
    entryFeeDisplay: string;
    isGamePaused: boolean | null;
    gamePausedDisplay: string;
    contractOwner: Address | null;
    isTokenGatingEnabled: boolean | null;
    tokenGatingEnabledDisplay: string;
    gatingTokenAddress: string;
    minGatingTokenBalance: string;
    btcPriceFeedAddress: Address | null;
    prizePoolPercentage: number | null;
    refetchAllGameData: () => Promise<void>;
}

export function useGameContractReads(): UseGameContractReadsReturn {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseReadConfig = (functionName: string, args: readonly unknown[] = [], options: Record<string, unknown> = {}): any => ({
        abi: GAME_CONTRACT_ABI,
        address: GAME_CONTRACT_ADDRESS,
        chainId: TARGET_CHAIN_ID,
        functionName,
        args,
        query: {
            staleTime: DEFAULT_STALE_TIME,
            refetchOnWindowFocus: false,
            refetchOnMount: true,
            ...options,
        },
    });

    const { data: nextRoundIdData, refetch: refetchNextRoundId } = useReadContract(baseReadConfig('getNextRoundId'));
    const { data: latestCreatedRoundIdData, refetch: refetchLatestCreatedRoundId } = useReadContract(baseReadConfig('getLatestCreatedRoundId'));
    const { data: entryFeeData, refetch: refetchEntryFee } = useReadContract(baseReadConfig('entryFee', [], { staleTime: LONG_STALE_TIME }));
    const { data: gamePausedData, refetch: refetchGamePaused } = useReadContract(baseReadConfig('paused'));
    const { data: contractOwnerData, refetch: refetchContractOwner } = useReadContract(baseReadConfig('owner', [], { staleTime: Infinity }));
    const { data: tokenGatingEnabledData, refetch: refetchTokenGatingEnabled } = useReadContract(baseReadConfig('tokenGatingEnabled'));
    const { data: gatingTokenData, refetch: refetchGatingToken } = useReadContract(baseReadConfig('gatingToken', [], { staleTime: LONG_STALE_TIME }));
    const { data: minGatingTokenBalanceData, refetch: refetchMinGatingBalance } = useReadContract(baseReadConfig('minGatingTokenBalance', [], { staleTime: LONG_STALE_TIME }));
    const { data: btcPriceFeedAddressDataFromContract, refetch: refetchBtcPriceFeedAddress } = useReadContract(baseReadConfig('priceFeed', [], { staleTime: LONG_STALE_TIME }));
    const { data: prizePoolPercentageData, refetch: refetchPrizePoolPercentage } = useReadContract(baseReadConfig('prizePoolPercentage', [], { staleTime: LONG_STALE_TIME }));

    const nextRoundId = nextRoundIdData !== undefined ? String(nextRoundIdData) : 'N/A';
    const latestCreatedRoundId = latestCreatedRoundIdData !== undefined ? String(latestCreatedRoundIdData) : 'N/A';
    const entryFeeInWei = entryFeeData as bigint | undefined;
    const entryFeeDisplay = entryFeeData !== undefined ? formatWeiToEthString(entryFeeData as bigint) : 'N/A';
    const isGamePaused = typeof gamePausedData === 'boolean' ? gamePausedData : null;
    const contractOwner = contractOwnerData !== undefined ? (contractOwnerData as Address) : null;
    const isTokenGatingEnabled = typeof tokenGatingEnabledData === 'boolean' ? tokenGatingEnabledData : null;
    const gatingTokenAddress = gatingTokenData && gatingTokenData !== ZERO_ADDRESS ? String(gatingTokenData) : "N/A";
    const minGatingTokenBalance = minGatingTokenBalanceData !== undefined ? String(minGatingTokenBalanceData) : "N/A";
    const btcPriceFeedAddress = btcPriceFeedAddressDataFromContract && btcPriceFeedAddressDataFromContract !== ZERO_ADDRESS
        ? (btcPriceFeedAddressDataFromContract as Address)
        : null;
    const prizePoolPercentage = prizePoolPercentageData !== undefined ? Number(prizePoolPercentageData) : null;

    const refetchAllGameData = useCallback(async () => {
        await Promise.all([
            refetchNextRoundId(),
            refetchLatestCreatedRoundId(),
            refetchEntryFee(),
            refetchGamePaused(),
            refetchContractOwner(),
            refetchTokenGatingEnabled(),
            refetchGatingToken(),
            refetchMinGatingBalance(),
            refetchBtcPriceFeedAddress(),
            refetchPrizePoolPercentage(),
        ]);
    }, [
        refetchNextRoundId, refetchLatestCreatedRoundId, refetchEntryFee,
        refetchGamePaused, refetchContractOwner, refetchTokenGatingEnabled,
        refetchGatingToken, refetchMinGatingBalance, refetchBtcPriceFeedAddress,
        refetchPrizePoolPercentage
    ]);

    return {
        nextRoundId,
        latestCreatedRoundId,
        entryFeeInWei,
        entryFeeDisplay,
        isGamePaused,
        gamePausedDisplay: isGamePaused === null ? "N/A" : (isGamePaused ? "Yes" : "No"),
        contractOwner,
        isTokenGatingEnabled,
        tokenGatingEnabledDisplay: isTokenGatingEnabled === null ? "N/A" : (isTokenGatingEnabled ? "Enabled" : "Disabled"),
        gatingTokenAddress,
        minGatingTokenBalance,
        btcPriceFeedAddress,
        prizePoolPercentage,
        refetchAllGameData,
    };
}
