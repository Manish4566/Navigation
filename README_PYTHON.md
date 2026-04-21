# VocalAI Python Backend

This directory contains the Python conversion of the VocalAI backend using **FastAPI** and the **Google GenAI Python SDK**.

## Setup Instructions

1. **Install Python 3.9+**
2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
4. **Environment Variables:**
   Create a `.env` file and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   ```
5. **Run the server:**
   ```bash
   python server.py
   ```

## API Endpoints

- `POST /api/chat`: Handles AI chat responses.
- `POST /api/tts`: Handles Text-to-Speech generation.

## Note for AI Studio Preview
The AI Studio live preview environment is optimized for Node.js. These Python files are provided for your local development and production deployment needs. The live preview continues to run on the equivalent TypeScript/Node.js logic.
