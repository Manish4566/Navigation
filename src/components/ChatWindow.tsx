import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Volume2, Bot, Loader2, Mic, Paperclip, ChevronRight, BookOpen, Target, Phone, Copy, Share2, ThumbsUp, Check, AudioLines, Settings2, ChevronDown, Shield } from 'lucide-react';
import { Message } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (text: string, useThinking: boolean, attachments?: File[], fromVoice?: boolean) => Promise<string | null>;
  onSpeak: (text: string) => void;
  isLoading: boolean;
  sessionTitle: string;
  onVoiceInput: (text: string) => void;
  displayName: string;
  isLiveMode: boolean;
  isSpeaking: boolean;
  onToggleLiveMode: (val: boolean) => void;
  selectedVoice: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr' | 'Aoede';
  onVoiceChange: (voice: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr' | 'Aoede') => void;
}

const Waveform = () => (
  <div className="flex gap-1 items-center justify-center p-8">
    {[...Array(12)].map((_, i) => (
      <motion.div
        key={i}
        animate={{
          height: [15, 45, 15],
        }}
        transition={{
          repeat: Infinity,
          duration: 0.8,
          delay: i * 0.05,
          ease: "easeInOut"
        }}
        className="w-1.5 bg-indigo-600 rounded-full"
      />
    ))}
  </div>
);

const Typewriter = ({ text, onComplete }: { text: string, onComplete?: () => void }) => {
  const [displayText, setDisplayText] = useState('');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[index]);
        setIndex(prev => prev + 1);
      }, 15); // Adjust speed as needed
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [index, text, onComplete]);

  return <Markdown>{displayText}</Markdown>;
};

const MessageActions = ({ content, onSpeak }: { content: string, onSpeak: () => void }) => {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          text: content,
        });
      } catch (err) {}
    }
  };

  return (
    <div className="flex items-center gap-1 mt-2">
      <button 
        onClick={handleCopy}
        className="p-2 text-slate-400 hover:text-indigo-600 transition-all rounded-lg hover:bg-slate-100"
        title="Copy"
      >
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
      </button>

      <button 
        onClick={handleShare}
        className="p-2 text-slate-400 hover:text-indigo-600 transition-all rounded-lg hover:bg-slate-100"
        title="Share"
      >
        <Share2 className="w-4 h-4" />
      </button>

      <button 
        onClick={() => setLiked(!liked)}
        className={cn(
          "p-2 transition-all rounded-lg hover:bg-slate-100",
          liked ? "text-indigo-600" : "text-slate-400 hover:text-indigo-600"
        )}
        title="Like"
      >
        <ThumbsUp className={cn("w-4 h-4", liked && "fill-current")} />
      </button>

      <button 
        onClick={onSpeak}
        className="p-2 text-slate-400 hover:text-indigo-600 transition-all rounded-lg hover:bg-slate-100"
        title="Voice"
      >
        <Volume2 className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  onSendMessage,
  onSpeak,
  isLoading,
  sessionTitle,
  onVoiceInput,
  displayName,
  isLiveMode,
  isSpeaking,
  onToggleLiveMode,
  selectedVoice,
  onVoiceChange
}) => {
  const [input, setInput] = useState('');
  const [useThinking, setUseThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const isComponentMounted = useRef(true);
  const isLiveModeRef = useRef(isLiveMode);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    isLiveModeRef.current = isLiveMode;
  }, [isLiveMode]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition && !recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'hi-IN';
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        if (isLiveModeRef.current) {
           onSendMessage(transcript, false, undefined, true);
        } else {
           // Update local input state instead of sending automatically
           setInput(prev => prev + (prev ? ' ' : '') + transcript);
           setIsRecording(false);
           recognition.stop();
        }
      };
      
      recognition.onerror = (e: any) => {
        if (e.error === 'no-speech') return;
        console.error("Speech Error:", e);
        if (!isLiveModeRef.current) setIsRecording(false);
      };

      recognition.onend = () => {
        if (isLiveModeRef.current && isComponentMounted.current) {
          try {
            recognition.start();
          } catch (e) {
            // Already started
          }
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      isComponentMounted.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (isLiveMode) {
      setIsRecording(false);
      try {
        recognitionRef.current?.start();
      } catch (e) {}
    } else {
      recognitionRef.current?.stop();
    }
  }, [isLiveMode]);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      try {
        recognitionRef.current?.start();
      } catch (e) {}
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if ((!trimmed && attachments.length === 0) || isLoading) return;
    onSendMessage(trimmed, useThinking, attachments);
    setInput('');
    setAttachments([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  const voiceAssistants = [
    { id: 'Kore', name: 'Kore', desc: 'The Calm Sage', gender: 'Female', icon: BookOpen, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { id: 'Aoede', name: 'Aoede', desc: 'The Melodic Muse', gender: 'Female', icon: Volume2, color: 'text-fuchsia-500', bg: 'bg-fuchsia-50' },
    { id: 'Zephyr', name: 'Zephyr', desc: 'The Gentle Breeze', gender: 'Female', icon: AudioLines, color: 'text-cyan-500', bg: 'bg-cyan-50' },
    { id: 'Puck', name: 'Puck', desc: 'The Energetic Sprite', gender: 'Male', icon: Sparkles, color: 'text-amber-500', bg: 'bg-amber-50' },
    { id: 'Charon', name: 'Charon', desc: 'The Deep Guardian', gender: 'Male', icon: Shield, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { id: 'Fenrir', name: 'Fenrir', desc: 'The Power Spirit', gender: 'Male', icon: Target, color: 'text-red-500', bg: 'bg-red-50' },
  ] as const;

  const currentAssistant = voiceAssistants.find(a => a.id === selectedVoice) || voiceAssistants[0];

  return (
    <div className="flex flex-col h-full bg-[#fdfaf7] overflow-hidden relative">
      {/* Messages / Hero Section */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar relative"
      >
        {isLiveMode && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#fdfaf7]/95 backdrop-blur-md animate-in fade-in duration-500 overflow-y-auto p-10">
             <div className="flex flex-col items-center gap-8 w-full max-w-lg">
                <div className="flex flex-col items-center gap-4">
                  <AudioLines className={cn("w-12 h-12 text-slate-800", isSpeaking && "animate-pulse text-indigo-600")} />
                  <p className="text-xl font-bold text-slate-400 uppercase tracking-widest">
                    {isSpeaking ? "VocalAI is responding" : "You may start speaking"}
                  </p>
                </div>
                
                {isSpeaking && messages.length > 0 && messages[messages.length - 1].role === 'model' && (
                  <div className="w-full bg-white/50 p-8 rounded-[40px] border border-white shadow-sm text-center animate-in slide-in-from-bottom-4 duration-500">
                    <div className="prose prose-slate max-w-none text-2xl font-medium text-slate-800 leading-relaxed italic">
                      <Typewriter text={messages[messages.length - 1].content} />
                    </div>
                  </div>
                )}
             </div>
          </div>
        )}
        
        <div className="max-w-2xl mx-auto flex flex-col gap-12">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center py-12 md:py-20 space-y-8 animate-in fade-in zoom-in-95 duration-500">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative"
              >
                <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-white shadow-2xl">
                  <img 
                    src={`https://picsum.photos/seed/${displayName}/400/400`} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>
              
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-bold text-slate-800">Hi, I am {displayName}!</h1>
                <p className="text-slate-500 font-medium tracking-wide">Multifaceted Smart Assistant</p>
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <div key={m.id} className="flex flex-col gap-4">
                {m.role === 'user' ? (
                  <div className="flex flex-col items-end gap-2 pr-4 md:pr-0">
                    <div className="p-4 px-6 bg-[#ECE9E4] text-[#4A443F] rounded-[24px] shadow-sm max-w-[85%] text-base font-medium">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-start gap-2 animate-in slide-in-from-left-4 fade-in duration-500">
                    <div className="w-full prose prose-slate max-w-none text-[17px] leading-relaxed text-[#2D2D2D] font-medium selection:bg-indigo-100 markdown-body">
                      {m.id === messages[messages.length - 1].id ? (
                        <Typewriter text={m.content} />
                      ) : (
                        <Markdown>{m.content}</Markdown>
                      )}
                    </div>
                    <MessageActions 
                      content={m.content} 
                      onSpeak={() => onSpeak(m.content)} 
                    />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex flex-col items-start gap-4">
                <div className="flex gap-2 items-center p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/50">
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                  <span className="text-sm font-bold text-indigo-400 uppercase tracking-widest animate-pulse">Thinking...</span>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Input / Footer Area */}
      <footer className="p-6 md:p-10 pt-0 shrink-0 bg-transparent relative z-[60]">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 group">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-pink-500/30 rounded-[32px] md:rounded-[40px] blur-2xl opacity-100 transition-opacity animate-pulse" />
              
              <div className={cn(
                "relative bg-white border transition-all duration-300 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)] backdrop-blur-md",
                "border-indigo-500/60 ring-[8px] ring-indigo-500/10", 
                isLiveMode 
                  ? "rounded-[32px] md:rounded-[40px] py-3 px-4 flex flex-col min-h-[130px]" 
                  : "rounded-[32px] py-1.5 pr-1.5 pl-6 flex items-center min-h-[64px]"
              )}>
                {isLiveMode ? (
                  <div className="flex flex-col h-full w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <form onSubmit={handleSubmit} className="flex-1 px-4 py-2">
                       <input
                         type="text"
                         value={input}
                         onChange={(e) => setInput(e.target.value)}
                         placeholder="Ask anything..."
                         className="w-full bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 text-lg font-medium"
                       />
                    </form>

                    <div className="flex items-center justify-between w-full mt-auto">
                      <div className="flex items-center gap-1">
                        <button className="p-2.5 text-slate-400 hover:text-indigo-600 transition-all rounded-full hover:bg-slate-50">
                          <Paperclip className="w-5 h-5" />
                        </button>
                        
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-full px-4 py-1.5 mx-1">
                          <div className="flex gap-0.5 items-center">
                            {[...Array(4)].map((_, i) => (
                              <motion.div
                                key={i}
                                animate={{ height: [4, 12, 4] }}
                                transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                                className="w-0.5 bg-indigo-400 rounded-full"
                              />
                            ))}
                          </div>
                          <Mic className="w-4 h-4 text-slate-400" />
                        </div>

                        <button className="p-2.5 text-slate-400 hover:text-indigo-600 transition-all rounded-full hover:bg-slate-50">
                          <Volume2 className="w-5 h-5" />
                        </button>

                        <div className="relative">
                          <AnimatePresence>
                            {isVoiceModalOpen && (
                              <>
                                <motion.div 
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  onClick={() => setIsVoiceModalOpen(false)}
                                  className="fixed inset-0 z-[100]"
                                />
                                <motion.div
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                  className="absolute bottom-full left-0 mb-4 w-72 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-[101] p-3"
                                >
                                  <div className="p-3 border-b border-slate-50 mb-2">
                                    <h3 className="text-sm font-bold text-slate-800">Assitants</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Female & Male voices</p>
                                  </div>
                                  <div className="space-y-1">
                                    {voiceAssistants.map((assistant) => (
                                      <button
                                        key={assistant.id}
                                        onClick={() => {
                                          onVoiceChange(assistant.id);
                                          setIsVoiceModalOpen(false);
                                        }}
                                        className={cn(
                                          "flex items-center gap-3 w-full p-2 rounded-xl transition-all text-left",
                                          selectedVoice === assistant.id
                                            ? "bg-indigo-50 text-indigo-600"
                                            : "hover:bg-slate-50 text-slate-600"
                                        )}
                                      >
                                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", assistant.bg)}>
                                          <assistant.icon className={cn("w-4 h-4", assistant.color)} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between">
                                            <span className="text-sm font-bold">{assistant.name}</span>
                                            <span className={cn(
                                              "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md",
                                              assistant.gender === 'Female' ? "bg-fuchsia-50 text-fuchsia-500" : "bg-blue-50 text-blue-500"
                                            )}>
                                              {assistant.gender}
                                            </span>
                                          </div>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                          <div 
                            onClick={() => setIsVoiceModalOpen(!isVoiceModalOpen)}
                            className="ml-2 flex items-center gap-2 px-4 py-2 border border-slate-100 rounded-full bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer group"
                          >
                            <currentAssistant.icon className={cn("w-4 h-4 text-slate-400 group-hover:text-indigo-600", currentAssistant.color)} />
                            <span className="text-sm font-bold text-slate-600">{currentAssistant.name}</span>
                            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:rotate-180 transition-transform" />
                          </div>
                        </div>
                      </div>

                      {input.trim() ? (
                        <button 
                          onClick={handleSubmit}
                          className="bg-indigo-600 text-white font-bold py-2.5 px-8 rounded-full hover:bg-indigo-700 transition-all active:scale-95 shadow-lg flex items-center gap-2"
                        >
                          Send
                          <Send className="w-4 h-4" />
                        </button>
                      ) : (
                        <button 
                          onClick={() => onToggleLiveMode(false)}
                          className="bg-black text-white font-bold py-2.5 px-8 rounded-full hover:bg-slate-800 transition-all active:scale-95 shadow-lg"
                        >
                          Stop
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-slate-300 hover:text-indigo-600 transition-all active:scale-90"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      multiple 
                      className="hidden" 
                    />
                    
                    <form onSubmit={handleSubmit} className="flex-1">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Search..."
                        className="w-full bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-300 py-3 px-2 text-lg font-medium"
                      />
                    </form>

                    <div className="flex items-center gap-1">
                      <button 
                        onClick={toggleRecording}
                        className={cn(
                          "p-3 rounded-full transition-all active:scale-90",
                          isRecording ? "text-red-500 animate-pulse bg-red-50" : "text-slate-300 hover:text-indigo-600"
                        )}
                      >
                        <Mic className="w-6 h-6" />
                      </button>
                      
                      {input.trim() || attachments.length > 0 ? (
                        <button
                          onClick={handleSubmit}
                          disabled={isLoading}
                          className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center transition-all bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none"
                          )}
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => onToggleLiveMode(true)}
                          className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center transition-all bg-slate-900 text-white shadow-lg shadow-slate-200 hover:bg-black active:scale-95"
                          )}
                        >
                          <AudioLines className="w-6 h-6" />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
              
              {attachments.length > 0 && !isLiveMode && (
                  <div className="absolute -top-14 left-6 flex gap-2 p-2 bg-white rounded-xl border border-slate-100 shadow-xl animate-in fade-in slide-in-from-bottom-2">
                    {attachments.map((f, i) => (
                      <div key={i} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg flex items-center gap-2">
                        {f.name}
                        <button onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))} className="hover:text-red-500 font-bold font-mono">×</button>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
          
          <div className="flex items-center justify-center px-6">
            <p className="text-[11px] text-slate-300 font-bold uppercase tracking-[0.2em] opacity-40">
              Personal AI Assistant
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
