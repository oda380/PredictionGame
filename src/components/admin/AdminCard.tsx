// src/components/admin/AdminCard.tsx
// Reusable card wrapper for admin panel sections

import React from 'react';

interface AdminCardProps {
    icon: string;
    title: string;
    subtitle?: string;
    colorScheme?: 'blue' | 'cyan' | 'purple' | 'amber' | 'emerald' | 'red' | 'gray';
    disabled?: boolean;
    children: React.ReactNode;
}

const colorClasses = {
    blue: {
        border: 'border-slate-200 dark:border-blue-500/20',
        shadow: 'dark:shadow-[0_0_20px_rgba(59,130,246,0.1)]',
        hover: 'hover:border-blue-500/40',
        icon: 'bg-blue-500/20',
        title: 'text-blue-600 dark:text-blue-400',
    },
    cyan: {
        border: 'border-slate-200 dark:border-cyan-500/20',
        shadow: 'dark:shadow-[0_0_20px_rgba(34,211,238,0.1)]',
        hover: 'hover:border-cyan-500/40',
        icon: 'bg-cyan-500/20',
        title: 'text-cyan-600 dark:text-cyan-400',
    },
    purple: {
        border: 'border-slate-200 dark:border-purple-500/20',
        shadow: 'dark:shadow-[0_0_20px_rgba(168,85,247,0.1)]',
        hover: 'hover:border-purple-500/40',
        icon: 'bg-purple-500/20',
        title: 'text-purple-600 dark:text-purple-400',
    },
    amber: {
        border: 'border-slate-200 dark:border-amber-500/20',
        shadow: 'dark:shadow-[0_0_20px_rgba(245,158,11,0.1)]',
        hover: 'hover:border-amber-500/40',
        icon: 'bg-amber-500/20',
        title: 'text-amber-600 dark:text-amber-400',
    },
    emerald: {
        border: 'border-slate-200 dark:border-emerald-500/20',
        shadow: 'dark:shadow-[0_0_20px_rgba(16,185,129,0.1)]',
        hover: 'hover:border-emerald-500/40',
        icon: 'bg-emerald-500/20',
        title: 'text-emerald-600 dark:text-emerald-400',
    },
    red: {
        border: 'border-slate-200 dark:border-red-500/20',
        shadow: 'dark:shadow-[0_0_20px_rgba(239,68,68,0.1)]',
        hover: 'hover:border-red-500/40',
        icon: 'bg-red-500/20',
        title: 'text-red-600 dark:text-red-400',
    },
    gray: {
        border: 'border-slate-200 dark:border-slate-700/50',
        shadow: '',
        hover: '',
        icon: 'bg-slate-300/30 dark:bg-slate-700/30',
        title: 'text-slate-500 dark:text-slate-500',
    },
};

const AdminCard: React.FC<AdminCardProps> = ({
    icon,
    title,
    subtitle,
    colorScheme = 'blue',
    disabled = false,
    children,
}) => {
    const colors = disabled ? colorClasses.gray : colorClasses[colorScheme];

    return (
        <div
            className={`p-5 rounded-xl bg-white dark:bg-slate-900/90 border shadow-lg transition-all duration-300 ${colors.border} ${colors.shadow} ${colors.hover} ${disabled ? 'opacity-60' : ''}`}
        >
            <div className="flex items-center gap-2 mb-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.icon}`}>
                    <span className="text-lg">{icon}</span>
                </div>
                <div>
                    <h3 className={`font-heading font-bold ${colors.title}`}>{title}</h3>
                    {subtitle && (
                        <p className={`text-xs ${disabled ? 'text-red-500 dark:text-red-400' : 'text-slate-500'}`}>
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>
            {children}
        </div>
    );
};

export default AdminCard;
