import React from 'react';
import { SystemState } from '../types';
import { Wifi, Bluetooth, Battery, Sun, Zap, Grid, Map, Camera, Settings, MessageSquare, Music, Chrome, Mail } from 'lucide-react';

interface PhoneUIProps {
  systemState: SystemState;
  visualizer: React.ReactNode;
  children: React.ReactNode;
}

const PhoneUI: React.FC<PhoneUIProps> = ({ systemState, visualizer, children }) => {
  const AppIcon = ({ icon: Icon, name, color }: { icon: any, name: string, color: string }) => (
    <div className="flex flex-col items-center gap-2 group cursor-default backdrop-blur-sm p-2 rounded-xl hover:bg-white/5 transition-colors">
      <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform`}>
        <Icon size={28} />
      </div>
      <span className="text-[10px] text-white font-medium tracking-wide shadow-black drop-shadow-md">{name}</span>
    </div>
  );

  return (
    // Responsive Container:
    // Mobile: fixed full screen (inset-0), no border, no radius.
    // Desktop (md): specific width/height, rounded corners, simulated bezel.
    <div className="relative overflow-hidden bg-black shadow-2xl flex flex-col select-none
                    w-full h-[100dvh] fixed inset-0
                    md:static md:w-full md:h-[800px] md:max-w-[380px] md:mx-auto md:rounded-[3rem] 
                    md:border-[8px] md:border-gray-800 md:ring-1 md:ring-gray-700">
      
      {/* --- LAYER 0: BACKGROUND VISUALIZER (Jarvis) --- */}
      <div className="absolute inset-0 z-0">
         {visualizer}
         {/* Vignette for better visibility of overlays */}
         <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none"></div>
      </div>

      {/* --- OVERLAYS: Flashlight & Brightness --- */}
      {systemState.flashlight && (
        <div className="absolute inset-0 z-50 bg-white opacity-90 pointer-events-none transition-opacity duration-300 mix-blend-hard-light"></div>
      )}
      <div 
        className="absolute inset-0 z-40 bg-black pointer-events-none transition-opacity duration-100"
        style={{ opacity: 1 - (systemState.brightness / 100) }}
      ></div>

      {/* --- SYSTEM UI: Notch & Status Bar --- */}
      
      {/* Fake Notch - Only visible on Desktop to simulate phone */}
      <div className="hidden md:flex absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-7 bg-black rounded-b-2xl z-50 justify-center items-center">
        <div className="w-16 h-1 bg-gray-900/50 rounded-full"></div>
      </div>

      {/* Status Bar - Visible on both, but adjusted for mobile safe areas */}
      <div className="relative z-30 h-12 pt-2 md:h-10 md:pt-2 flex items-center justify-between px-6 text-xs font-medium text-white shadow-black drop-shadow-md mt-2 md:mt-0">
        <div className="flex items-center gap-2">
            <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="flex items-center gap-2">
            <Wifi size={14} className={systemState.wifi ? "text-white" : "text-gray-600"} />
            <Bluetooth size={14} className={systemState.bluetooth ? "text-white" : "text-gray-600"} />
            <Battery size={16} className={systemState.batteryLevel < 20 ? "text-red-500" : "text-white"} />
        </div>
      </div>

      {/* --- LAYER 1: APP CONTENT --- */}
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
        
        {/* Active App View */}
        {systemState.activeApp ? (
          <div className="absolute inset-0 z-20 flex flex-col animate-in slide-in-from-bottom duration-300">
             {/* Semi-transparent background to see Jarvis working behind */}
             <div className="absolute inset-0 bg-gray-900/85 backdrop-blur-md"></div>
             
             {/* App Header */}
             <div className="relative z-30 h-16 flex items-end pb-3 px-6 border-b border-white/10">
               <h2 className="text-xl font-bold text-white tracking-tight">{systemState.activeApp}</h2>
            </div>
            
            {/* Simulated App Content */}
            <div className="relative z-30 flex-1 p-6 flex items-center justify-center text-gray-400 flex-col gap-4">
               {systemState.activeApp.toLowerCase().includes('map') && <Map size={64} className="text-green-500"/>}
               {systemState.activeApp.toLowerCase().includes('setting') && <Settings size={64} className="text-gray-400"/>}
               {systemState.activeApp.toLowerCase().includes('camera') && <Camera size={64} className="text-blue-400"/>}
               {!['map','setting','camera'].some(k => systemState.activeApp?.toLowerCase().includes(k)) && <Grid size={64} className="opacity-50"/>}
               
               <p className="text-center font-mono text-sm">
                 {systemState.activeApp} is running...
               </p>
               <button className="mt-8 px-4 py-2 rounded-full border border-white/20 text-xs hover:bg-white/10">
                 System Active in Background
               </button>
            </div>
          </div>
        ) : (
          /* Home Screen Layout */
          <div className="flex-1 flex flex-col p-6 pt-20 z-10">
             {/* Spacer to push icons down, exposing the Face */}
             <div className="flex-1"></div>

             {/* App Grid */}
             <div className="grid grid-cols-4 gap-y-6 gap-x-2 mb-4">
                <AppIcon icon={MessageSquare} name="Messages" color="bg-green-500" />
                <AppIcon icon={Map} name="Maps" color="bg-blue-500" />
                <AppIcon icon={Chrome} name="Browser" color="bg-yellow-500" />
                <AppIcon icon={Music} name="Music" color="bg-pink-500" />
                <AppIcon icon={Mail} name="Mail" color="bg-blue-400" />
                <AppIcon icon={Camera} name="Camera" color="bg-gray-700" />
                <AppIcon icon={Settings} name="Settings" color="bg-gray-600" />
            </div>
            
            {/* Dock */}
             <div className="mx-2 h-20 bg-gray-900/40 backdrop-blur-xl rounded-[2rem] flex items-center justify-around px-4 border border-white/5 shadow-2xl">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white"><Grid size={24}/></div>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white"><Chrome size={24}/></div>
                <div className="w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center text-white"><Settings size={24}/></div>
                <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center text-white"><Music size={24}/></div>
             </div>
          </div>
        )}

      </div>
      
      {/* --- LAYER 2: SYSTEM OVERLAY (Controls) --- */}
      {/* This ensures the mic and logs are always visible "on top" of everything */}
      <div className="absolute bottom-0 left-0 right-0 z-40 pointer-events-none pb-safe-area">
          <div className="pointer-events-auto p-4 pb-8 md:pb-8 bg-gradient-to-t from-black via-black/90 to-transparent">
              {children}
          </div>
      </div>

      {/* Home Indicator - Visible on Desktop, hidden or adjusted on Mobile */}
      <div className="hidden md:block absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-white rounded-full z-50 opacity-40"></div>
    </div>
  );
};

export default PhoneUI;