import React, { useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithGoogle, db } from './lib/firebase';
import { dbService } from './services/db';
import { generateChatResponse, generateTTS } from './services/ai';
import { ChatSession, Message, LiveConfig } from './types';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { AuthOverlay } from './components/AuthOverlay';
import { InstallPWA } from './components/InstallPWA';
import { SettingsModal } from './components/SettingsModal';
import { Menu, ChevronsRight } from 'lucide-react';
import { cn } from './lib/utils';
import { doc, getDocFromServer } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr' | 'Aoede'>('Kore');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [config, setConfig] = useState<LiveConfig>(() => {
    const saved = localStorage.getItem('wardenix_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Force migration to Gemini 3.1 Pro if on old models (case-insensitive)
        const modelName = (parsed.model || '').toLowerCase();
        if (!modelName.includes('gemini-3')) {
          parsed.model = 'gemini-3.1-pro-preview';
          const gemini = parsed.aiSettings?.find((s: any) => s.id === 'gemini');
          if (gemini) {
            gemini.selectedVersion = 'gemini-3.1-pro-preview';
            gemini.versions = [
              { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro' },
              { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash' }
            ];
          }
        }
        return parsed;
      } catch (e) {
        console.error("Failed to parse saved config", e);
      }
    }
    return {
      model: 'gemini-3.1-pro-preview',
      voiceName: 'Kore',
      webcamSize: 180,
      isDeveloperMode: false,
      customApiKey: localStorage.getItem('GEMINI_API_KEY') || undefined,
      aiSettings: [
        {
          id: 'gemini',
          name: 'Google Gemini',
          description: 'Multimodal AI with direct PC integration',
          icon: 'sparkles',
          enabled: true,
          selectedVersion: 'gemini-3.1-pro-preview',
          versions: [
            { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro' },
            { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash' }
          ]
        },
        {
          id: 'ollama',
          name: 'Local Ollama',
          description: 'Run open-weight models privately on your PC',
          icon: 'brain',
          enabled: false,
          baseUrl: 'http://localhost:11434',
          selectedVersion: 'llama3',
          versions: [
            { id: 'llama3', name: 'Llama 3' },
            { id: 'mistral', name: 'Mistral' }
          ]
        },
        {
          id: 'wardenix',
          name: 'Wardenix Bridge',
          description: 'Remote PC Control & System Automation',
          icon: 'zap',
          enabled: true,
          baseUrl: localStorage.getItem('BRIDGE_URL') || ''
        }
      ]
    };
  });

  // Sync config to localStorage
  useEffect(() => {
    localStorage.setItem('wardenix_config', JSON.stringify(config));
    if (config.customApiKey) localStorage.setItem('GEMINI_API_KEY', config.customApiKey);
    const bridgeUrl = config.aiSettings.find(s => s.id === 'wardenix')?.baseUrl;
    if (bridgeUrl) localStorage.setItem('BRIDGE_URL', bridgeUrl);
  }, [config]);

  // Sync selected voice between old state and new config
  useEffect(() => {
    if (config.voiceName !== selectedVoice) {
      setSelectedVoice(config.voiceName);
    }
  }, [config.voiceName]);

  // Optimized Connection Test with Long Timeout
  useEffect(() => {
    const testConnection = async (retries = 5) => {
      for (let i = 0; i < retries; i++) {
        try {
          // Using a slight delay before the first attempt to allow network to "warm up"
          if (i === 0) await new Promise(r => setTimeout(r, 1000));
          
          await getDocFromServer(doc(db, 'public_health_check', 'connectivity'));
          console.log("Firestore connection successfully established.");
          return;
        } catch (error: any) {
          console.error(`Firestore connection attempt ${i + 1} error:`, error.code || error.message);
          
          // If it's just "not found", that's actually a success (it reached the server)
          if (error?.code === 'not-found' || error?.message?.includes('not-found')) {
            console.log("Firestore connection verified (endpoint reachable).");
            return;
          }

          if (i === retries - 1) {
            console.warn("Firestore is taking longer than usual to connect. The app will continue in offline-sync mode.");
          } else {
            console.log(`Connection attempt ${i + 1} failed, retrying in ${2 * (i + 1)}s...`);
            await new Promise(r => setTimeout(r, 2000 * (i + 1))); // Incremental backoff
          }
        }
      }
    };
    testConnection();
  }, []);

  // Handle Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const isFirstLoad = !user;
        setUser(u);
        await dbService.createUserProfile({
          uid: u.uid,
          email: u.email!,
          displayName: u.displayName || 'User'
        });
        await loadSessions(u.uid, true);
        
        // Auto-start Live Mode disabled per user request
        if (isFirstLoad) {
          setIsLiveMode(false);
        }
      } else {
        setUser(null);
        setSessions([]);
        setMessages([]);
        setCurrentSessionId(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  const loadSessions = async (userId: string, setLatest?: boolean) => {
    const data = await dbService.getSessions(userId);
    if (data) {
      setSessions(data);
      if (setLatest && data.length > 0 && !currentSessionId) {
        setCurrentSessionId(data[0].id);
      }
    }
  };

  const loadMessages = async (sessionId: string) => {
    const data = await dbService.getMessages(sessionId);
    if (data) setMessages(data);
  };

  useEffect(() => {
    if (currentSessionId) {
      loadMessages(currentSessionId);
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = () => auth.signOut();

  const handleNewChat = () => {
    setCurrentSessionId(null);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleSelectSession = (id: string) => {
    setCurrentSessionId(id);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!user) return;
    await dbService.deleteSession(id);
    if (currentSessionId === id) setCurrentSessionId(null);
    loadSessions(user.uid);
  };

  const handleSendMessage = async (text: string, useThinking: boolean, attachments?: File[], fromVoice: boolean = false): Promise<string | null> => {
    if (!user || !text.trim()) return null;
    
    let sessionId = currentSessionId;
    if (!sessionId) {
      const title = text ? text.slice(0, 30) : "Live Conversation";
      sessionId = await dbService.createSession(user.uid, title);
      if (!sessionId) return null;
      setCurrentSessionId(sessionId);
      await loadSessions(user.uid);
    } else if (messages.length === 0) {
      await dbService.updateSessionTitle(sessionId, text.slice(0, 30));
      await loadSessions(user.uid);
    }

    let fullText = text;
    if (attachments && attachments.length > 0) {
      const fileNames = attachments.map(f => f.name).join(', ');
      fullText = `[Attached Files: ${fileNames}]\n${text}`;
      
      for (const file of attachments) {
        if (file.type === 'text/plain') {
          const content = await file.text();
          fullText += `\n\n--- Content of ${file.name} ---\n${content}`;
        }
      }
    }

    const userMsg = {
      sessionId: sessionId!,
      role: 'user' as const,
      content: fullText
    };
    await dbService.addMessage(sessionId!, userMsg);
    await loadMessages(sessionId!);

    setIsChatLoading(true);
    try {
      // Fetch only contextually relevant history (limit to last 50 messages to prevent token bloat)
      const fullHistory = await dbService.getMessages(sessionId!);
      const history = fullHistory.slice(-50); 
      
      let pastHistoryText = "";
      
      // Memory feature: only fetch other session context if explicitly asked or for thinking
      const keywords = ["last", "previous", "बारे में", "याद है", "memory"];
      const shouldFetchMemory = keywords.some(k => text.toLowerCase().includes(k)) || useThinking;

      if (shouldFetchMemory) {
        const otherSessions = sessions.filter(s => s.id !== sessionId).slice(0, 5); // Limit memory lookup
        for (const s of otherSessions) {
          const msgs = await dbService.getMessages(s.id);
          if (msgs && msgs.length > 0) {
            pastHistoryText += `\nSESSION "${s.title}":\n` + msgs.slice(-3).map(m => `${m.role}: ${m.content}`).join("\n");
          }
        }
      }

      const chatMessages = history.map(m => ({
        role: m.role,
        content: m.content
      }));
      
      const responseData = await generateChatResponse(chatMessages, useThinking, pastHistoryText);
      if (responseData) {
        const { text: responseText, calls } = responseData as any;
        
        // Final text to display
        let finalContent = responseText;

        // If there are function calls, we execute them via the Local Bridge if configured
        if (calls && calls.length > 0) {
          const bridgeUrl = localStorage.getItem('BRIDGE_URL');
          const logs = [];
          
          for (const call of calls) {
            logs.push(`\n[SYSTEM ACTION]: Executing ${call.name} with ${JSON.stringify(call.args)}`);
            
            if (bridgeUrl) {
              try {
                const res = await fetch(`${bridgeUrl}/execute`, {
                  method: 'POST',
                  mode: 'cors',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(call)
                });
                const result = await res.json();
                logs.push(`\n[BRIDGE RESPONSE]: ${result.status || 'Success'}`);
              } catch (e) {
                logs.push(`\n[BRIDGE ERROR]: Failed to reach local bridge. Please check your ngrok URL.`);
              }
            } else {
              logs.push(`\n[NOTICE]: Local Bridge URL not configured in Settings. Command logged but not sent.`);
            }
          }
          finalContent += logs.join("");
        }

        await dbService.addMessage(sessionId!, {
          sessionId: sessionId!,
          role: 'model',
          content: finalContent
        });
        await loadMessages(sessionId!);

        // Automatically speak the response (only content, not logs)
        handleSpeak(responseText);
        
        return finalContent;
      }
    } catch (e: any) {
      console.error("AI API Error:", e);
      // Fallback for API errors
      if (e?.message?.includes("quota") || e?.status === 429) {
        setMessages(prev => [...prev, {
          id: 'error',
          sessionId: sessionId!,
          role: 'model',
          content: "क्षमा करें, AI सेवा वर्तमान में व्यस्त है (API Quota Exceeded)। कृपया कुछ पल बाद प्रयास करें।",
          createdAt: { seconds: Date.now()/1000, nanoseconds: 0 } as any
        }]);
      }
    } finally {
      setIsChatLoading(false);
    }
    return null;
  };

  const handleVoiceInput = (text: string) => {
    // No longer calls handleSendMessage directly to allow user review of transcription
    console.log("Transcribed text received in App:", text);
  };

  const playAudio = useCallback(async (base64: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const audioCtx = audioContextRef.current;
      
      // Chrome/Browsers often suspend AudioContext until a user gesture or resume()
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      
      // Stop existing audio if playing
      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.stop();
        } catch (e) {}
        audioSourceRef.current = null;
      }

      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const arrayBuffer = bytes.buffer;
      const numberOfSamples = bytes.length / 2;
      const audioBuffer = audioCtx.createBuffer(1, numberOfSamples, 24000);
      const channelData = audioBuffer.getChannelData(0);
      const dataView = new DataView(arrayBuffer);
      for (let i = 0; i < numberOfSamples; i++) {
        channelData[i] = dataView.getInt16(i * 2, true) / 32768;
      }
      
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      
      source.onended = () => {
        setIsSpeaking(false);
        audioSourceRef.current = null;
      };

      audioSourceRef.current = source;
      setIsSpeaking(true);
      source.start();
    } catch (e) {
      console.error("Audio playback error:", e);
      setIsSpeaking(false);
    }
  }, []);

  const handleSpeak = async (text: string) => {
    // Strip markdown formatting before sending to TTS for better voice quality
    const cleanText = text
      .replace(/[#*`_~]/g, '') // Remove simple markdown
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
      .slice(0, 1000); // Limit length for TTS stability

    const audioData = await generateTTS(cleanText, selectedVoice);
    if (audioData) {
      playAudio(audioData);
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-[#F5F7F9] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthOverlay onSignIn={handleSignIn} isLoading={isSigningIn} />;
  }

  const currentSession = sessions.find(s => s.id === currentSessionId);

  return (
    <div className="flex h-screen bg-white text-slate-800 font-sans">
      <InstallPWA />
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        config={config}
        setConfig={setConfig}
        onLoginClick={handleSignIn}
        onSendMessage={(text) => handleSendMessage(text, false)}
        isConnected={true}
      />
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className={cn(
          "fixed top-6 left-6 z-40 p-2 bg-white rounded-xl border border-slate-100 md:hidden transition-all shadow-xl hover:shadow-2xl active:scale-95",
          isSidebarOpen && "scale-0 opacity-0"
        )}
      >
        <Menu className="w-5 h-5 text-slate-500" />
      </button>

      {/* Desktop Toggle Open Button (when sidebar is closed) */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className={cn(
          "fixed top-6 left-6 z-40 p-2 bg-white rounded-xl border border-slate-100 hidden md:flex transition-all shadow-xl hover:shadow-2xl active:scale-95 group",
          isSidebarOpen && "scale-0 opacity-0 pointer-events-none"
        )}
      >
        <ChevronsRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
      </button>

      {/* Sidebar overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      ) }

      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onSignOut={handleSignOut}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        displayName={user.displayName || 'User'}
        config={config}
        setConfig={setConfig}
      />

      <main className="flex-1 relative flex flex-col min-w-0 transition-all duration-300">
        <ChatWindow
          messages={messages}
          onSendMessage={handleSendMessage}
          onSpeak={handleSpeak}
          onVoiceInput={handleVoiceInput}
          isLoading={isChatLoading}
          isSpeaking={isSpeaking}
          sessionTitle={currentSession?.title || "VocalAI"}
          displayName={user.displayName || 'Friend'}
          isLiveMode={isLiveMode}
          onToggleLiveMode={setIsLiveMode}
          selectedVoice={selectedVoice}
          onVoiceChange={setSelectedVoice}
        />
      </main>
    </div>
  );
}
