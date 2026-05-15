"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Settings, History, BarChart3, MessageSquare, Zap } from "lucide-react";
import { useVoice } from "@/hooks/useVoice";

export default function Home() {
  const { isConnected, isListening, transcript, startListening, stopListening, connect } = useVoice();
  const [status, setStatus] = useState("Idle");
  const [latency, setLatency] = useState(0);

  useEffect(() => {
    if (isListening) {
      setStatus("Listening...");
    } else if (isConnected) {
      setStatus("Ready");
    } else {
      setStatus("Disconnected");
    }
  }, [isListening, isConnected]);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-between p-8 overflow-hidden relative">
      {/* Background Neural Network Simulation */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] animate-bounce" />
      </div>

      {/* Header */}
      <nav className="w-full max-w-7xl flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white uppercase italic">Aether OS</h1>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={connect}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${isConnected ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-white/5 text-white/40 border border-white/10'}`}
          >
            {isConnected ? 'System Online' : 'Connect System'}
          </button>
          <button className="p-2 rounded-full glass hover:bg-white/10 transition-colors text-white/70">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* Central Visualizer */}
      <div className="flex-1 flex flex-col items-center justify-center z-10 w-full max-w-4xl">
        <div className="relative">
          <AnimatePresence>
            {isListening && (
              <>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 0.3 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="absolute inset-0 bg-blue-500 rounded-full blur-3xl animate-pulse-ring"
                />
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1.1, opacity: 0.2 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="absolute inset-0 bg-purple-500 rounded-full blur-2xl"
                />
              </>
            )}
          </AnimatePresence>
          
          <div className={`w-64 h-64 rounded-full glass flex items-center justify-center relative z-20 transition-all duration-500 ${isListening ? 'neural-glow border-blue-500/50' : 'border-white/10'}`}>
            <motion.div 
              animate={isListening ? { scale: [1, 1.1, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-center"
            >
              <div className="text-sm uppercase tracking-[0.2em] text-white/40 mb-2 font-medium">System Status</div>
              <div className="text-3xl font-light text-white tracking-widest uppercase italic">{status}</div>
            </motion.div>
          </div>
        </div>

        {/* Transcript / AI Response */}
        <div className="mt-8 max-w-2xl text-center">
          <p className="text-white/60 text-lg font-light leading-relaxed min-h-[3rem]">
            {transcript || "Waiting for signal..."}
          </p>
        </div>

        {/* Real-time metrics */}
        <div className="mt-12 grid grid-cols-3 gap-8 w-full">
          <MetricCard icon={<Zap className="w-4 h-4" />} label="Latency" value={`${latency}ms`} color="text-blue-400" />
          <MetricCard icon={<BarChart3 className="w-4 h-4" />} label="Sentiment" value="Neutral" color="text-green-400" />
          <MetricCard icon={<MessageSquare className="w-4 h-4" />} label="Memory" value="Syncing" color="text-purple-400" />
        </div>
      </div>

      {/* Control Bar */}
      <footer className="w-full max-w-2xl z-10 flex flex-col items-center gap-6">
        <div className="flex items-center gap-6">
          <button 
            onClick={toggleListening}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
              isListening 
              ? 'bg-red-500 shadow-red-500/40 hover:bg-red-600' 
              : 'bg-blue-600 shadow-blue-500/40 hover:bg-blue-700'
            }`}
          >
            {isListening ? <MicOff className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
          </button>
        </div>
        
        <div className="flex gap-8 text-white/30 text-xs font-medium uppercase tracking-[0.3em]">
          <span className="hover:text-white/60 cursor-pointer transition-colors">Interruption Enabled</span>
          <span className="hover:text-white/60 cursor-pointer transition-colors">Emotional Intelligence v2.1</span>
          <span className="hover:text-white/60 cursor-pointer transition-colors">Global Memory Active</span>
        </div>
      </footer>
    </main>
  );
}

function MetricCard({ icon, label, value, color }: { icon: any, label: string, value: string, color: string }) {
  return (
    <div className="glass p-4 rounded-2xl border-white/5 flex flex-col gap-1 items-center">
      <div className={`${color} opacity-80 mb-1`}>{icon}</div>
      <div className="text-[10px] uppercase tracking-wider text-white/30">{label}</div>
      <div className="text-lg font-medium text-white">{value}</div>
    </div>
  );
}
