import os
import json
import base64
import asyncio
import logging
import websockets
from typing import Optional, Callable

logger = logging.getLogger("aether-realtime")

class OpenAIRealtimeManager:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01"
        self.ws: Optional[websockets.WebSocketClientProtocol] = None
        self.on_text_delta: Optional[Callable] = None
        self.on_audio_delta: Optional[Callable] = None
        self.on_interruption: Optional[Callable] = None

    async def connect(self):
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "OpenAI-Beta": "realtime=v1"
        }
        self.ws = await websockets.connect(self.url, extra_headers=headers)
        logger.info("Connected to OpenAI Realtime API")
        
        # Initial session configuration
        await self.send_session_update()

    async def send_session_update(self):
        session_update = {
            "type": "session.update",
            "session": {
                "modalities": ["text", "audio"],
                "instructions": "You are Aether, a world-class conversational AI. Be helpful, concise, and emotionally aware. Speak naturally.",
                "voice": "alloy",
                "input_audio_format": "pcm16",
                "output_audio_format": "pcm16",
                "turn_detection": {
                    "type": "server_vad",
                    "threshold": 0.5,
                    "prefix_padding_ms": 300,
                    "silence_duration_ms": 500
                },
                "tools": [],
                "tool_choice": "auto",
                "temperature": 0.8,
            }
        }
        await self.ws.send(json.dumps(session_update))

    async def send_audio_chunk(self, audio_base64: str):
        if not self.ws:
            return
        
        audio_append = {
            "type": "input_audio_buffer.append",
            "audio": audio_base64
        }
        await self.ws.send(json.dumps(audio_append))

    async def listen(self):
        if not self.ws:
            return

        async for message in self.ws:
            event = json.loads(message)
            event_type = event.get("type")

            if event_type == "response.audio.delta":
                if self.on_audio_delta:
                    await self.on_audio_delta(event.get("delta"))
            
            elif event_type == "response.audio_transcript.delta":
                if self.on_text_delta:
                    await self.on_text_delta(event.get("delta"))
            
            elif event_type == "input_audio_buffer.speech_started":
                logger.info("User started speaking - Interruption detected")
                if self.on_interruption:
                    await self.on_interruption()
            
            elif event_type == "error":
                logger.error(f"OpenAI error: {event.get('error')}")

    async def close(self):
        if self.ws:
            await self.ws.close()
