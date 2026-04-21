import React, { useState, useEffect } from 'react';
import { X, Key, ShieldCheck, ExternalLink, Save, Info, Activity, AlertCircle, Eye, EyeOff, Edit2, Send, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { getAI } from '../services/ai';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [bridgeUrl, setBridgeUrl] = useState('');
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [isKeySaved, setIsKeySaved] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState('');
  const [bridgeStatus, setBridgeStatus] = useState<'idle' | 'checking' | 'online' | 'offline'>('idle');

  // JSON detection
  const isJsonPasted = apiKeyInput.trim().startsWith('{') || apiKeyInput.trim().startsWith('[');

  useEffect(() => {
    if (isOpen) {
      const savedKey = localStorage.getItem('GEMINI_API_KEY');
      const savedBridge = localStorage.getItem('BRIDGE_URL') || '';
      
      setBridgeUrl(savedBridge);
      setBridgeStatus('idle');

      if (savedKey) {
        setApiKeyInput(savedKey);
        setIsKeySaved(true);
      } else {
        setApiKeyInput('');
        setIsKeySaved(false);
      }
      setTestStatus('idle');
      setTestError('');
    }
  }, [isOpen]);

  const handleSaveConfig = () => {
    localStorage.setItem('BRIDGE_URL', bridgeUrl.trim());
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleCheckBridge = async () => {
    if (!bridgeUrl.trim()) return;
    setBridgeStatus('checking');
    try {
      const res = await fetch(`${bridgeUrl.trim()}/status`, { 
        method: 'GET',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) setBridgeStatus('online');
      else setBridgeStatus('offline');
    } catch (e) {
      setBridgeStatus('offline');
    }
  };

  const handleSendKey = async () => {
    if (!apiKeyInput.trim()) return;
    
    setIsLoading(true);
    // Auto-test before saving to ensure a "Working System"
    try {
      const ai = getAI(apiKeyInput.trim());
      await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "hi",
      });
      
      localStorage.setItem('GEMINI_API_KEY', apiKeyInput.trim());
      setIsKeySaved(true);
      setTestStatus('success');
    } catch (err: any) {
      console.error("API Key Test Failed:", err);
      setTestStatus('error');
      setTestError(err?.message || "Invalid API key or network error.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditKey = () => {
    setIsKeySaved(false);
    setTestStatus('idle');
  };

  const handleRemove = () => {
    localStorage.removeItem('GEMINI_API_KEY');
    setApiKeyInput('');
    setIsKeySaved(false);
    setTestStatus('idle');
  };

  const handleTestOnly = async () => {
    if (!apiKeyInput.trim()) return;
    setTestStatus('testing');
    setTestError('');
    
    try {
      const ai = getAI(apiKeyInput.trim());
      await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "hi",
      });
      setTestStatus('success');
    } catch (err: any) {
      setTestStatus('error');
      setTestError(err?.message || "Test failed.");
    }
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
                <div className="p-3 bg-amber-50 rounded-2xl">
                  <Key className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">Tiered Configuration</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">API Management System</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 transition-all rounded-xl hover:bg-slate-50"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              {/* API Configuration Section */}
              <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={18} className="text-amber-500" />
                    <span className="font-bold text-slate-700 text-sm">Priority Settings</span>
                  </div>
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[11px] font-bold text-amber-600 hover:underline flex items-center gap-1 transition-all"
                  >
                    Get Free Key <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Gemini API Key (Standard)</p>
                  
                  {!isKeySaved ? (
                    <div className="relative flex gap-2">
                      <div className="relative flex-1">
                        <input 
                          type={isKeyVisible ? "text" : "password"}
                          placeholder="Paste your API key here..."
                          value={apiKeyInput}
                          onChange={e => {
                            setApiKeyInput(e.target.value);
                            setTestStatus('idle');
                          }}
                          className={cn(
                            "w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-amber-500/40 transition-all font-mono",
                            isJsonPasted && "border-red-200 bg-red-50/30"
                          )}
                        />
                        <button 
                          onClick={() => setIsKeyVisible(!isKeyVisible)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-300 hover:text-slate-500 transition-all"
                        >
                          {isKeyVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <button 
                        onClick={handleSendKey}
                        disabled={!apiKeyInput.trim() || isLoading || isJsonPasted}
                        className="bg-amber-500 text-white p-3.5 rounded-xl hover:bg-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-lg shadow-amber-100 flex items-center justify-center min-w-[52px]"
                      >
                        {isLoading ? (
                          <Activity size={18} className="animate-spin" />
                        ) : (
                          <Send size={18} />
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3.5 shadow-sm">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-2 h-2 rounded-full bg-green-500 shrink-0 animate-pulse" />
                        <span className="text-sm text-slate-600 font-mono truncate">
                          {isKeyVisible ? apiKeyInput : '••••••••••••••••••••••••'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button 
                          onClick={() => setIsKeyVisible(!isKeyVisible)}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                          title={isKeyVisible ? "Hide Key" : "View Key"}
                        >
                          {isKeyVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button 
                          onClick={handleEditKey}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                          title="Edit Key"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  {isJsonPasted && (
                    <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-red-600 font-medium leading-relaxed">
                        JSON detected! Please paste only the API Key string (e.g., AIza...).
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 pt-1">
                    <p className="text-[9px] text-slate-400 leading-tight px-1 font-medium">
                      Your key is stored locally for this session. It enables Live Vision, Voice, and System Control.
                    </p>
                    
                    {!isKeySaved && apiKeyInput.trim() && !isJsonPasted && (
                      <div className="flex items-center gap-2 px-1">
                        <button
                          onClick={handleTestOnly}
                          disabled={testStatus === 'testing'}
                          className={cn(
                            "text-[10px] font-bold px-2 py-1 rounded-md transition-all flex items-center gap-1.5",
                            testStatus === 'success' ? "text-green-600 bg-green-50" :
                            testStatus === 'error' ? "text-red-600 bg-red-50" :
                            "text-slate-500 bg-slate-100 hover:bg-slate-200"
                          )}
                        >
                          {testStatus === 'testing' ? <Activity size={10} className="animate-spin" /> : <Activity size={10} />}
                          {testStatus === 'success' ? "Working Smoothly" : testStatus === 'error' ? "Test Failed" : "Verify Connectivity"}
                        </button>
                        {testStatus === 'error' && (
                          <span className="text-[9px] text-red-400 font-medium truncate flex-1">
                             {testError}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bridge Configuration Section */}
              <div className="p-5 rounded-2xl border border-indigo-100 bg-indigo-50/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Activity size={18} className="text-indigo-500" />
                    <span className="font-bold text-slate-700 text-sm">PC Bridge Control</span>
                  </div>
                  <div className={cn(
                    "px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider flex items-center gap-1",
                    bridgeStatus === 'online' ? "bg-green-100 text-green-600" :
                    bridgeStatus === 'offline' ? "bg-red-100 text-red-600" :
                    "bg-slate-100 text-slate-400"
                  )}>
                    <div className={cn("w-1.5 h-1.5 rounded-full", 
                      bridgeStatus === 'online' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" :
                      bridgeStatus === 'offline' ? "bg-red-500" :
                      "bg-slate-400"
                    )} />
                    {bridgeStatus === 'online' ? "Online" : bridgeStatus === 'offline' ? "Offline" : "Idle"}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Bridge URL (ngrok link)</p>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="https://your-bridge.ngrok-free.app"
                      value={bridgeUrl}
                      onChange={e => {
                        setBridgeUrl(e.target.value);
                        setBridgeStatus('idle');
                      }}
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-indigo-500/40 transition-all font-mono"
                    />
                    <button 
                      onClick={handleSaveConfig}
                      className={cn(
                        "bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100",
                        isSaved && "bg-green-600"
                      )}
                    >
                      {isSaved ? <ShieldCheck size={18} /> : <Save size={18} />}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between px-1">
                    <button
                      onClick={handleCheckBridge}
                      disabled={bridgeStatus === 'checking' || !bridgeUrl.trim()}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 transition-all flex items-center gap-1.5"
                    >
                      {bridgeStatus === 'checking' ? <Activity size={10} className="animate-spin" /> : <Activity size={10} />}
                      Check Connection
                    </button>
                    <p className="text-[9px] text-slate-400 font-medium italic">
                      Use the link provided by your Python Bridge.
                    </p>
                  </div>
                </div>
              </div>

              {/* Technical breakdown info */}
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-start gap-3">
                <Info className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-indigo-900">Tiered Logic Active</p>
                  <p className="text-[10px] text-indigo-700 leading-relaxed font-medium">
                    Priority 1: User's Manual Key (Priority)<br/>
                    Priority 2: System Environment Variable (Fallback)
                  </p>
                </div>
              </div>

              {isKeySaved && (
                <button
                  onClick={handleRemove}
                  className="w-full py-3 text-red-500 font-bold text-xs hover:bg-red-50 transition-all rounded-xl border border-transparent hover:border-red-100"
                >
                  Reset Configuration & Remove Key
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
