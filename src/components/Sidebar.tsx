import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, LogOut, ChevronsLeft, Shield, CheckCircle2, Settings, HelpCircle, ArrowUpCircle, Files, User, MessageSquare, Bot } from 'lucide-react';
import { ChatSession } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

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
  displayName
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          <AnimatePresence>
            {showProfileMenu && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                ref={menuRef}
                className="absolute bottom-full left-0 mb-4 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl p-2 z-[60] overflow-hidden"
              >
                <div className="space-y-1">
                  <button 
                    onClick={() => {
                      onOpenSettings();
                      setShowProfileMenu(false);
                    }}
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
                </div>
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
