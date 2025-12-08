// src/components/ui/Card.tsx
import React from 'react';

interface CardProps {
    title?: string;
    children: React.ReactNode;
    className?: string;
    titleColor?: string;
    accent?: 'cyan' | 'purple' | 'amber' | 'emerald';
}

const Card: React.FC<CardProps> = ({
    title,
    children,
    className = "",
    titleColor,
    accent = 'cyan'
}) => {
    const accentColors = {
        cyan: 'from-cyan-500/20 to-transparent',
        purple: 'from-purple-500/20 to-transparent',
        amber: 'from-amber-500/20 to-transparent',
        emerald: 'from-emerald-500/20 to-transparent'
    };

    const titleColors = {
        cyan: 'text-cyan-600 dark:text-cyan-400',
        purple: 'text-purple-600 dark:text-purple-400',
        amber: 'text-amber-600 dark:text-amber-400',
        emerald: 'text-emerald-600 dark:text-emerald-400'
    };

    const borderGradients = {
        cyan: 'via-cyan-600/40 dark:via-cyan-500/40',
        purple: 'via-purple-600/40 dark:via-purple-500/40',
        amber: 'via-amber-600/40 dark:via-amber-500/40',
        emerald: 'via-emerald-600/40 dark:via-emerald-500/40'
    };

    return (
        <div className={`glass-panel rounded-2xl p-6 relative overflow-hidden ${className}`}>
            {/* Accent glow orb in corner - Dark Mode Only for subtle clean look in light */}
            <div className={`hidden dark:block absolute -top-24 -right-24 w-48 h-48 bg-gradient-radial ${accentColors[accent]} rounded-full blur-3xl pointer-events-none opacity-60`}></div>

            {/* Subtle top border accent */}
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent ${borderGradients[accent]} to-transparent`}></div>

            {title && (
                <div className="flex items-center justify-between mb-5 border-b border-slate-200 dark:border-slate-700/50 pb-3 relative z-10">
                    <h2 className={`text-lg font-heading font-bold tracking-wide uppercase ${titleColor || titleColors[accent]}`}>
                        {title}
                    </h2>
                </div>
            )}
            <div className="relative z-10 text-slate-600 dark:text-slate-300">
                {children}
            </div>
        </div>
    );
};

export default Card;
