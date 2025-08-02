export interface AvatarConfig {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  gender: 'male' | 'female';
  age: 'young' | 'middle' | 'senior';
  ethnicity: string;
  language: string[];
  emotions: string[];
}

export interface AvatarVideo {
  id: string;
  status: 'created' | 'processing' | 'done' | 'error';
  result_url?: string;
  error?: string;
  created_at: string;
  metadata?: {
    duration?: number;
    size?: number;
    format?: string;
  };
}

export interface VideoGenerationRequest {
  text: string;
  avatarId: string;
  voice?: {
    type: 'text' | 'audio';
    voice_id?: string;
    language?: string;
    style?: string;
  };
  config?: {
    fluent?: boolean;
    pad_audio?: number;
    stitch?: boolean;
    result_format?: 'mp4' | 'gif' | 'mov';
  };
  emotion?: string;
  mobile?: boolean;
}

export interface EmotionAnalysis {
  text: string;
  detectedEmotion: string;
  confidence: number;
  suggestions: string[];
}

export interface AvatarState {
  selectedAvatar: AvatarConfig | null;
  availableAvatars: AvatarConfig[];
  currentVideo: AvatarVideo | null;
  isGenerating: boolean;
  isPlaying: boolean;
  progress: number;
  error: string | null;
}

export interface AvatarContextType {
  selectedAvatar: AvatarConfig | null;
  availableAvatars: AvatarConfig[];
  currentVideo: AvatarVideo | null;
  isGenerating: boolean;
  isPlaying: boolean;
  progress: number;
  error: string | null;
  selectAvatar: (avatar: AvatarConfig) => void;
  generateVideo: (request: VideoGenerationRequest) => Promise<AvatarVideo>;
  checkVideoStatus: (videoId: string) => Promise<AvatarVideo>;
  streamVideoProgress: (videoId: string, onProgress: (data: any) => void) => void;
  playVideo: (video: AvatarVideo) => Promise<void>;
  stopVideo: () => void;
  generateTextToSpeech: (text: string, voice?: string) => Promise<string>;
  analyzeEmotion: (text: string) => Promise<EmotionAnalysis>;
  clearError: () => void;
}

export interface VideoAnalytics {
  totalVideos: number;
  averagePerDay: number;
  usageByDay: Array<{
    date: Date;
    count: number;
  }>;
}