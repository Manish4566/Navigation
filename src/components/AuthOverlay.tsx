import React from 'react';
import { LogIn, Mic, Shield } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthOverlayProps {
  onSignIn: () => void;
  isLoading: boolean;
}

export const AuthOverlay: React.FC<AuthOverlayProps> = ({ onSignIn, isLoading }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-[#050505] flex items-center justify-center p-6 overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white rounded-full blur-[160px] opacity-[0.03] animate-pulse" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md bg-[#0d0d0d] rounded-[40px] border border-white/5 p-12 md:p-16 shadow-2xl text-center"
      >
        <div className="mb-12">
          <h1 className="text-5xl font-serif italic text-white mb-3 tracking-wider">शून्य AI</h1>
          <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-bold">Sophisticated intelligence</p>
        </div>
        
        <p className="text-white/60 mb-12 leading-relaxed italic font-serif text-lg">
          आपका व्यक्तिगत और स्मार्ट असिस्टेंट। <br/>
          आगे बढ़ने के लिए साइन इन करें।
        </p>
        
        <button
          onClick={onSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-5 rounded-2xl hover:bg-neutral-200 transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
          ) : (
            <>
              <LogIn className="w-5 h-5" />
              <span className="uppercase tracking-widest text-xs">Google के साथ प्रवेश करें</span>
            </>
          )}
        </button>
        
        <div className="mt-14 flex items-center justify-center gap-8 opacity-20">
          <div className="flex flex-col items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="text-[8px] font-bold uppercase tracking-widest">Secure</span>
          </div>
          <div className="h-6 w-px bg-white/20" />
          <div className="flex flex-col items-center gap-2">
            <BotIcon />
            <span className="text-[8px] font-bold uppercase tracking-widest">Memory</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const BotIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
);
