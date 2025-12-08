// src/components/ui/Button.tsx
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'glass' | 'success';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
    children,
    className = "",
    variant = 'primary',
    size = 'md',
    isLoading = false,
    disabled,
    ...props
}) => {
    const baseStyles = "relative font-heading font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center overflow-hidden group rounded-xl";

    const sizeStyles = {
        sm: "px-3 py-1.5 text-sm",
        md: "px-5 py-2.5 text-base",
        lg: "px-6 py-3 text-lg"
    };

    // Premium gradient variations with glows
    const variants = {
        primary: "bg-[image:var(--grad-btn-primary)] text-white hover:shadow-[var(--shadow-glow-cyan)] hover:scale-[1.02] border border-white/10 active:scale-[0.98]",
        secondary: "bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-600/50 text-slate-700 dark:text-slate-200 hover:text-cyan-600 dark:hover:text-white hover:border-cyan-500/30 hover:shadow-[0_0_20px_rgba(34,211,238,0.15)]",
        success: "bg-[image:var(--grad-btn-success)] text-white hover:shadow-[var(--shadow-glow-emerald)] border border-white/10",
        danger: "bg-[image:var(--grad-btn-danger)] text-white hover:shadow-[var(--shadow-glow-rose)] border border-white/10",
        warning: "bg-[image:var(--grad-btn-warning)] text-white hover:shadow-[var(--shadow-glow-amber)] border border-white/10",
        glass: "bg-slate-900/5 dark:bg-white/5 hover:bg-slate-900/10 dark:hover:bg-white/10 border border-slate-900/10 dark:border-white/10 backdrop-blur-sm text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:border-slate-900/20 dark:hover:border-white/20"
    };

    return (
        <button
            className={`${baseStyles} ${sizeStyles[size]} ${variants[variant]} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {/* Shimmer effect on hover */}
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>

            {isLoading ? (
                <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Processing...</span>
                </>
            ) : children}
        </button>
    );
};

export default Button;
