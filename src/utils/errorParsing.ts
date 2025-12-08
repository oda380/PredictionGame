// src/utils/errorParsing.ts

interface ContractError extends Error {
    shortMessage?: string;
}

/**
 * Parse blockchain/wallet errors into user-friendly messages.
 */
export function parseContractError(error: ContractError | null | undefined): string {
    const msg = error?.shortMessage || error?.message || "Unknown error occurred.";

    // Common user-friendly mappings
    if (msg.includes("User rejected") || msg.includes("user rejected")) {
        return "Transaction was rejected by the user.";
    }
    if (msg.includes("insufficient funds")) {
        return "Insufficient funds to complete this transaction.";
    }
    if (msg.includes("execution reverted")) {
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

    return msg;
}

/**
 * Wrapper to parse error and optionally log it.
 */
export function handleError(error: ContractError, context: string = "Action", logToConsole: boolean = true): string {
    if (logToConsole) {
        console.error(`${context} Error:`, error);
    }
    return parseContractError(error);
}
