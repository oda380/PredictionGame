// src/utils/errorParsing.js

/**
 * Parse blockchain/wallet errors into user-friendly messages.
 * @param {Error} error - The error object from wagmi/viem.
 * @returns {string} User-friendly error message.
 */
export function parseContractError(error) {
    const msg = error?.shortMessage || error?.message || "Unknown error occurred.";

    // Common user-friendly mappings
    if (msg.includes("User rejected") || msg.includes("user rejected")) {
        return "Transaction was rejected by the user.";
    }
    if (msg.includes("insufficient funds")) {
        return "Insufficient funds to complete this transaction.";
    }
    if (msg.includes("execution reverted")) {
        // Try to extract the revert reason
        const revertMatch = msg.match(/execution reverted: (.+)/i);
        if (revertMatch && revertMatch[1]) {
            return `Contract error: ${revertMatch[1]}`;
        }
        return "Transaction failed: Contract execution reverted.";
    }
    if (msg.includes("nonce too low")) {
        return "Transaction nonce conflict. Please try again.";
    }
    if (msg.includes("gas required exceeds allowance")) {
        return "Transaction requires more gas than allowed. Try increasing gas limit.";
    }
    if (msg.includes("network changed") || msg.includes("chain mismatch")) {
        return "Network changed during transaction. Please reconnect and try again.";
    }

    // Return original message if no specific mapping
    return msg;
}

/**
 * Wrapper to parse error and optionally log it.
 * @param {Error} error - The error object.
 * @param {string} context - Where the error occurred (e.g., "Place Bet").
 * @param {boolean} logToConsole - Whether to log to console.
 * @returns {string} Parsed error message.
 */
export function handleError(error, context = "Action", logToConsole = true) {
    if (logToConsole) {
        console.error(`${context} Error:`, error);
    }
    return parseContractError(error);
}
