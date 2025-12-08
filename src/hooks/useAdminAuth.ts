// src/hooks/useAdminAuth.ts
import { useState, useCallback } from 'react';
import { useAccount, useSignMessage } from 'wagmi';

interface AdminAuthState {
    isAuthenticated: boolean;
    isAuthenticating: boolean;
    error: string | null;
}

export function useAdminAuth() {
    const { address, isConnected } = useAccount();
    const { signMessageAsync } = useSignMessage();

    const [authState, setAuthState] = useState<AdminAuthState>({
        isAuthenticated: false,
        isAuthenticating: false,
        error: null,
    });

    const generateNonce = () => {
        return Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    };

    const signIn = useCallback(async () => {
        if (!address || !isConnected) {
            setAuthState(prev => ({ ...prev, error: 'Wallet not connected' }));
            return false;
        }

        setAuthState({ isAuthenticated: false, isAuthenticating: true, error: null });

        try {
            const nonce = generateNonce();
            const timestamp = new Date().toISOString();

            const message = `Sign in to BTC Prediction Game Admin

Address: ${address}
Timestamp: ${timestamp}
Nonce: ${nonce}

This signature proves you own this wallet and grants admin access if you are the contract owner.`;

            // Request signature from wallet
            const signature = await signMessageAsync({
                account: address,
                message
            });

            // Send to server for verification
            const response = await fetch('/api/auth/siwe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address,
                    signature,
                    message,
                    nonce,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Authentication failed');
            }

            setAuthState({ isAuthenticated: true, isAuthenticating: false, error: null });
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
            setAuthState({ isAuthenticated: false, isAuthenticating: false, error: errorMessage });
            return false;
        }
    }, [address, isConnected, signMessageAsync]);

    const signOut = useCallback(async () => {
        try {
            await fetch('/api/auth/siwe', { method: 'DELETE' });
            setAuthState({ isAuthenticated: false, isAuthenticating: false, error: null });
        } catch (error) {
            console.error('Sign out error:', error);
        }
    }, []);

    const checkSession = useCallback(async () => {
        try {
            const response = await fetch('/api/auth/siwe');
            const data = await response.json();

            if (data.authenticated && data.address?.toLowerCase() === address?.toLowerCase()) {
                setAuthState(prev => ({ ...prev, isAuthenticated: true }));
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }, [address]);

    return {
        ...authState,
        signIn,
        signOut,
        checkSession,
        address,
        isConnected,
    };
}
