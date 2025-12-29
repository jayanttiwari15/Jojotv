import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { ConnectionState, SystemState, LogMessage } from '../types';
import { base64ToUint8Array, arrayBufferToBase64, float32ToInt16, decodeAudioData } from '../utils/audioUtils';

// Tool Definitions
const controlPhoneTools: FunctionDeclaration[] = [
  {
    name: 'setBrightness',
    description: 'Adjust the screen brightness level.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        level: {
          type: Type.NUMBER,
          description: 'Brightness level from 0 to 100.',
        },
      },
      required: ['level'],
    },
  },
  {
    name: 'toggleFlashlight',
    description: 'Turn the flashlight on or off.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        state: {
          type: Type.BOOLEAN,
          description: 'True for ON, False for OFF.',
        },
      },
      required: ['state'],
    },
  },
  {
    name: 'toggleWifi',
    description: 'Enable or disable Wi-Fi.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        state: {
          type: Type.BOOLEAN,
          description: 'True for ON, False for OFF.',
        },
      },
      required: ['state'],
    },
  },
  {
    name: 'checkBattery',
    description: 'Get the current battery level.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'openApp',
    description: 'Open a specific application on the phone.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        appName: {
          type: Type.STRING,
          description: 'The name of the app to open (e.g., Settings, Maps, Camera, Spotify).',
        },
      },
      required: ['appName'],
    },
  },
  {
    name: 'goHome',
    description: 'Close current app and go back to the home screen.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
];

interface UseLiveSessionProps {
  systemState: SystemState;
  setSystemState: React.Dispatch<React.SetStateAction<SystemState>>;
}

export const useLiveSession = ({ systemState, setSystemState }: UseLiveSessionProps) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Refs for audio processing to avoid stale closures and re-renders
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Transcription Buffers
  const currentInputTranscription = useRef<string>('');
  const currentOutputTranscription = useRef<string>('');

  const addLog = (role: 'user' | 'model' | 'system', text: string) => {
    setLogs((prev) => [...prev, { role, text, timestamp: new Date() }]);
  };

  const executeTool = useCallback(async (name: string, args: any) => {
    addLog('system', `> Executing: ${name} (${JSON.stringify(args)})`);
    
    let result: any = { success: true };

    if (name === 'setBrightness') {
      setSystemState(prev => ({ ...prev, brightness: args.level }));
      result = { status: `Brightness set to ${args.level}%` };
    } else if (name === 'toggleFlashlight') {
      setSystemState(prev => ({ ...prev, flashlight: args.state }));
      result = { status: `Flashlight turned ${args.state ? 'ON' : 'OFF'}` };
    } else if (name === 'toggleWifi') {
      setSystemState(prev => ({ ...prev, wifi: args.state }));
      result = { status: `Wi-Fi turned ${args.state ? 'ON' : 'OFF'}` };
    } else if (name === 'checkBattery') {
       try {
         // @ts-ignore - Navigator.getBattery is not in all TS definitions
         if (navigator.getBattery) {
            // @ts-ignore
           const battery = await navigator.getBattery();
           result = { level: Math.round(battery.level * 100) };
         } else {
           result = { level: systemState.batteryLevel };
         }
       } catch (e) {
         result = { level: systemState.batteryLevel };
       }
    } else if (name === 'openApp') {
        setSystemState(prev => ({ ...prev, activeApp: args.appName }));
        result = { status: `Opened ${args.appName}` };
    } else if (name === 'goHome') {
        setSystemState(prev => ({ ...prev, activeApp: null }));
        result = { status: `Navigated to Home Screen` };
    }

    addLog('system', `< Completed: ${name} | Result: ${JSON.stringify(result)}`);
    return result;
  }, [setSystemState, systemState.batteryLevel]);

  const connect = useCallback(async () => {
    try {
      setErrorMessage(null);
      setConnectionState(ConnectionState.CONNECTING);
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // Audio Contexts
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // Resume audio context if suspended (browser requirement)
      if (outputCtx.state === 'suspended') {
        await outputCtx.resume();
      }
      
      audioContextRef.current = outputCtx;

      // Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 16000
      }});
      mediaStreamRef.current = stream;

      // Connect to Gemini Live
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `You are Jarvis, an advanced AI interface for this device. 
          You have direct control over hardware and applications.
          
          Capabilities:
          1. Change Settings: Brightness, Wifi, Flashlight.
          2. App Control: Open specific apps by name (e.g. "Open Maps", "Open Camera") or "Go Home".
          3. System Status: Check battery.

          Personality: efficient, robotic but helpful, brief. 
          When a user gives a command like "Open settings", execute the tool immediately and confirm briefly.
          If asked to be a specific character, adopt that persona while maintaining control of the phone.`,
          tools: [{ functionDeclarations: controlPhoneTools }],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setConnectionState(ConnectionState.CONNECTED);
            addLog('system', 'Link Established. System Online.');

            // Setup Audio Input Processing
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              // Calculate volume for visualizer
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              const rms = Math.sqrt(sum / inputData.length);
              setVolumeLevel(Math.min(rms * 5, 1)); // Scale for visualizer

              // Convert to PCM 16-bit
              const pcmData = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                 // Clamp and scale
                 const s = Math.max(-1, Math.min(1, inputData[i]));
                 pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
              }

              // Send to API
              const uint8Pcm = new Uint8Array(pcmData.buffer);
              const base64Data = arrayBufferToBase64(uint8Pcm.buffer);

              sessionPromise.then(session => {
                session.sendRealtimeInput({
                   media: {
                     mimeType: 'audio/pcm;rate=16000',
                     data: base64Data
                   }
                });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Transcriptions
            if (message.serverContent?.inputTranscription) {
                const text = message.serverContent.inputTranscription.text;
                currentInputTranscription.current += text;
            }
            if (message.serverContent?.outputTranscription) {
                const text = message.serverContent.outputTranscription.text;
                currentOutputTranscription.current += text;
            }
            if (message.serverContent?.turnComplete) {
                if (currentInputTranscription.current) {
                    addLog('user', currentInputTranscription.current);
                    currentInputTranscription.current = '';
                }
                if (currentOutputTranscription.current) {
                    addLog('model', currentOutputTranscription.current);
                    currentOutputTranscription.current = '';
                }
            }

            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputCtx) {
              const audioBytes = base64ToUint8Array(base64Audio);
              const audioBuffer = await decodeAudioData(audioBytes, outputCtx, 24000, 1);
              
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.start(nextStartTimeRef.current);
              
              nextStartTimeRef.current += audioBuffer.duration;
              audioSourcesRef.current.add(source);
              source.onended = () => audioSourcesRef.current.delete(source);
            }

            // Handle Interruptions
            if (message.serverContent?.interrupted) {
              addLog('system', 'Output Interrupted');
              audioSourcesRef.current.forEach(source => source.stop());
              audioSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }

            // Handle Function Calls
            if (message.toolCall) {
              const functionResponses: any[] = [];
              for (const fc of message.toolCall.functionCalls) {
                const result = await executeTool(fc.name, fc.args);
                functionResponses.push({
                  id: fc.id,
                  name: fc.name,
                  response: { result: result }
                });
              }
              
              sessionPromise.then(session => {
                session.sendToolResponse({ functionResponses });
              });
            }
          },
          onclose: () => {
             setConnectionState(ConnectionState.DISCONNECTED);
             addLog('system', 'Link Terminated.');
          },
          onerror: (err) => {
            console.error(err);
            setErrorMessage(`Network Error: ${err.message || 'Unknown error'}`);
            setConnectionState(ConnectionState.ERROR);
            addLog('system', `Error: ${err.message}`);
          }
        }
      });

      sessionRef.current = sessionPromise;

    } catch (error: any) {
      console.error("Connection failed", error);
      setErrorMessage(`Failed to initialize: ${error.message || 'Unknown error'}`);
      setConnectionState(ConnectionState.ERROR);
      addLog('system', `Init Error: ${error.message}`);
    }
  }, [executeTool]);

  const disconnect = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.then((session: any) => session.close());
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
    }
    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
        audioContextRef.current.close();
    }
    
    setConnectionState(ConnectionState.DISCONNECTED);
    setVolumeLevel(0);
  }, []);

  return {
    connectionState,
    connect,
    disconnect,
    logs,
    volumeLevel,
    errorMessage
  };
};