import React, { useState, useEffect, useRef } from 'react';
import { useLiveSession } from './hooks/useLiveSession';
import { ConnectionState, SystemState } from './types';
import Visualizer from './components/Visualizer';
import PhoneUI from './components/PhoneUI';
import { Mic, MicOff, AlertCircle, Download } from 'lucide-react';

const App: React.FC = () => {
  // Initial Simulated Phone State
  const [systemState, setSystemState] = useState<SystemState>({
    brightness: 100,
    flashlight: false,
    batteryLevel: 84,
    wifi: true,
    bluetooth: true,
    volume: 50,
    activeApp: null,
  });

  const { connectionState, connect, disconnect, logs, volumeLevel, errorMessage } = useLiveSession({ 
    systemState, 
    setSystemState 
  });

  const logsEndRef = useRef<HTMLDivElement>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Handle PWA Install Prompt
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        setInstallPrompt(null);
      }
    });
  };

  const handleToggleConnection = () => {
    if (connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) {
      disconnect();
    } else {
      connect();
    }
  };

  return (
    // Updated container: p-0 on mobile, p-4 on desktop
    <div className="min-h-screen bg-black flex items-center justify-center p-0 md:p-4 font-sans">
      
      {/* Help / Commands Side Panel (Desktop Only) */}
      <div className="fixed top-4 left-4 text-gray-500 text-xs hidden md:block z-50">
         <h3 className="font-bold text-gray-300 mb-2">VOICE COMMANDS</h3>
         <ul className="space-y-1 font-mono">
            <li>"Turn on flashlight"</li>
            <li>"Set brightness to 50%"</li>
            <li>"Open Maps"</li>
            <li>"Open Settings"</li>
            <li>"Go Home"</li>
         </ul>
      </div>

      <PhoneUI 
        systemState={systemState}
        visualizer={<Visualizer volume={volumeLevel} state={connectionState} />}
      >
        {/* Controls Overlay Content */}
        <div className="flex flex-col gap-2">
            
            {/* Header info (Compact) */}
            <div className="flex justify-between items-center px-2 mb-1">
                <span className="text-[10px] text-cyan-500 font-tech tracking-wider uppercase">
                   {connectionState === ConnectionState.CONNECTED ? 'JARVIS // ONLINE' : 'JARVIS // OFFLINE'}
                </span>
                
                {/* Install Button (Visible only if installable) */}
                {installPrompt && (
                  <button 
                    onClick={handleInstallClick}
                    className="flex items-center gap-1 text-[10px] bg-white/10 px-2 py-1 rounded-full text-white animate-pulse border border-white/20"
                  >
                    <Download size={10} /> Install App
                  </button>
                )}
            </div>

            {/* Error Message */}
            {errorMessage && (
                <div className="bg-red-900/80 border border-red-500 text-white text-[10px] p-2 rounded mb-2">
                    <AlertCircle size={12} className="inline mr-1"/> {errorMessage}
                </div>
            )}

            {/* Conversation Log (Transparent Terminal) */}
            <div className="h-48 overflow-y-auto scrollbar-hide flex flex-col gap-2 mask-gradient-top px-1 transition-all duration-300">
              {logs.length === 0 && (
                <div className="text-gray-500 italic text-center text-[10px] mt-20">System Ready. Initialize voice link.</div>
              )}
              {logs.slice(-50).map((log, index) => {
                  const isSystem = log.role === 'system';
                  const isUser = log.role === 'user';
                  
                  return (
                    <div key={index} className={`flex ${
                        isUser ? 'justify-end' : 
                        isSystem ? 'justify-center my-0.5' : 
                        'justify-start'
                    }`}>
                      <span className={`px-3 py-1.5 backdrop-blur-md border transition-all duration-300 ${
                        isUser 
                          ? 'bg-blue-600/20 text-blue-100 border-blue-500/30 rounded-2xl rounded-tr-none max-w-[85%] text-[11px]' 
                          : isSystem
                            ? 'bg-gray-900/40 text-emerald-400/90 border-emerald-500/10 rounded-sm text-[9px] font-mono tracking-wide py-0.5 px-2 w-full text-center'
                            : 'bg-cyan-600/20 text-cyan-100 border-cyan-500/30 rounded-2xl rounded-tl-none max-w-[85%] text-[11px]'
                      }`}>
                         {isSystem && <span className="mr-2 opacity-50">&gt;</span>}
                         {log.text}
                      </span>
                    </div>
                  );
              })}
              <div ref={logsEndRef} />
            </div>

            {/* Mic Button (Floating Action) */}
            <div className="flex justify-center items-center mt-2">
                <button 
                    onClick={handleToggleConnection}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg border backdrop-blur-md ${
                        connectionState === ConnectionState.CONNECTED 
                        ? 'border-red-500 bg-red-500/20 hover:bg-red-500/30 text-red-100 shadow-red-500/30 animate-pulse-slow' 
                        : connectionState === ConnectionState.CONNECTING
                            ? 'border-yellow-500 bg-yellow-500/20 text-yellow-100 animate-spin-slow'
                            : 'border-cyan-500 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-100 shadow-cyan-500/30'
                    }`}
                >
                    {connectionState === ConnectionState.CONNECTED ? (
                        <div className="relative">
                            <MicOff size={20} />
                            <span className="absolute -top-1 -right-1 flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                        </div>
                    ) : (
                        <Mic size={20} />
                    )}
                </button>
            </div>
        </div>

      </PhoneUI>
      
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
        .mask-gradient-top {
            mask-image: linear-gradient(to bottom, transparent, black 10%);
        }
        @keyframes pulse-slow {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        .animate-pulse-slow {
            animation: pulse-slow 3s infinite;
        }
        /* Handle Safe Area for newer iPhones */
        .pb-safe-area {
            padding-bottom: env(safe-area-inset-bottom, 20px);
        }
      `}</style>
    </div>
  );
};

export default App;