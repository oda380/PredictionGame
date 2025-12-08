import React from 'react';
import { createPortal } from 'react-dom';

interface HowItWorksModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    // Portal to document.body to ensure it appears above everything
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm animate-fadeIn"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-cyan-500/30 rounded-2xl shadow-2xl dark:shadow-[0_0_50px_rgba(34,211,238,0.15)] overflow-hidden animate-slideUp max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                            <span className="text-xl">📜</span>
                        </div>
                        <h2 className="text-xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400">
                            How It Works
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">

                    {/* Step 1 */}
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-bold font-heading">1</div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Place your prediction</h3>
                            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                Submit a BTC price prediction (usually 2 decimal places, supports up to 4) and pay the entry fee before the round's prediction deadline.
                            </p>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold font-heading">2</div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Wait for round end</h3>
                            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                After the round end time passes, the game enters the resolution phase.
                            </p>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold font-heading">3</div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Oracle verifies price</h3>
                            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-3">
                                The smart contract fetches the official BTC/USD price from <span className="text-blue-600 dark:text-blue-400">Chainlink</span>, a decentralized and trusted price oracle.
                            </p>
                            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600 dark:text-blue-300">
                                ℹ️ If the oracle price is too stale (old), the round pauses until a fresh price is available.
                            </div>
                        </div>
                    </div>

                    {/* Step 4 */}
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold font-heading">4</div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Winners are picked</h3>
                            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-2">
                                The contract calculates the difference between every prediction and the actual price. The <strong>top 5 closest predictions</strong> win!
                            </p>
                            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300">
                                💡 <strong>Tie-breaker:</strong> If two predictions are equally close, the one placed <em>earlier</em> gets priority. Don't wait until the last second!
                            </div>
                        </div>
                    </div>

                    {/* Step 5 */}
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-red-600 dark:text-red-400 font-bold font-heading">5</div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Claim your prize</h3>
                            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                A fixed % of the total pot is shared equally among the winners. If you won, click the <strong>Claim Prize</strong> button in your history to receive your payout instantly.
                            </p>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-medium transition-all duration-300 border border-transparent dark:border-slate-700 dark:hover:border-slate-600 shadow-lg shadow-slate-900/20"
                    >
                        Got it, I'm ready to play!
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default HowItWorksModal;
