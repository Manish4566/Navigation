import React, { useState, useEffect } from 'react';
import { Download, Monitor, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const InstallPWA: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Automatically show our custom UI if not installed
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if the app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
       setIsVisible(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (!isVisible && !deferredPrompt) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md"
        >
          <div className="bg-white/90 backdrop-blur-xl border border-indigo-100 shadow-2xl rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <Monitor className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-800">Install VocalAI</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Use it as a Desktop App</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 active:scale-95 shadow-md"
              >
                <Download className="w-3 h-3" />
                Install
              </button>
              <button
                onClick={() => setIsVisible(false)}
                className="p-2 text-slate-300 hover:text-slate-600 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
