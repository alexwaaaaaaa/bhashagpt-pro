export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    chatMessages: number; // -1 for unlimited
    voiceMinutes: number; // -1 for unlimited
    avatarVideos: number; // -1 for unlimited
    translationsPerDay: number; // -1 for unlimited
  };
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'canceled' | 'expired' | 'past_due';
  current_period_start: Date;
  current_period_end: Date;
  stripe_subscription_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UsageStats {
  chatMessages: number;
  voiceMinutes: number;
  avatarVideos: number;
  translationsToday: number;
  resetDate: Date;
}

export interface SubscriptionContextType {
  currentPlan: SubscriptionPlan | null;
  subscription: UserSubscription | null;
  usage: UsageStats;
  availablePlans: SubscriptionPlan[];
  isLoading: boolean;
  upgradePlan: (planId: string) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  getUsage: () => Promise<UsageStats>;
}