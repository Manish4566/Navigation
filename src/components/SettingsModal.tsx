import React, { useState, useEffect } from 'react';
import { X, Key, ShieldCheck, ExternalLink, Save, Info, Activity, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { getAI } from '../services/ai';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState('');

  // JSON detection
  const isJsonPasted = apiKey.trim().startsWith('{') || apiKey.trim().startsWith('[');

  useEffect(() => {
    if (isOpen) {
      const savedKey = localStorage.getItem('GEMINI_API_KEY') || '';
      setApiKey(savedKey);
      setIsSaved(false);
      setTestStatus('idle');
      setTestError('');
    }
  }, [isOpen]);

  const handleTest = async () => {
    if (!apiKey.trim()) return;
    setTestStatus('testing');
    setTestError('');
    
    try {
      const ai = getAI(apiKey.trim());
      await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "hi",
      });
      setTestStatus('success');
    } catch (err: any) {
      console.error("API Key Test Failed:", err);
      setTestStatus('error');
      setTestError(err?.message || "Invalid API key or network error.");
    }
  };

  const handleSave = () => {
    setIsLoading(true);
    setTimeout(() => {
      localStorage.setItem('GEMINI_API_KEY', apiKey.trim());
      setIsLoading(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    }, 500);
  };

  const handleRemove = () => {
    localStorage.removeItem('GEMINI_API_KEY');
    setApiKey('');
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-100"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-8 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 rounded-2xl">
                  <Key className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">API Settings</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 transition-all rounded-xl hover:bg-slate-50"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-8">
              {/* API Key Input */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
                    Gemini API Key
                  </label>
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-all"
                  >
                    Get Key <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                
                <div className="relative group">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setTestStatus('idle');
                    }}
                    placeholder="Enter your API key here..."
                    className={cn(
                      "w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-5 text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all font-mono text-sm",
                      isSaved && "border-green-200 bg-green-50/30",
                      isJsonPasted && "border-amber-200 bg-amber-50/30"
                    )}
                  />
                  {apiKey && !isJsonPasted && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                       <ShieldCheck className={cn("w-4 h-4 transition-all", apiKey.length > 20 ? "text-green-500" : "text-slate-300")} />
                    </div>
                  )}
                </div>

                {isJsonPasted && (
                  <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100 animate-in shake duration-500">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-600 mb-1">JSON format detected!</p>
                      <p className="text-[11px] text-amber-500 leading-relaxed font-medium">
                        It looks like you pasted a <span className="font-bold">Service Account Key (JSON)</span>. 
                        The website needs a <span className="font-bold">Gemini API Key string</span> (which starts with AIza...). 
                        Please copy the string from Google AI Studio instead.
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                   <button
                     onClick={handleTest}
                     disabled={!apiKey.trim() || testStatus === 'testing' || isJsonPasted}
                     className={cn(
                       "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95",
                       testStatus === 'success' ? "bg-green-50 text-green-600 border border-green-100" :
                       testStatus === 'error' ? "bg-red-50 text-red-600 border border-red-100" :
                       "bg-slate-50 text-slate-600 hover:bg-slate-100 shadow-sm"
                     )}
                   >
                     {testStatus === 'testing' ? <Activity className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
                     {testStatus === 'success' ? "Working!" : testStatus === 'error' ? "Test Failed" : "Test Key"}
                   </button>
                   {testStatus === 'error' && (
                     <p className="text-[10px] text-red-400 font-medium truncate flex-1">
                       {testError}
                     </p>
                   )}
                </div>
                
                <div className="flex items-start gap-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                    Your API key is stored locally in your browser. It is never sent to our servers. Creating a key is free at <span className="font-bold">Google AI Studio</span>.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={handleSave}
                  disabled={isLoading || !apiKey.trim()}
                  className="flex-1 bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : isSaved ? (
                    <>Saved Successfully!</>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save API Key
                    </>
                  )}
                </button>
                
                {localStorage.getItem('GEMINI_API_KEY') && (
                  <button
                    onClick={handleRemove}
                    className="px-6 py-4 border border-slate-100 text-red-500 font-bold text-sm rounded-2xl hover:bg-red-50 transition-all hover:border-red-100"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
