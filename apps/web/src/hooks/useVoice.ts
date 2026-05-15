"use client";

import { useState, useEffect, useRef } from "react";

export function useVoice() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  
  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioQueue = useRef<Int16Array[]>([]);
  const isPlaying = useRef(false);

  const connect = () => {
    setIsConnecting(true);
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//localhost:8000/ws/voice`);
    
    socket.onopen = () => {
      setIsConnected(true);
      setIsConnecting(false);
      console.log("Connected to Aether Voice Server");
    };

    socket.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === "audio") {
        const audioData = base64ToArrayBuffer(data.delta);
        audioQueue.current.push(new Int16Array(audioData));
        if (!isPlaying.current) {
          playNextChunk();
        }
      } else if (data.type === "text") {
        setTranscript((prev) => prev + data.delta);
      } else if (data.type === "interruption") {
        stopPlayback();
      }
    };

    socketRef.current = socket;
  };

  const startListening = async () => {
    if (!isConnected) connect();
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = floatTo16BitPCM(inputData);
        const base64Audio = arrayBufferToBase64(pcmData.buffer);
        
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: "audio",
            delta: base64Audio
          }));
        }
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      processorRef.current = processor;
      setIsListening(true);
      
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const stopListening = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    processorRef.current?.disconnect();
    setIsListening(false);
  };

  const playNextChunk = async () => {
    if (audioQueue.current.length === 0 || !audioContextRef.current) {
      isPlaying.current = false;
      return;
    }

    isPlaying.current = true;
    const chunk = audioQueue.current.shift()!;
    const buffer = audioContextRef.current.createBuffer(1, chunk.length, 24000);
    const channelData = buffer.getChannelData(0);
    
    for (let i = 0; i < chunk.length; i++) {
      channelData[i] = chunk[i] / 32768;
    }
    
    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.onended = playNextChunk;
    source.start();
  };

  const stopPlayback = () => {
    audioQueue.current = [];
    isPlaying.current = false;
    // In a real implementation, we'd need to stop the current source node
  };

  return {
    isConnected,
    isListening,
    transcript,
    startListening,
    stopListening,
    connect
  };
}

// Utility functions
function floatTo16BitPCM(input: Float32Array) {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string) {
  const binary = window.atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
}
