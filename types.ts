export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface SystemState {
  brightness: number; // 0 to 100
  flashlight: boolean;
  batteryLevel: number;
  wifi: boolean;
  bluetooth: boolean;
  volume: number;
  activeApp: string | null; // Name of the open app, or null for home screen
}

export interface LogMessage {
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: Date;
}