'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import Button from './Button';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    // Prevent hydration mismatch
    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <Button variant="glass" size="sm" className="w-10 h-10 px-0">
                <span className="w-5 h-5" />
            </Button>
        );
    }

    return (
        <Button
            variant="glass"
            size="sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-10 h-10 px-0 rounded-full border-slate-700/50 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-white bg-white/50 dark:bg-white/5 backdrop-blur-md"
            title="Toggle Theme"
        >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 absolute" />
            <Moon className="h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 absolute" />
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}
