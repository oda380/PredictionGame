// src/components/ui/OnboardingModal.tsx
import React, { useState, useEffect } from 'react';
import Button from './Button';

interface OnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => setIsVisible(true), 10);
        } else {
            setIsVisible(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const steps = [
        {
            icon: '🎯',
            title: 'Welcome to BitForecast',
            description: 'The premium BTC price prediction arena on Base network. Predict Bitcoin prices and compete for rewards!',
        },
        {
            icon: '💰',
            title: 'How to Play',
            description: 'Connect your wallet, enter your BTC price prediction for the round end time, and pay the entry fee to submit.',
        },
        {
            icon: '🏆',
            title: 'Win Prizes',
            description: 'The player with the closest prediction to the actual BTC price wins the prize pool. Claim your rewards instantly!',
        },
    ];

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    return (
        <div
            className={`
                fixed inset-0 z-50 flex items-center justify-center p-4
                transition-all duration-300
                ${isVisible ? 'opacity-100' : 'opacity-0'}
            `}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className={`
                    relative w-full max-w-md
                    bg-white dark:bg-slate-900
                    border border-slate-200 dark:border-slate-700/50
                    rounded-2xl shadow-2xl
                    overflow-hidden
                    transition-all duration-300
                    ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}
                `}
            >
                {/* Gradient accent */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500" />

                {/* Ambient glow - Dark Mode Only */}
                <div className="hidden dark:block absolute -top-20 -right-20 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="hidden dark:block absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Content */}
                <div className="relative p-6 sm:p-8">
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all"
                    >
                        ✕
                    </button>

                    {/* Step Content */}
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 dark:from-cyan-500/20 dark:to-purple-500/20 flex items-center justify-center border border-cyan-500/20 shadow-lg shadow-cyan-500/5">
                            <span className="text-4xl">{steps[currentStep].icon}</span>
                        </div>

                        <h2 className="text-2xl font-heading font-bold text-slate-900 dark:text-white mb-3">
                            {steps[currentStep].title}
                        </h2>

                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            {steps[currentStep].description}
                        </p>
                    </div>

                    {/* Step Indicators */}
                    <div className="flex justify-center gap-2 mb-6">
                        {steps.map((_, index) => (
                            <div
                                key={index}
                                className={`
                                    w-2 h-2 rounded-full transition-all duration-300
                                    ${index === currentStep
                                        ? 'bg-cyan-500 dark:bg-cyan-400 w-6'
                                        : 'bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 cursor-pointer'
                                    }
                                `}
                                onClick={() => setCurrentStep(index)}
                            />
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        {currentStep > 0 && (
                            <Button
                                variant="glass"
                                onClick={handlePrev}
                                className="flex-1"
                            >
                                Back
                            </Button>
                        )}
                        <Button
                            variant="primary"
                            onClick={handleNext}
                            className="flex-1"
                        >
                            {currentStep === steps.length - 1 ? "Let's Go! 🚀" : 'Next'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OnboardingModal;
