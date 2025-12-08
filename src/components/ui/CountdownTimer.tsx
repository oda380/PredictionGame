// src/components/ui/CountdownTimer.tsx
import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
    targetTimestamp: number; // Unix timestamp in seconds
    onExpire?: () => void;
    className?: string;
    size?: 'sm' | 'lg';
    label?: string;
}

interface TimeLeft {
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
}

const CountdownTimer: React.FC<CountdownTimerProps> = (props) => {
    const { targetTimestamp, onExpire, className = '' } = props;
    const [timeLeft, setTimeLeft] = useState<TimeLeft>({ hours: 0, minutes: 0, seconds: 0, total: 0 });
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = Math.floor(Date.now() / 1000);
            const difference = targetTimestamp - now;

            if (difference <= 0) {
                setIsExpired(true);
                setTimeLeft({ hours: 0, minutes: 0, seconds: 0, total: 0 });
                onExpire?.();
                return;
            }

            const hours = Math.floor(difference / 3600);
            const minutes = Math.floor((difference % 3600) / 60);
            const seconds = difference % 60;

            setTimeLeft({ hours, minutes, seconds, total: difference });
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timer);
    }, [targetTimestamp, onExpire]);

    if (isExpired) {
        return (
            <div className={`text-red-400 font-bold ${className}`}>
                Deadline Passed
            </div>
        );
    }

    const formatNumber = (n: number) => n.toString().padStart(2, '0');

    // Urgency colors based on time left
    const getUrgencyColor = () => {
        if (timeLeft.total < 300) return 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]'; // < 5 min
        if (timeLeft.total < 1800) return 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]'; // < 30 min
        return 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]';
    };

    if (props.size === 'lg') {
        return (
            <div className={`flex flex-col items-center ${className}`}>
                {props.label && (
                    <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-slate-400 mb-2 font-medium animate-pulse">
                        {props.label}
                    </span>
                )}
                <div className={`flex items-baseline gap-1 sm:gap-2 font-mono text-3xl sm:text-4xl font-bold tracking-tighter ${getUrgencyColor()}`}>
                    <div className="flex flex-col items-center">
                        <span className="bg-slate-100 dark:bg-slate-900/50 rounded-lg px-2 sm:px-3 py-1 border border-slate-200 dark:border-slate-800/50 backdrop-blur-sm">
                            {formatNumber(timeLeft.hours)}
                        </span>
                        <span className="text-[8px] sm:text-[10px] text-slate-500 dark:text-slate-600 font-sans tracking-wider mt-1 font-normal">HRS</span>
                    </div>
                    <span className="text-slate-400 dark:text-slate-600/50 text-2xl -translate-y-4">:</span>
                    <div className="flex flex-col items-center">
                        <span className="bg-slate-100 dark:bg-slate-900/50 rounded-lg px-2 sm:px-3 py-1 border border-slate-200 dark:border-slate-800/50 backdrop-blur-sm">
                            {formatNumber(timeLeft.minutes)}
                        </span>
                        <span className="text-[8px] sm:text-[10px] text-slate-500 dark:text-slate-600 font-sans tracking-wider mt-1 font-normal">MIN</span>
                    </div>
                    <span className="text-slate-400 dark:text-slate-600/50 text-2xl -translate-y-4">:</span>
                    <div className="flex flex-col items-center">
                        <span className="bg-slate-100 dark:bg-slate-900/50 rounded-lg px-2 sm:px-3 py-1 border border-slate-200 dark:border-slate-800/50 backdrop-blur-sm min-w-[2ch]">
                            {formatNumber(timeLeft.seconds)}
                        </span>
                        <span className="text-[8px] sm:text-[10px] text-slate-500 dark:text-slate-600 font-sans tracking-wider mt-1 font-normal">SEC</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-1 font-mono ${getUrgencyColor().split(' ')[0]} ${className}`}>
            <span className="text-xs text-slate-500 mr-1">⏱</span>
            <div className="flex gap-0.5">
                <span className="bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded text-sm font-bold border border-slate-200 dark:border-slate-700/50">
                    {formatNumber(timeLeft.hours)}
                </span>
                <span className="text-slate-400 dark:text-slate-500">:</span>
                <span className="bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded text-sm font-bold border border-slate-200 dark:border-slate-700/50">
                    {formatNumber(timeLeft.minutes)}
                </span>
                <span className="text-slate-400 dark:text-slate-500">:</span>
                <span className="bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded text-sm font-bold border border-slate-200 dark:border-slate-700/50">
                    {formatNumber(timeLeft.seconds)}
                </span>
            </div>
        </div>
    );
};

export default CountdownTimer;
