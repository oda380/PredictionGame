// src/components/ui/Input.tsx
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    hint?: string;
    error?: string;
}

const Input: React.FC<InputProps> = ({ label, hint, error, id, className = "", ...props }) => {
    return (
        <div className="mb-4">
            <label
                htmlFor={id}
                className="block text-xs font-heading font-semibold text-slate-600 dark:text-slate-400 mb-2 tracking-widest uppercase"
            >
                {label}
            </label>
            <input
                id={id}
                className={`
                    w-full px-4 py-3 rounded-xl
                    bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-600/50
                    text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500
                    font-mono text-sm
                    transition-all duration-300
                    focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20
                    focus:shadow-[0_0_20px_rgba(34,211,238,0.15)]
                    hover:border-cyan-500/30 dark:hover:border-slate-500/50
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800/50
                    ${error ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : ''}
                    ${className}
                `}
                {...props}
            />
            {hint && !error && (
                <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
            )}
            {error && (
                <p className="mt-1.5 text-xs text-red-400">{error}</p>
            )}
        </div>
    );
};

export default Input;
