export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  preferred_languages: string[];
  learning_goals: string[];
  subscription_tier: 'free' | 'pro';
  subscription_expires_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  confirmPassword: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}