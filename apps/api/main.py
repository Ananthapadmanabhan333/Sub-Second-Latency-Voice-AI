import os
import asyncio
import json
import logging
import base64
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from realtime_manager import OpenAIRealtimeManager

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aether-api")

app = FastAPI(title="Aether Voice OS API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "0.1.0"}

@app.websocket("/ws/voice")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("Client connected to voice websocket")
    
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.error("OPENAI_API_KEY not set")
        await websocket.close(code=1008)
        return

    realtime = OpenAIRealtimeManager(api_key)
    
    try:
        await realtime.connect()
        
        # Define callbacks
        async def send_audio(delta):
            await websocket.send_json({
                "type": "audio",
                "delta": delta
            })

        async def send_text(delta):
            await websocket.send_json({
                "type": "text",
                "delta": delta
            })
            
        async def handle_interruption():
            await websocket.send_json({
                "type": "interruption"
            })

        realtime.on_audio_delta = send_audio
        realtime.on_text_delta = send_text
        realtime.on_interruption = handle_interruption

        # Start listening to OpenAI in background
        listen_task = asyncio.create_task(realtime.listen())

        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "audio":
                await realtime.send_audio_chunk(message["delta"])
            elif message["type"] == "cancel":
                # Logic to cancel current response
                pass
            
    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await realtime.close()
        if 'listen_task' in locals():
            listen_task.cancel()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
