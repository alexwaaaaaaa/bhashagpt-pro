export interface Message {
  id: string;
  content: string;
  translatedContent?: string;
  isUser: boolean;
  timestamp: Date;
  isVoice?: boolean;
  audioUrl?: string;
  avatarVideoUrl?: string;
  language?: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  language: string;
  messages: Message[];
  created_at: Date;
  updated_at: Date;
}

export interface ChatState {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  isLoading: boolean;
  isTyping: boolean;
}

export interface ChatContextType {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  isLoading: boolean;
  isTyping: boolean;
  createSession: (language: string, title?: string) => Promise<ChatSession>;
  sendMessage: (content: string, sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  setCurrentSession: (session: ChatSession | null) => void;
}