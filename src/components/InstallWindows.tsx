import React, { useEffect, useState } from 'react';
import { MonitorDown, X, Info } from 'lucide-react';

export default function InstallWindows() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [guidanceMessage, setGuidanceMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
          setToastMessage('بەرنامەکە بەسەرکەوتوویی دابەزێنرا!');
          setGuidanceMessage(null);
        } else {
          setToastMessage('داواکاری دابەزاندن رەتکرایەوە.');
          setGuidanceMessage(null);
        }
      } catch (err) {
        console.error('PWA install prompt error:', err);
        setToastMessage('بەرنامەکە پێشتر دابەزێنراوە یان وەک بەرنامەی سەربەخۆی Windows کاردەکات!');
        setGuidanceMessage('تکایە لە مێنیوی سەرەوەی Chrome / Edge \'Install Application\' دیاری بکە');
      }
    } else if (isStandalone) {
      setToastMessage('بەرنامەکە پێشتر دابەزێنراوە یان وەک بەرنامەی سەربەخۆی Windows کاردەکات!');
      setGuidanceMessage(null);
    } else {
      setToastMessage('بەرنامەکە پێشتر دابەزێنراوە یان وەک بەرنامەی سەربەخۆی Windows کاردەکات!');
      setGuidanceMessage('تکایە لە مێنیوی سەرەوەی Chrome / Edge \'Install Application\' دیاری بکە');
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 md:px-6 rounded-full flex items-center gap-2 transition-colors shadow-lg active:scale-95 text-sm md:text-base shrink-0"
      >
        <MonitorDown className="w-4 h-4 md:w-5 md:h-5" />
        <span className="hidden sm:inline">داگرتن بۆ windows</span>
        <span className="sm:hidden">Windows</span>
      </button>

      {toastMessage && (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md z-50 bg-slate-900 text-white p-4 rounded-xl shadow-2xl flex flex-col gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
              <Info className="w-5 h-5 shrink-0" />
              <span>دابەزاندنی Windows</span>
            </div>
            <button 
              onClick={() => { setToastMessage(null); setGuidanceMessage(null); }}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-slate-200 font-medium leading-relaxed">
            {toastMessage}
          </p>
          {guidanceMessage && (
            <p className="text-xs text-indigo-300 bg-indigo-950/60 p-2.5 rounded-lg border border-indigo-800/50 mt-1">
              {guidanceMessage}
            </p>
          )}
        </div>
      )}
    </>
  );
}

