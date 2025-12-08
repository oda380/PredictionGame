// src/app/admin/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import AdminPanel from '../../components/AdminPanel';
import { useGameContractReads } from '../../hooks/useGameContractReads';
import { useActiveRound } from '../../hooks/useActiveRound';
import Notification from '../../components/ui/Notification';
import { useState, useCallback } from 'react';
import { GAME_CONTRACT_ABI, GAME_CONTRACT_ADDRESS, TARGET_CHAIN_ID } from '../../config/contract';
import { ThemeToggle } from '../../components/ui/ThemeToggle';

export default function AdminPage() {
    const router = useRouter();
    const { address: userAddress, isConnected, chain } = useAccount();
    const publicClient = usePublicClient({ chainId: TARGET_CHAIN_ID });

    const [notification, setNotification] = useState({ message: '', type: '' });
    const showNotif = useCallback((message: string, type: string = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification({ message: '', type: '' }), 5000);
    }, []);

    const {
        entryFeeDisplay,
        isGamePaused,
        isTokenGatingEnabled,
        tokenGatingEnabledDisplay,
        gatingTokenAddress,
        minGatingTokenBalance,
        btcPriceFeedAddress,
        prizePoolPercentage,
        latestCreatedRoundId,
        nextRoundId,
    } = useGameContractReads();

    // Get active round status for raise stake feature
    const { isLatestRoundStakeable } = useActiveRound({
        latestCreatedRoundId,
        nextRoundId,
        isGamePaused,
    });

    // State for all pending (unresolved) rounds
    const [pendingRounds, setPendingRounds] = useState<string[]>([]);

    // Fetch all pending rounds
    useEffect(() => {
        const fetchPendingRounds = async () => {
            if (!publicClient || !latestCreatedRoundId || latestCreatedRoundId === 'N/A' || latestCreatedRoundId === '0') {
                setPendingRounds([]);
                return;
            }

            const lastRound = parseInt(latestCreatedRoundId);
            const pending: string[] = [];

            // Check each round from 1 to latestCreatedRoundId
            for (let i = 1; i <= lastRound; i++) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const roundData = await publicClient.readContract({
                        abi: GAME_CONTRACT_ABI,
                        address: GAME_CONTRACT_ADDRESS,
                        functionName: 'rounds',
                        args: [BigInt(i)]
                    } as any) as unknown[];

                    // index 2 is 'resolved' boolean
                    const isResolved = roundData[2] as boolean;
                    if (!isResolved) {
                        pending.push(i.toString());
                    }
                } catch (err) {
                    console.error(`Error fetching round ${i}:`, err);
                }
            }

            setPendingRounds(pending);
        };

        if (isConnected && chain?.id === TARGET_CHAIN_ID) {
            fetchPendingRounds();
        }
    }, [isConnected, chain, publicClient, latestCreatedRoundId]);

    const { writeContractAsync, isPending: isWritePending } = useWriteContract();

    const baseWriteConfig = {
        abi: GAME_CONTRACT_ABI,
        address: GAME_CONTRACT_ADDRESS,
    };

    // Redirect if not on correct chain
    useEffect(() => {
        if (isConnected && chain?.id !== TARGET_CHAIN_ID) {
            showNotif('Please switch to the correct network', 'warning');
        }
    }, [isConnected, chain, showNotif]);

    if (!isConnected) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-space-950/50 backdrop-blur-sm">
                <div className="glass-panel rounded-2xl p-8 flex flex-col items-center max-w-md w-full">
                    <h1 className="text-3xl font-heading font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-brand-indigo to-brand-purple">Admin Access</h1>
                    <p className="mb-6 text-slate-400 text-center">Connect your wallet to access the neural command terminal.</p>
                    <ConnectButton />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="container mx-auto max-w-6xl">
                <header className="mb-8 p-6 glass-panel rounded-2xl flex flex-col sm:flex-row justify-between items-center relative overflow-hidden">
                    {/* Background glow for header */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-indigo to-brand-purple opacity-50"></div>

                    <div className="relative z-10">
                        <h1 className="text-3xl font-heading font-bold text-slate-800 dark:text-white tracking-wider uppercase">
                            Admin <span className="text-indigo-600 dark:text-brand-indigo">Terminal</span>
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-mono tracking-tight mt-1">:: CONTRACT OWNER MODULE ::</p>
                    </div>
                    <div className="flex flex-col items-end mt-4 sm:mt-0 relative z-10">
                        <div className="flex items-center gap-2">
                            <ThemeToggle />
                            <ConnectButton />
                        </div>
                        <button
                            onClick={() => router.push('/')}
                            className="mt-3 text-sm text-cyan-600 dark:text-brand-cyan hover:text-cyan-800 dark:hover:text-white transition-colors flex items-center gap-1 font-medium"
                        >
                            ← Return to Game
                        </button>
                    </div>
                </header>

                <Notification
                    message={notification.message}
                    type={notification.type as 'success' | 'error' | 'info' | 'warning'}
                    onDismiss={() => setNotification({ message: '', type: '' })}
                />

                <AdminPanel
                    showNotif={showNotif}
                    writeContractAsync={writeContractAsync}
                    baseWriteConfig={baseWriteConfig}
                    isWritePending={isWritePending}
                    gameData={{
                        isGamePaused,
                        isTokenGatingEnabled,
                        tokenGatingEnabledDisplay,
                        gatingTokenAddress,
                        minGatingTokenBalance,
                        entryFeeDisplay,
                        prizePoolPercentage,
                        btcPriceFeedAddress,
                        latestCreatedRoundId,
                        isLatestRoundStakeable,
                        pendingRounds,
                    }}
                    userAddress={userAddress}
                />
            </div>
        </div>
    );
}
