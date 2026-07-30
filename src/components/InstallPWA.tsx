import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showiOSModal, setShowiOSModal] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstalled(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstalled(true);
      }
    } else {
      setShowiOSModal(true);
    }
  };

  if (isInstalled) return null;

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-2 px-4 md:px-6 rounded-full flex items-center gap-2 transition-colors shadow-lg active:scale-95 text-sm md:text-base shrink-0"
      >
        <Download className="w-4 h-4 md:w-5 md:h-5" />
        <span className="hidden sm:inline">📲 دابەزاندنی بەرنامە</span>
        <span className="sm:hidden">دابەزاندن</span>
      </button>

      {showiOSModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative text-slate-800 border border-slate-100">
            <button
              onClick={() => setShowiOSModal(false)}
              className="absolute top-4 left-4 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold mb-4 text-center">دابەزاندنی بەرنامە</h3>
            <p className="text-center mb-6 leading-relaxed">
              لەسەر مۆبایل یان سەفاری: کرتە بکە لەسەر دوگمەی <b>Share</b> <span className="text-xl inline-block mx-1">⎋</span> لە وێبگەڕەکەت، پاشان <br/><b>Add to Home Screen</b> <span className="text-xl inline-block mx-1">➕</span> هەڵبژێرە.
            </p>
            <button
              onClick={() => setShowiOSModal(false)}
              className="w-full bg-indigo-600 text-white font-medium py-3 rounded-xl hover:bg-indigo-700 shadow-sm transition-colors"
            >
              باشە، تێگەیشتم
            </button>
          </div>
        </div>
      )}
    </>
  );
}
