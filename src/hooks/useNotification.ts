// src/hooks/useNotification.ts
// Centralized notification state management

import { useState, useCallback } from 'react';

export interface NotificationState {
    message: string;
    type: 'success' | 'error' | 'info' | 'warning' | '';
}

export function useNotification(duration = 5000) {
    const [notification, setNotification] = useState<NotificationState>({ message: '', type: '' });

    const showNotif = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification({ message: '', type: '' }), duration);
    }, [duration]);

    const clearNotification = useCallback(() => {
        setNotification({ message: '', type: '' });
    }, []);

    return { notification, showNotif, clearNotification };
}
