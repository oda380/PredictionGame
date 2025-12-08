// src/components/ui/Notification.tsx
import React, { useEffect, useState } from 'react';

interface NotificationProps {
    message: string;
    type: 'success' | 'error' | 'info' | 'warning' | string;
    onDismiss?: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, type, onDismiss }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    useEffect(() => {
        if (message) {
            setIsVisible(true);
            setIsLeaving(false);
        }
    }, [message]);

    const handleDismiss = () => {
        setIsLeaving(true);
        setTimeout(() => {
            setIsVisible(false);
            onDismiss?.();
        }, 300);
    };

    if (!message || !isVisible) return null;

    const configs = {
        success: {
            bg: 'bg-white dark:bg-emerald-950/95 border-emerald-500/40',
            text: 'text-emerald-700 dark:text-emerald-400',
            icon: '✓',
            iconBg: 'bg-emerald-100 dark:bg-emerald-500/20',
            glow: 'shadow-[0_0_30px_rgba(16,185,129,0.15)] dark:shadow-[0_0_30px_rgba(16,185,129,0.15)]'
        },
        error: {
            bg: 'bg-white dark:bg-red-950/95 border-red-500/40',
            text: 'text-red-700 dark:text-red-400',
            icon: '✕',
            iconBg: 'bg-red-100 dark:bg-red-500/20',
            glow: 'shadow-[0_0_30px_rgba(239,68,68,0.15)] dark:shadow-[0_0_30px_rgba(239,68,68,0.15)]'
        },
        warning: {
            bg: 'bg-white dark:bg-amber-950/95 border-amber-500/40',
            text: 'text-amber-700 dark:text-amber-400',
            icon: '⚠',
            iconBg: 'bg-amber-100 dark:bg-amber-500/20',
            glow: 'shadow-[0_0_30px_rgba(245,158,11,0.15)] dark:shadow-[0_0_30px_rgba(245,158,11,0.15)]'
        },
        info: {
            bg: 'bg-white dark:bg-cyan-950/95 border-cyan-500/40',
            text: 'text-cyan-700 dark:text-cyan-400',
            icon: 'ℹ',
            iconBg: 'bg-cyan-100 dark:bg-cyan-500/20',
            glow: 'shadow-[0_0_30px_rgba(34,211,238,0.15)] dark:shadow-[0_0_30px_rgba(34,211,238,0.15)]'
        }
    };

    const config = configs[type as keyof typeof configs] || configs.info;

    return (
        <div
            className={`
                fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50
                transition-all duration-300 ease-out
                ${isLeaving ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'}
            `}
        >
            <div className={`
                ${config.bg} ${config.glow}
                backdrop-blur-xl border rounded-2xl 
                px-4 py-3 sm:px-5 sm:py-4
                flex items-center gap-3 
                max-w-sm sm:max-w-md
                mx-auto sm:mx-0
            `}>
                {/* Icon */}
                <div className={`${config.iconBg} w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <span className={`${config.text} text-sm font-bold`}>{config.icon}</span>
                </div>

                {/* Message */}
                <span className={`${config.text} font-medium text-sm flex-1`}>{message}</span>

                {/* Dismiss Button */}
                <button
                    onClick={handleDismiss}
                    className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all flex-shrink-0"
                    aria-label="Dismiss"
                >
                    <span className="text-xs">✕</span>
                </button>
            </div>
        </div>
    );
};

export default Notification;
