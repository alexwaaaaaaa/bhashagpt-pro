export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  preferred_languages: string[];
  learning_goals: string[];
  learning_level: 'beginner' | 'intermediate' | 'advanced';
  timezone: string;
  notification_preferences: NotificationPreferences;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  learning_reminders: boolean;
  weekly_progress: boolean;
  promotions: boolean;
  quiet_hours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
  };
}

export interface LearningStats {
  total_sessions: number;
  total_messages: number;
  total_voice_minutes: number;
  languages_practiced: string[];
  current_streak: number;
  longest_streak: number;
  last_activity: Date;
  weekly_goal: number;
  weekly_progress: number;
}

export interface UserContextType {
  profile: UserProfile | null;
  stats: LearningStats | null;
  isLoading: boolean;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  updateNotificationPreferences: (preferences: NotificationPreferences) => Promise<void>;
  getStats: () => Promise<LearningStats>;
}