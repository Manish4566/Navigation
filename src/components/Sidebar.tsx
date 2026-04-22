import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, LogOut, ChevronsLeft, Shield, CheckCircle2, Settings, HelpCircle, ArrowUpCircle, Files, User, MessageSquare, Bot } from 'lucide-react';
import { ChatSession, LiveConfig } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Key, Eye, EyeOff, Edit2, Send, Check } from 'lucide-react';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (e: React.MouseEvent, id: string) => void;
  onSignOut: () => void;
  onOpenSettings: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  displayName: string;
  config: LiveConfig;
  setConfig: React.Dispatch<React.SetStateAction<LiveConfig>>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onSignOut,
  onOpenSettings,
  isOpen,
  setIsOpen,
  displayName,
  config,
  setConfig
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [menuView, setMenuView] = useState<'profile' | 'settings'>('profile');
  const [showHistory, setShowHistory] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [isKeySaved, setIsKeySaved] = useState(!!config.customApiKey);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
        setMenuView('profile'); // Reset to profile view when closing
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSendKey = () => {
    if (apiKeyInput.trim()) {
      setConfig(prev => ({ ...prev, customApiKey: apiKeyInput.trim() }));
      setApiKeyInput('');
      setIsKeySaved(true);
    }
  };

  const handleEditKey = () => {
    setApiKeyInput(config.customApiKey || '');
    setIsKeySaved(false);
  };

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-100 transition-all duration-300 transform md:relative md:translate-x-0 overflow-hidden",
      !isOpen && "-translate-x-full md:w-0 md:border-none"
    )}>
      <div className="flex flex-col h-full p-6 min-w-[288px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-10 px-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Navigation
            </h1>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors md:flex hidden"
          >
            <ChevronsLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 mb-8">
          <button
            className="flex items-center gap-3 w-full p-4 rounded-[16px] bg-indigo-50/50 border border-indigo-100 hover:bg-indigo-100 text-sm text-indigo-600 transition-all font-bold group"
          >
            <Bot className="w-4 h-4 text-indigo-400" />
            <span>Agent</span>
          </button>

          <button
            onClick={onNewChat}
            className="flex items-center gap-3 w-full p-4 rounded-[16px] bg-slate-50 border border-slate-100 hover:bg-slate-100 text-sm text-slate-600 transition-all font-bold group"
          >
            <Plus className="w-4 h-4 text-slate-400" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto space-y-8 custom-scrollbar">
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-1">
                  {sessions.length > 0 && sessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => onSelectSession(session.id)}
                      className={cn(
                        "group relative flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all",
                        currentSessionId === session.id 
                          ? "bg-indigo-50/50 text-indigo-600" 
                          : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                      )}
                    >
                      <span className="text-sm font-medium truncate pr-4">
                        {session.title || "Untitled Chat"}
                      </span>
                      <button
                        onClick={(e) => onDeleteSession(e, session.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-50 relative">
          {/* Bridge Status Indicator */}
          <div className="mb-4 px-2">
            <div className={cn(
              "flex items-center gap-2 p-3 rounded-xl border transition-all",
              localStorage.getItem('BRIDGE_URL') ? "bg-emerald-50/50 border-emerald-100" : "bg-slate-50/50 border-slate-100"
            )}>
              <div className={cn(
                "w-2 h-2 rounded-full",
                localStorage.getItem('BRIDGE_URL') ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
              )} />
              <div className="flex-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PC Connection</p>
                <p className="text-xs font-bold text-slate-600 truncate">
                  {localStorage.getItem('BRIDGE_URL')?.replace(/https?:\/\//, '') || "Not Connected"}
                </p>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {showProfileMenu && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                ref={menuRef}
                className="absolute bottom-full left-0 mb-4 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl p-2 z-[60] overflow-hidden"
              >
                {menuView === 'profile' ? (
                  <motion.div 
                    key="profile"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    className="space-y-1"
                  >
                    <button 
                      onClick={() => setMenuView('settings')}
                      className="flex items-center gap-3 w-full p-3 hover:bg-slate-50 rounded-xl transition-all text-slate-600 text-sm font-semibold"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>Settings</span>
                    </button>
                    <button className="flex items-center gap-3 w-full p-3 hover:bg-slate-50 rounded-xl transition-all text-slate-600 text-sm font-semibold">
                      <HelpCircle className="w-4 h-4 text-slate-400" />
                      <span>Help</span>
                    </button>
                    <button className="flex items-center gap-3 w-full p-3 hover:bg-slate-50 rounded-xl transition-all font-bold text-indigo-600 bg-indigo-50 rounded-xl">
                      <ArrowUpCircle className="w-4 h-4" />
                      <span>Upgrade</span>
                    </button>
                    <button className="flex items-center gap-3 w-full p-3 hover:bg-slate-50 rounded-xl transition-all text-slate-600 text-sm font-semibold">
                      <Files className="w-4 h-4 text-slate-400" />
                      <span>Files</span>
                    </button>
                    <div className="h-px bg-slate-50 my-1" />
                    <button 
                      onClick={onSignOut}
                      className="flex items-center gap-3 w-full p-3 hover:bg-red-50 rounded-xl transition-all text-red-500 text-sm font-semibold"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="settings"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 20, opacity: 0 }}
                    className="p-3 space-y-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                       <button 
                        onClick={() => setMenuView('profile')}
                        className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                       >
                         Back
                       </button>
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Wardenix Settings</span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Key size={14} className="text-amber-500" />
                        <span className="text-xs font-bold text-slate-700">Gemini API Key</span>
                      </div>
                      
                      {!isKeySaved ? (
                        <div className="relative flex gap-2">
                          <input 
                            type={isKeyVisible ? "text" : "password"}
                            placeholder="Paste API key..."
                            value={apiKeyInput}
                            onChange={e => setApiKeyInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSendKey()}
                            className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-amber-500/40 transition-all font-mono"
                          />
                          <button 
                            onClick={handleSendKey}
                            disabled={!apiKeyInput.trim()}
                            className="bg-amber-500 text-white p-2 rounded-xl hover:bg-amber-600 transition-all disabled:opacity-50 active:scale-95 shrink-0"
                          >
                            <Send size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 animate-pulse" />
                            <span className="text-xs text-slate-500 font-mono truncate">
                              {isKeyVisible ? config.customApiKey : '••••••••••••'}
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0 ml-1">
                            <button 
                              onClick={() => setIsKeyVisible(!isKeyVisible)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-all"
                            >
                              {isKeyVisible ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                            <button 
                              onClick={handleEditKey}
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-all"
                            >
                              <Edit2 size={12} />
                            </button>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 shadow-sm">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Model</span>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                            <div className="w-1.5 min-w-[6px] h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-tight">
                              {config.model === 'models/gemini-1.5-pro' ? 'Gemini 1.5 Pro' : config.model.replace('models/', '').toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isKeySaved && (
                        <button
                          onClick={async () => {
                            try {
                              const { GoogleGenAI } = await import('@google/genai');
                              // CRITICAL: Linter expects object format in this environment
                              const testAI = new GoogleGenAI({ apiKey: config.customApiKey! });
                              
                              // First attempt: Gemini 3.1 Pro (Recommended Pro Model)
                              try {
                                const result = await testAI.models.generateContent({ 
                                  model: "gemini-3.1-pro-preview",
                                  contents: "hi" 
                                });
                                if (result.text) {
                                  alert("API Connection Successful! Gemini 3.1 Pro is active.");
                                  return;
                                }
                              } catch (proError: any) {
                                console.warn("Pro model test failed, trying Flash fallback:", proError);
                                // Fallback to Flash
                                const flashResult = await testAI.models.generateContent({ 
                                  model: "gemini-3-flash-preview",
                                  contents: "hi" 
                                });
                                if (flashResult.text) {
                                  alert("API Key Valid! Flash model responded, but Pro model returned an error.");
                                  return;
                                }
                                throw proError;
                              }
                            } catch (e: any) {
                              console.error("Test API error:", e);
                              const errorStr = JSON.stringify(e);
                              if (errorStr.includes('apikey') || errorStr.includes('401') || errorStr.includes('403')) {
                                alert("API Connection Failed: Invalid API Key. Please check your key at Google AI Studio.");
                              } else {
                                alert(`API Connection Failed: ${e.message || "Please check your network and API key."}`);
                              }
                            }
                          }}
                          className="w-full py-2 bg-slate-900 text-white rounded-xl text-[10px] font-bold hover:bg-slate-800 transition-all active:scale-95"
                        >
                          Test API Link
                        </button>
                      )}

                      <p className="text-[9px] text-slate-400 leading-tight px-1 italic">
                        Key stored locally. 
                        <a 
                          href="https://aistudio.google.com/app/apikey" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-amber-600 hover:underline ml-1 font-bold"
                        >
                          Get Key
                        </a>
                      </p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 px-2 w-full hover:bg-slate-50 p-3 rounded-2xl transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-bold overflow-hidden shadow-sm">
              <img 
                src={`https://picsum.photos/seed/${displayName}/100/100`} 
                alt="Me" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0 text-left">
               <p className="text-sm font-bold text-slate-800 truncate">{displayName}</p>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">View Profile</p>
            </div>
          </button>
        </div>
      </div>
    </aside>
  );
};
