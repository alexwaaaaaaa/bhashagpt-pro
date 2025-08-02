export interface VoiceSettings {
  language: string;
  voice: string;
  speed: number;
  pitch: number;
  volume: number;
}

export interface VoiceRecording {
  id: string;
  audioBlob: Blob;
  duration: number;
  transcript?: string;
  language?: string;
  timestamp: Date;
}

export interface VoiceState {
  isRecording: boolean;
  isPlaying: boolean;
  recordings: VoiceRecording[];
  settings: VoiceSettings;
  isTranscribing: boolean;
  isSynthesizing: boolean;
}

export interface VoiceContextType {
  isRecording: boolean;
  isPlaying: boolean;
  recordings: VoiceRecording[];
  settings: VoiceSettings;
  isTranscribing: boolean;
  isSynthesizing: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<VoiceRecording>;
  playAudio: (audioUrl: string) => Promise<void>;
  transcribeAudio: (audioBlob: Blob) => Promise<string>;
  synthesizeSpeech: (text: string, settings?: Partial<VoiceSettings>) => Promise<string>;
  updateSettings: (settings: Partial<VoiceSettings>) => void;
}