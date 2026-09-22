import { memo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const InstallModal = memo(function InstallModal({ isOpen, onClose }) {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);
    const appUrl = 'https://fuelfinder-msn8.onrender.com/';
    const qrCodeUrl = '/assets/img/qr-code.svg';

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(appUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    }, [appUrl]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
        >
            {/* Backdrop click target */}
            <button 
                type="button"
                className="absolute inset-0 w-full h-full bg-transparent border-0 cursor-default focus:outline-none"
                onClick={onClose}
                aria-label={t('btn_close')}
            />

            <dialog 
                open
                onKeyDown={handleKeyDown}
                aria-labelledby="install-modal-title"
                className="relative z-10 w-full max-w-md p-6 m-0 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden text-left"
            >
                {/* Header Decoration */}
                <div className="absolute top-0 -right-4 h-24 w-40 flex skew-x-[-40deg] origin-bottom-right pointer-events-none opacity-30 dark:opacity-20 z-0">
                    <div className="flex-1 bg-linear-to-br from-[#009246] to-[#005e2d]"></div>
                    <div className="flex-1 bg-linear-to-br from-white to-slate-200 dark:from-slate-300 dark:to-slate-500"></div>
                    <div className="flex-1 bg-linear-to-br from-[#ce2b37] to-[#911f27]"></div>
                </div>

                {/* Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 z-30 w-10 h-10 flex items-center justify-center rounded-full bg-slate-100/90 dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/60 dark:hover:text-rose-400 transition-all active:scale-95 focus:outline-none cursor-pointer border border-slate-200/60 dark:border-slate-600/60 shadow-sm"
                    aria-label={t('btn_close')}
                >
                    <svg className="w-5 h-5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="relative z-10 flex flex-col items-center text-center">
                    <h2 id="install-modal-title" className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white mb-1">
                        {t('install_modal_title')}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-4 max-w-xs">
                        {t('install_modal_subtitle')}
                    </p>

                    {/* QR Code Container */}
                    <div className="p-3 bg-white rounded-2xl shadow-md border-2 border-blue-500/20 mb-4 inline-block">
                        <img 
                            src={qrCodeUrl} 
                            alt="QR Code FuelFinder" 
                            width="200" 
                            height="200" 
                            className="rounded-xl w-44 h-44 sm:w-48 sm:h-48 object-contain"
                            loading="eager"
                        />
                    </div>

                    {/* Instructions Cards */}
                    <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 text-left mb-4">
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200/80 dark:border-slate-600/50">
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block mb-1">
                                {t('install_ios_title')}
                            </span>
                            <span className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight block">
                                {t('install_ios_step')}
                            </span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200/80 dark:border-slate-600/50">
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block mb-1">
                                {t('install_android_title')}
                            </span>
                            <span className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight block">
                                {t('install_android_step')}
                            </span>
                        </div>
                    </div>

                    {/* Copy Link Button */}
                    <button
                        onClick={handleCopy}
                        className="w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none"
                    >
                        {copied ? (
                            <span>{t('install_link_copied')}</span>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <span>{t('install_copy_link')}</span>
                            </>
                        )}
                    </button>
                </div>
            </dialog>
        </div>
    );
});

export default InstallModal;
