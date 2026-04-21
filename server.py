import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Allow CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize GenAI client
client = None

def get_client():
    global client
    if client is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        client = genai.Client(api_key=api_key, http_options={'api_version': 'v1alpha'})
    return client

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    useThinking: bool = False
    pastContext: str = ""

class TTSRequest(BaseModel):
    text: str
    voiceName: str = "Kore"

@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        c = get_client()
        model_name = "gemini-3.1-pro-preview" if request.useThinking else "gemini-3-flash-preview"
        
        contents = [
            types.Content(
                role="user" if m.role == "user" else "model",
                parts=[types.Part(text=m.content)]
            ) for m in request.messages
        ]
        
        system_instruction = f"""You are VocalAI, a sophisticated assistant with flawless memory.
        
        HISTORY CONTEXT: {request.pastContext or "No previous history found."}
        
        When the user asks "What did I say in the last set?" or similar memory queries, refer to the HISTORY CONTEXT above.
        If the user provides a document, analyze it thoroughly as part of your knowledge.
        You can speak and understand Hindi, English, and Hinglish. Provide concise, polished, and accurate responses."""

        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
        )

        if request.useThinking:
            config.thinking_config = types.ThinkingConfig(include_thoughts=True)

        response = c.models.generate_content(
            model=model_name,
            contents=contents,
            config=config
        )
        
        return {"text": response.text}
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "quota" in error_msg.lower():
            return {"text": "क्षमा करें, वर्तमान में मेरी प्रश्न पूछने की सीमा समाप्त हो गई है (Rate Limit Exceeded)। कृपया कुछ क्षण प्रतीक्षा करें और फिर से प्रयास करें।"}
        print(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tts")
async def tts(request: TTSRequest):
    try:
        c = get_client()
        response = c.models.generate_content(
            model="gemini-3.1-flash-tts-preview",
            contents=types.Content(parts=[types.Part(text=request.text)]),
            config=types.GenerateContentConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=request.voiceName)
                    )
                ),
            ),
        )
        
        # Audio bytes are already in base64 if we use response.candidates[0].content.parts[0].inline_data.data
        # But in Python SDK, it might be different. Let's check candidate content.
        # From JS SDK: response.candidates[0].content.parts[0].inlineData.data
        
        inline_data = response.candidates[0].content.parts[0].inline_data
        if inline_data:
            return {"audioData": inline_data.data}
        return {"audioData": None}
    except Exception as e:
        print(f"Error in tts endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# For production, serve the frontend
if os.path.exists("dist"):
    app.mount("/", StaticFiles(directory="dist", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    # Use port 3000 as required by the platform proxy
    uvicorn.run(app, host="0.0.0.0", port=3000)
