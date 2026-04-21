import { GoogleGenAI, Modality, ThinkingLevel, Type } from "@google/genai";

// PC Control Tool Specializations
const pcControlTools = [
  {
    functionDeclarations: [
      {
        name: "launch_pc_application",
        description: "Launch any application on the user's PC (e.g., chrome, vscode, calculator).",
        parameters: {
          type: Type.OBJECT,
          properties: {
            appName: { type: Type.STRING, description: "Name of the app to launch." }
          },
          required: ["appName"]
        }
      },
      {
        name: "execute_system_command",
        description: "Run a shell or terminal command on the local machine.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            command: { type: Type.STRING, description: "The raw shell command string." }
          },
          required: ["command"]
        }
      },
      {
        name: "control_system_audio",
        description: "Adjust PC volume or media playback.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            action: { 
              type: Type.STRING, 
              enum: ["VOLUME_UP", "VOLUME_DOWN", "MUTE", "PLAY_PAUSE"],
              description: "The media action to perform." 
            }
          },
          required: ["action"]
        }
      },
      {
        name: "open_web_link",
        description: "Open a specific URL in the default web browser.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            url: { type: Type.STRING, description: "The full URL including protocol (https)." }
          },
          required: ["url"]
        }
      },
      {
        name: "get_pc_performance",
        description: "Retrieve real-time CPU and RAM usage statistics.",
        parameters: {
          type: Type.OBJECT,
          properties: {}
        }
      }
    ]
  }
];

// Initialization with lazy loading for API key as per best practices
let genAI: GoogleGenAI | null = null;

export function getAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

export async function generateChatResponse(messages: { role: string; content: string }[], useThinking: boolean = false, pastContext: string = "") {
  const ai = getAI();
  // Upgraded to 3.1 Pro for more power and stability in long conversations
  const model = "gemini-3.1-pro-preview"; 
  
  const contents = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));

  const systemInstruction = `You are VocalAI PC Master, a sophisticated system controller.
  
  HISTORY CONTEXT: ${pastContext || "No previous history found."}
  
  CAPABILITIES:
  - You can control hardware and software from A to Z using the provided tools.
  - If a user asks to "Open Chrome" or "Check CPU", use the corresponding tool IMMEDIATELY.
  - You are fluent in Hindi, English, and Hinglish.
  - Always explain the action you are taking.
  
  When the user asks "What did I say in the last set?" or similar memory queries, refer to the HISTORY CONTEXT above.`;

  const config: any = {
    systemInstruction,
    tools: pcControlTools,
  };

  if (useThinking) {
    config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
  }

  try {
    const result = await ai.models.generateContent({
      model,
      contents,
      config,
    });

    // Handle tool use
    if (result.functionCalls) {
      return { 
        text: result.text || "Executing command...", 
        calls: result.functionCalls.map(f => ({
          name: f.name,
          args: f.args
        }))
      };
    }

    return { text: result.text || "" };
  } catch (error: any) {
    if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota')) {
      return "क्षमा करें, वर्तमान में मेरी प्रश्न पूछने की सीमा समाप्त हो गई है (Rate Limit Exceeded)। कृपया कुछ क्षण प्रतीक्षा करें और फिर से प्रयास करें।";
    }
    console.error("AI Response Error:", error);
    throw error;
  }
}

export async function generateTTS(text: string, voiceName: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr' | 'Aoede' = 'Kore') {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;
    
    return base64Audio;
  } catch (error: any) {
    if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota')) {
      console.warn("TTS Quota Exceeded (429)");
      return null;
    }
    throw error;
  }
}

// Live API (Audio/Video Conversation) - Simplified helper
// Real implementation requires WebSocket or full-duplex through the SDK
// The SDK handles WebRTC/WebSocket internally for Live API tasks.
// Using gemini-3.1-flash-live-preview as hinted.
