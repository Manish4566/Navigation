import reflex as rx
import os
import json
import subprocess
import webbrowser
import platform
import psutil
from google import genai
from google.genai import types
from datetime import datetime
from dotenv import load_dotenv

# Optional: pyautogui for cross-platform UI control (may fail in headless envs)
try:
    import pyautogui
    PYAUTOGUI_AVAILABLE = True
except Exception:
    PYAUTOGUI_AVAILABLE = False

load_dotenv()

# --- PC Control Tools ---

def launch_app(app_name: str):
    """Launch a PC application by name."""
    try:
        if platform.system() == "Windows":
            subprocess.Popen(["start", app_name], shell=True)
        elif platform.system() == "Darwin": # macOS
            subprocess.Popen(["open", "-a", app_name])
        else: # Linux
            subprocess.Popen([app_name])
        return f"Successfully attempted to launch {app_name}"
    except Exception as e:
        return f"Error launching app: {str(e)}"

def open_url(url: str):
    """Open a website or link in the default browser."""
    webbrowser.open(url)
    return f"Opening {url} in your browser."

def get_system_stats():
    """Get real-time CPU and RAM usage stats."""
    cpu = psutil.cpu_percent(interval=None)
    ram = psutil.virtual_memory().percent
    return f"System Stats: CPU usage is {cpu}% and RAM usage is {ram}%."

def media_control(action: str):
    """Control system media: volume_up, volume_down, mute, play_pause."""
    if not PYAUTOGUI_AVAILABLE:
        return "Media control is not available on this environment."
    
    actions = {
        "volume_up": "volumeup",
        "volume_down": "volumedown",
        "mute": "volumemute",
        "play_pause": "playpause"
    }
    
    if action in actions:
        pyautogui.press(actions[action])
        return f"Executed {action}"
    return "Invalid media action."

def execute_shell(command: str):
    """Execute a system shell command and return the result."""
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=5)
        return f"STDOUT: {result.stdout}\nSTDERR: {result.stderr}"
    except Exception as e:
        return f"Execution Error: {str(e)}"

# Mapping tool names to actual functions
TOOLS_MAP = {
    "launch_app": launch_app,
    "open_url": open_url,
    "get_system_stats": get_system_stats,
    "media_control": media_control,
    "execute_shell": execute_shell
}

# Function Declarations for Gemini
tool_declarations = [
    types.FunctionDeclaration(
        name="launch_app",
        description="Open any installed application on the PC (e.g., chrome, notepad, calculator).",
        parameters=types.Schema(
            type="OBJECT",
            properties={"app_name": types.Schema(type="STRING", description="Name of the app to launch.")},
            required=["app_name"]
        )
    ),
    types.FunctionDeclaration(
        name="open_url",
        description="Open a specific website or URL in the default browser.",
        parameters=types.Schema(
            type="OBJECT",
            properties={"url": types.Schema(type="STRING", description="The full URL (e.g., https://google.com).")},
            required=["url"]
        )
    ),
    types.FunctionDeclaration(
        name="get_system_stats",
        description="Check current CPU and RAM performance."
    ),
    types.FunctionDeclaration(
        name="media_control",
        description="Control PC volume or media playback.",
        parameters=types.Schema(
            type="OBJECT",
            properties={
                "action": types.Schema(
                    type="STRING", 
                    enum=["volume_up", "volume_down", "mute", "play_pause"],
                    description="The action to perform."
                )
            },
            required=["action"]
        )
    ),
    types.FunctionDeclaration(
        name="execute_shell",
        description="Run a terminal/shell command on the local machine.",
        parameters=types.Schema(
            type="OBJECT",
            properties={"command": types.Schema(type="STRING", description="The command string to execute.")},
            required=["command"]
        )
    )
]

# --- Configuration & State ---
class Assistant(rx.Base):
    name: str
    desc: str
    gender: str
    icon: str
    color: str
    bg_color: str

class Message(rx.Base):
    role: str
    content: str

class State(rx.State):
    """The app state."""
    messages: list[Message] = []
    input_text: str = ""
    is_live_mode: bool = False
    is_thinking: bool = False
    is_voice_popover_open: bool = False
    selected_voice: str = "Kore"
    is_speaking: bool = False
    audio_data: str = ""

    assistants: list[Assistant] = [
        Assistant(name="Kore", desc="The Calm Sage", gender="Female", icon="book-open", color="emerald", bg_color="bg-emerald-50"),
        Assistant(name="Aoede", desc="The Melodic Muse", gender="Female", icon="music", color="fuchsia", bg_color="bg-fuchsia-50"),
        Assistant(name="Zephyr", desc="The Gentle Breeze", gender="Female", icon="wind", color="cyan", bg_color="bg-cyan-50"),
        Assistant(name="Puck", desc="The Energetic Sprite", gender="Male", icon="sparkles", color="amber", bg_color="bg-amber-50"),
        Assistant(name="Charon", desc="The Deep Guardian", gender="Male", icon="shield", color="indigo", bg_color="bg-indigo-50"),
        Assistant(name="Fenrir", desc="The Power Spirit", gender="Male", icon="target", color="red", bg_color="bg-red-50"),
    ]

    @rx.var
    def current_assistant(self) -> Assistant:
        for a in self.assistants:
            if a.name == self.selected_voice:
                return a
        return self.assistants[0]

    def toggle_voice_popover(self):
        self.is_voice_popover_open = not self.is_voice_popover_open

    def select_voice(self, name: str):
        self.selected_voice = name
        self.is_voice_popover_open = False

    action_logs: list[str] = []

    async def handle_submit(self):
        if not self.input_text:
            return
        
        # Add user message
        new_msg = Message(role="user", content=self.input_text)
        self.messages.append(new_msg)
        prompt = self.input_text
        self.input_text = ""
        
        yield # Update UI

        # Call AI Logic with Tools
        try:
            client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"), http_options={'api_version': 'v1alpha'})
            model = "gemini-3.1-pro-preview" if self.is_thinking else "gemini-3-flash-preview"
            
            # Use Tool Hybrid Mode
            config = types.GenerateContentConfig(
                system_instruction="You are VocalAI PC Master. You can control the user's PC using tools. If a command requires an action, use the tool first. Always explain what you are doing.",
                tools=[types.Tool(function_declarations=tool_declarations)]
            )

            response = client.models.generate_content(
                model=model,
                contents=[types.Content(role="user", parts=[types.Part(text=prompt)])],
                config=config
            )
            
            # Process potential function calls
            if response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if part.function_call:
                        fn_name = part.function_call.name
                        fn_args = part.function_call.args
                        
                        self.action_logs.append(f"Executing: {fn_name}({fn_args})")
                        yield
                        
                        # Execute the local tool
                        if fn_name in TOOLS_MAP:
                            result = TOOLS_MAP[fn_name](**fn_args)
                            self.action_logs.append(f"Result: {result}")
                            
                            # Send tool result back to Gemini for final response
                            tool_response = client.models.generate_content(
                                model=model,
                                contents=[
                                    types.Content(role="user", parts=[types.Part(text=prompt)]),
                                    response.candidates[0].content,
                                    types.Content(role="function", parts=[
                                        types.Part(function_response=types.FunctionResponse(
                                            name=fn_name,
                                            response={"result": result}
                                        ))
                                    ])
                                ],
                                config=config
                            )
                            ai_content = tool_response.text
                        else:
                            ai_content = f"Error: Tool {fn_name} not found."
                    elif part.text:
                        ai_content = part.text

            self.messages.append(Message(role="model", content=ai_content))
            
            # Audio generation logic...
            if self.is_live_mode:
                audio_resp = client.models.generate_content(
                    model="gemini-3.1-flash-tts-preview",
                    contents=types.Content(parts=[types.Part(text=ai_content[:200])]), # Limit for demo
                    config=types.GenerateContentConfig(
                        response_modalities=["AUDIO"],
                        speech_config=types.SpeechConfig(
                            voice_config=types.VoiceConfig(
                                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=self.selected_voice)
                            )
                        ),
                    ),
                )
                if audio_resp.candidates[0].content.parts[0].inline_data:
                    self.audio_data = audio_resp.candidates[0].content.parts[0].inline_data.data
                    self.is_speaking = True

        except Exception as e:
            self.messages.append(Message(role="model", content=f"Error: {str(e)}"))

# --- UI Components ---

def assistant_popover():
    return rx.cond(
        State.is_voice_popover_open,
        rx.box(
            rx.vstack(
                rx.box(
                    rx.text("Assistants", font_weight="bold", color="gray.800"),
                    rx.text("Female & Male voices", font_size="10px", color="gray.400", weight="bold"),
                    padding="12px", border_bottom="1px solid #f1f5f9"
                ),
                rx.vstack(
                    rx.foreach(
                        State.assistants,
                        lambda assistant: rx.button(
                            rx.hstack(
                                rx.center(
                                    rx.icon(tag=assistant.icon, color=f"{assistant.color}.500", size=16),
                                    background_color=f"{assistant.color}.50",
                                    width="32px", height="32px", border_radius="lg"
                                ),
                                rx.vstack(
                                    rx.hstack(
                                        rx.text(assistant.name, font_size="sm", font_weight="bold"),
                                        rx.badge(assistant.gender, font_size="9px", variant="soft", color_scheme="purple" if assistant.gender == "Female" else "blue"),
                                        width="100%", justify="between"
                                    ),
                                    align_items="start", spacing="0"
                                ),
                                width="100%", spacing="3"
                            ),
                            on_click=lambda: State.select_voice(assistant.name),
                            variant="ghost", width="100%", padding="8px", border_radius="xl",
                            _hover={"background_color": "#f8fafc"}
                        )
                    ),
                    spacing="1", width="100%"
                ),
                spacing="0", width="100%"
            ),
            position="absolute", bottom="100%", left="0", margin_bottom="16px",
            width="280px", background_color="white", border_radius="3xl",
            box_shadow="2xl", border="1px solid #f1f5f9", z_index="100", overflow="hidden"
        )
    )

def message_view(msg: Message):
    return rx.box(
        rx.hstack(
            rx.cond(
                msg.role == "user",
                rx.spacer(),
                rx.box()
            ),
            rx.box(
                rx.text(msg.content, color="white" if msg.role == "user" else "gray.800"),
                padding="12px 18px",
                border_radius="24px",
                background_color="#101827" if msg.role == "user" else "white",
                box_shadow="sm" if msg.role == "model" else "none",
                max_width="80%"
            ),
            rx.cond(
                msg.role == "model",
                rx.spacer(),
                rx.box()
            ),
            width="100%"
        ),
        margin_bottom="16px"
    )

def index():
    return rx.box(
        # Sidebar (Mobile placeholder)
        rx.box(width="100%", height="100vh", background_color="#fdfaf7", display="flex"),
        
        # Main Content
        rx.vstack(
            # Header
            rx.hstack(
                rx.icon(tag="menu", cursor="pointer"),
                rx.spacer(),
                rx.button("Live Mode", on_click=State.toggle_voice_popover, border_radius="full"),
                width="100%", padding="4", bg="white", border_bottom="1px solid #f1f5f9"
            ),
            
            # Chat Messages
            rx.scroll_area(
                rx.vstack(
                    rx.foreach(State.messages, message_view),
                    width="100%", padding="6", max_width="800px", margin="0 auto"
                ),
                flex="1", width="100%"
            ),
            
            # Input Footer
            rx.box(
                rx.vstack(
                    rx.box(
                        assistant_popover(),
                        rx.hstack(
                            rx.input(
                                placeholder="Ask anything...",
                                value=State.input_text,
                                on_change=State.set_input_text,
                                on_blur=State.handle_submit,
                                border="none", _focus={"box_shadow": "none"}, flex="1"
                            ),
                            rx.hstack(
                                rx.icon(tag="paperclip", color="gray.400", cursor="pointer"),
                                rx.button(
                                    rx.hstack(
                                        rx.icon(tag=State.current_assistant.icon, size=16),
                                        rx.text(State.current_assistant.name, font_size="sm"),
                                        rx.icon(tag="chevron-down", size=16)
                                    ),
                                    on_click=State.toggle_voice_popover,
                                    variant="ghost", border_radius="full", bg="#f8fafc"
                                ),
                                rx.button("Go", on_click=State.handle_submit, padding_x="6", border_radius="full")
                            ),
                            padding="8px", border="2px solid #f1f5f9", border_radius="full", bg="white"
                        ),
                        position="relative", width="100%"
                    ),
                    max_width="800px", margin="0 auto", width="100%", padding="6"
                ),
                width="100%", bg="transparent"
            ),
            height="100vh", width="100%", spacing="0"
        ),
        width="100%", overflow="hidden"
    )

app = rx.App()
app.add_page(index)
