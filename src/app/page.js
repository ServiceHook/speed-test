"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, ArrowUp, Activity, Wifi, Play, RotateCcw } from "lucide-react";

export default function SpeedTest() {
  const [status, setStatus] = useState("idle"); 
  const [results, setResults] = useState({ ping: 0, download: 0, upload: 0 });
  const [gaugeValue, setGaugeValue] = useState(0);

  // --- CONFIGURATION ---
  // 1. DOWNLOAD: We use the local file you created with the 'dd' command
  const DOWNLOAD_URL = "/speed.dat"; 
  const DOWNLOAD_SIZE_BITS = 10 * 1024 * 1024 * 8; // 10 Megabytes in bits

  // 2. UPLOAD: We use 2MB to stay within Vercel's server limits
  const UPLOAD_SIZE_BYTES = 2 * 1024 * 1024; 
  const UPLOAD_SIZE_BITS = UPLOAD_SIZE_BYTES * 8;

  const runTest = async () => {
    setStatus("ping");
    setResults({ ping: 0, download: 0, upload: 0 });
    setGaugeValue(0);

    // --- PHASE 1: REAL PING ---
    const startPing = performance.now();
    try {
      // Pinging your own server API
      const resp = await fetch('/api/speed', { method: "POST", body: "ping" });
      if (!resp.ok) throw new Error("API not ready");
      const pingTime = Math.round(performance.now() - startPing);
      setResults(prev => ({ ...prev, ping: pingTime }));
    } catch (e) {
      console.warn("Ping failed (Check /api/speed/route.js):", e);
      setResults(prev => ({ ...prev, ping: 0 }));
    }

    // --- PHASE 2: REAL DOWNLOAD ---
    setStatus("download");
    const startDown = performance.now();
    
    // Animation loop for visual feedback
    const animInterval = setInterval(() => {
        setGaugeValue(v => (v < 90 ? v + Math.random() * 2 : v));
    }, 50);

    try {
      // Fetch local file with timestamp to prevent caching
      const resp = await fetch(`${DOWNLOAD_URL}?t=${Date.now()}`);
      
      if (!resp.ok) {
        throw new Error(`File missing. Did you run the 'dd' command? Status: ${resp.status}`);
      }

      await resp.blob(); // Wait for full file
      
      const durationSec = (performance.now() - startDown) / 1000;
      const speedMbps = (DOWNLOAD_SIZE_BITS / durationSec / 1000000).toFixed(1);
      
      clearInterval(animInterval);
      setResults(prev => ({ ...prev, download: speedMbps }));
      setGaugeValue(parseFloat(speedMbps) > 100 ? 100 : parseFloat(speedMbps));
    } catch (e) {
      console.error("Download Error:", e);
      setResults(prev => ({ ...prev, download: 0 }));
      clearInterval(animInterval);
    }

    // --- PHASE 3: REAL UPLOAD ---
    setStatus("upload");
    setGaugeValue(0);
    
    try {
        // Generate random junk data
        const junkData = new Uint8Array(UPLOAD_SIZE_BYTES); 
        const blob = new Blob([junkData]);

        const startUp = performance.now();
        
        // Send to API
        const resp = await fetch('/api/speed', { 
            method: 'POST', 
            body: blob 
        });

        if (!resp.ok) throw new Error("Upload API failed");

        const durationSec = (performance.now() - startUp) / 1000;
        const speedMbps = (UPLOAD_SIZE_BITS / durationSec / 1000000).toFixed(1);
        
        setResults(prev => ({ ...prev, upload: speedMbps }));
        setGaugeValue(parseFloat(speedMbps) > 100 ? 100 : parseFloat(speedMbps));

    } catch (e) {
        console.error("Upload failed:", e);
        setResults(prev => ({ ...prev, upload: 0 }));
    }

    // --- FINISH ---
    setStatus("complete");
    setGaugeValue(0);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[#050505] text-white selection:bg-blue-500/30">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Navbar */}
      <nav className="absolute top-0 w-full p-6 flex justify-between items-center max-w-6xl z-10">
        <div className="flex items-center gap-2 font-bold tracking-tight">
          <Wifi className="text-blue-500 w-5 h-5" />
          <span>NET.SPEED</span>
        </div>
        <div className="text-[10px] text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 rounded-full uppercase tracking-wider">
          System Normal
        </div>
      </nav>

      {/* Main Interface */}
      <div className="w-full max-w-lg z-10">
        
        {/* Status Text */}
        <div className="text-center mb-8 h-6">
            <AnimatePresence mode="wait">
                <motion.div 
                    key={status}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-gray-400 font-mono text-sm uppercase tracking-widest"
                >
                    {status === "idle" && "Ready"}
                    {status === "ping" && "Testing Latency..."}
                    {status === "download" && "Downloading Target File..."}
                    {status === "upload" && "Uploading Data..."}
                    {status === "complete" && "Analysis Complete"}
                </motion.div>
            </AnimatePresence>
        </div>

        {/* The Gauge */}
        <div className="relative aspect-square flex items-center justify-center mb-10">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle cx="50" cy="50" r="45" stroke="#1f2937" strokeWidth="2" fill="none" />
                
                {/* Active Ring */}
                <motion.circle 
                    cx="50" cy="50" r="45" 
                    stroke={status === "download" ? "#3b82f6" : status === "upload" ? "#8b5cf6" : "#10b981"} 
                    strokeWidth="3" 
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray="283"
                    strokeDashoffset="283"
                    animate={{ strokeDashoffset: 283 - (283 * (gaugeValue > 100 ? 100 : gaugeValue)) / 100 }}
                    transition={{ duration: 0.3 }}
                />
            </svg>

            {/* Center Button / Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                {status === "idle" || status === "complete" ? (
                    <button 
                        onClick={runTest}
                        className="group relative w-32 h-32 rounded-full bg-white/5 border border-white/10 flex flex-col items-center justify-center hover:bg-white/10 hover:scale-105 transition-all active:scale-95 shadow-2xl shadow-black/50"
                    >
                        {status === "complete" ? <RotateCcw size={32}/> : <Play size={32} className="ml-1"/>}
                    </button>
                ) : (
                    <div className="flex flex-col items-center">
                        <span className="text-5xl font-bold tracking-tighter">
                            {status === "download" ? results.download : status === "upload" ? results.upload : gaugeValue.toFixed(0)}
                        </span>
                        <span className="text-xs text-gray-500 font-mono mt-1">Mbps</span>
                    </div>
                )}
            </div>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-3 gap-3">
            <ResultBox label="Ping" val={results.ping} unit="ms" active={status === "ping"} />
            <ResultBox label="Download" val={results.download} unit="Mbps" active={status === "download"} />
            <ResultBox label="Upload" val={results.upload} unit="Mbps" active={status === "upload"} />
        </div>
      </div>
    </main>
  );
}

// Sub-component for grid boxes
function ResultBox({ label, val, unit, active }) {
    return (
        <div className={`rounded-xl p-4 flex flex-col items-center justify-center transition-all border ${active ? 'border-blue-500/50 bg-blue-500/10 scale-105' : 'border-white/5 bg-white/5'}`}>
            <div className="text-xl font-bold">
                {val} <span className="text-xs text-gray-500 font-normal">{unit}</span>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 mt-1">{label}</div>
        </div>
    )
}