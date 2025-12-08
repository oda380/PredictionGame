// src/components/AdminAuthButton.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '../hooks/useAdminAuth';
import Button from './ui/Button';

interface AdminAuthButtonProps {
    showNotif?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const AdminAuthButton: React.FC<AdminAuthButtonProps> = ({ showNotif }) => {
    const router = useRouter();
    const {
        isAuthenticated,
        isAuthenticating,
        error,
        signIn,
        checkSession,
        isConnected
    } = useAdminAuth();

    // Check session on mount
    useEffect(() => {
        if (isConnected) {
            checkSession();
        }
    }, [isConnected, checkSession]);

    // Show error notification
    useEffect(() => {
        if (error && showNotif) {
            showNotif(error, 'error');
        }
    }, [error, showNotif]);

    const handleAdminAccess = async () => {
        if (isAuthenticated) {
            // Already authenticated - go directly to admin
            router.push('/admin');
            return;
        }

        // Need to sign in first
        const success = await signIn();
        if (success) {
            showNotif?.('Signed in successfully', 'success');
            router.push('/admin');
        }
    };

    if (!isConnected) {
        return null;
    }

    return (
        <Button
            onClick={handleAdminAccess}
            variant="warning"
            className="text-sm"
            disabled={isAuthenticating}
        >
            {isAuthenticating ? 'Signing...' : isAuthenticated ? 'Admin Panel' : 'Admin Sign In'}
        </Button>
    );
};

export default AdminAuthButton;
