'use client';

import React, { useState } from 'react';
import {
    User,
    Camera,
    Settings,
    Bell,
    Volume2,
    Globe,
    Crown,
    Trophy,
    Calendar,
    Clock,
    Target,
    Moon,
    Sun,
    LogOut,
    ChevronRight,
    Upload,
    Check,
    Star,
    Flame,
    Award,
    BarChart3,
    Languages,
    Headphones,
    Smartphone
} from 'lucide-react';

const ProfilePage = () => {
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [notifications, setNotifications] = useState({
        dailyReminders: true,
        weeklyProgress: true,
        achievements: true,
        promotions: false,
    });
    const [voiceSettings, setVoiceSettings] = useState({
        speed: 1.0,
        autoPlay: true,
        voice: 'female',
    });

    const userStats = {
        streak: 47,
        hoursLearned: 156,
        languagesMastered: 3,
        totalLessons: 234,
    };

    const languageProgress = [
        { name: 'English', flag: '🇺🇸', progress: 70, level: 'Learning' },
        { name: 'Hindi', flag: '🇮🇳', progress: 100, level: 'Native' },
        { name: 'Bengali', flag: '🇧🇩', progress: 25, level: 'Basic' },
        { name: 'Tamil', flag: '🇮🇳', progress: 15, level: 'Basic' },
    ];

    const achievements = [
        { id: 1, name: 'First Steps', description: 'Complete your first lesson', icon: '🎯', earned: true },
        { id: 2, name: 'Week Warrior', description: '7-day learning streak', icon: '🔥', earned: true },
        { id: 3, name: 'Polyglot', description: 'Learn 3 languages', icon: '🌍', earned: true },
        { id: 4, name: 'Speed Demon', description: 'Complete 10 lessons in a day', icon: '⚡', earned: false },
        { id: 5, name: 'Master', description: 'Reach advanced level', icon: '👑', earned: false },
        { id: 6, name: 'Perfectionist', description: 'Get 100% on 5 lessons', icon: '💎', earned: true },
    ];

    const ProgressCard = ({ title, value, subtitle, icon: Icon, color }: any) => (
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 hover:border-gray-600 transition-colors">
            <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold text-white">{value}</div>
                    <div className="text-sm text-gray-400">{subtitle}</div>
                </div>
            </div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
    );

    const SettingToggle = ({ label, description, checked, onChange }: any) => (
        <div className="flex items-center justify-between py-4">
            <div>
                <div className="text-white font-medium">{label}</div>
                <div className="text-sm text-gray-400">{description}</div>
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                    checked ? 'bg-blue-500' : 'bg-gray-600'
                }`}
            >
                <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        checked ? 'translate-x-7' : 'translate-x-1'
                    }`}
                />
            </button>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                        Profile & Settings
                    </h1>
                    <button className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors">
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                    </button>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left Column - Profile & Stats */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Profile Card */}
                        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                            <div className="text-center">
                                <div className="relative inline-block mb-4">
                                    <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-green-500 rounded-full flex items-center justify-center text-2xl font-bold">
                                        राज
                                    </div>
                                    <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors">
                                        <Camera className="w-4 h-4" />
                                    </button>
                                </div>
                                <h2 className="text-xl font-bold text-white mb-1">राज शर्मा</h2>
                                <p className="text-gray-400 mb-4">raj.sharma@example.com</p>
                                
                                {/* Subscription Status */}
                                <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 rounded-xl mb-4">
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <Crown className="w-5 h-5 text-yellow-400" />
                                        <span className="font-semibold">Pro Member</span>
                                    </div>
                                    <p className="text-sm opacity-90">Unlimited access to all features</p>
                                    <button className="mt-3 w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm">
                                        Manage Subscription
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <ProgressCard
                                title="Day Streak"
                                value={userStats.streak}
                                subtitle="days"
                                icon={Flame}
                                color="bg-orange-500"
                            />
                            <ProgressCard
                                title="Hours Learned"
                                value={userStats.hoursLearned}
                                subtitle="total"
                                icon={Clock}
                                color="bg-blue-500"
                            />
                            <ProgressCard
                                title="Languages"
                                value={userStats.languagesMastered}
                                subtitle="mastered"
                                icon={Globe}
                                color="bg-green-500"
                            />
                            <ProgressCard
                                title="Lessons"
                                value={userStats.totalLessons}
                                subtitle="completed"
                                icon={Target}
                                color="bg-purple-500"
                            />
                        </div>
                    </div>

                    {/* Right Column - Settings & Progress */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Language Progress */}
                        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                            <div className="flex items-center gap-3 mb-6">
                                <BarChart3 className="w-6 h-6 text-blue-400" />
                                <h3 className="text-xl font-bold text-white">Language Progress</h3>
                            </div>
                            <div className="space-y-4">
                                {languageProgress.map((lang, index) => (
                                    <div key={index} className="p-4 bg-gray-700 rounded-xl">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{lang.flag}</span>
                                                <div>
                                                    <div className="font-semibold text-white">{lang.name}</div>
                                                    <div className="text-sm text-gray-400">{lang.level}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-bold text-white">{lang.progress}%</div>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-600 rounded-full h-2">
                                            <div
                                                className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${lang.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Achievements */}
                        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                            <div className="flex items-center gap-3 mb-6">
                                <Trophy className="w-6 h-6 text-yellow-400" />
                                <h3 className="text-xl font-bold text-white">Achievements</h3>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {achievements.map((achievement) => (
                                    <div
                                        key={achievement.id}
                                        className={`p-4 rounded-xl border transition-all ${
                                            achievement.earned
                                                ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/50'
                                                : 'bg-gray-700 border-gray-600'
                                        }`}
                                    >
                                        <div className="text-center">
                                            <div className="text-3xl mb-2">{achievement.icon}</div>
                                            <div className="font-semibold text-white text-sm mb-1">
                                                {achievement.name}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {achievement.description}
                                            </div>
                                            {achievement.earned && (
                                                <div className="mt-2">
                                                    <Check className="w-4 h-4 text-green-400 mx-auto" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Settings Sections */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Language Preferences */}
                            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                                <div className="flex items-center gap-3 mb-6">
                                    <Languages className="w-6 h-6 text-purple-400" />
                                    <h3 className="text-xl font-bold text-white">Language Preferences</h3>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Interface Language
                                        </label>
                                        <select className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none">
                                            <option>हिन्दी (Hindi)</option>
                                            <option>English</option>
                                            <option>বাংলা (Bengali)</option>
                                            <option>தமிழ் (Tamil)</option>
                                            <option>తెలుగు (Telugu)</option>
                                            <option>ગુજરાતી (Gujarati)</option>
                                            <option>मराठी (Marathi)</option>
                                            <option>ಕನ್ನಡ (Kannada)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Learning Goal
                                        </label>
                                        <select className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none">
                                            <option>Casual (5 min/day)</option>
                                            <option>Regular (15 min/day)</option>
                                            <option>Serious (30 min/day)</option>
                                            <option>Intense (60 min/day)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Voice Settings */}
                            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                                <div className="flex items-center gap-3 mb-6">
                                    <Headphones className="w-6 h-6 text-blue-400" />
                                    <h3 className="text-xl font-bold text-white">Voice Settings</h3>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Voice Speed: {voiceSettings.speed}x
                                        </label>
                                        <input
                                            type="range"
                                            min="0.5"
                                            max="2"
                                            step="0.1"
                                            value={voiceSettings.speed}
                                            onChange={(e) => setVoiceSettings({
                                                ...voiceSettings,
                                                speed: parseFloat(e.target.value)
                                            })}
                                            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Voice Type
                                        </label>
                                        <select 
                                            value={voiceSettings.voice}
                                            onChange={(e) => setVoiceSettings({
                                                ...voiceSettings,
                                                voice: e.target.value
                                            })}
                                            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                                        >
                                            <option value="female">Female</option>
                                            <option value="male">Male</option>
                                        </select>
                                    </div>
                                    <SettingToggle
                                        label="Auto-play Audio"
                                        description="Automatically play pronunciation"
                                        checked={voiceSettings.autoPlay}
                                        onChange={(checked: boolean) => setVoiceSettings({
                                            ...voiceSettings,
                                            autoPlay: checked
                                        })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Notifications & Theme */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Notifications */}
                            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                                <div className="flex items-center gap-3 mb-6">
                                    <Bell className="w-6 h-6 text-green-400" />
                                    <h3 className="text-xl font-bold text-white">Notifications</h3>
                                </div>
                                <div className="space-y-2">
                                    <SettingToggle
                                        label="Daily Reminders"
                                        description="Get reminded to practice daily"
                                        checked={notifications.dailyReminders}
                                        onChange={(checked: boolean) => setNotifications({
                                            ...notifications,
                                            dailyReminders: checked
                                        })}
                                    />
                                    <SettingToggle
                                        label="Weekly Progress"
                                        description="Weekly progress reports"
                                        checked={notifications.weeklyProgress}
                                        onChange={(checked: boolean) => setNotifications({
                                            ...notifications,
                                            weeklyProgress: checked
                                        })}
                                    />
                                    <SettingToggle
                                        label="Achievements"
                                        description="New achievement notifications"
                                        checked={notifications.achievements}
                                        onChange={(checked: boolean) => setNotifications({
                                            ...notifications,
                                            achievements: checked
                                        })}
                                    />
                                    <SettingToggle
                                        label="Promotions"
                                        description="Special offers and updates"
                                        checked={notifications.promotions}
                                        onChange={(checked: boolean) => setNotifications({
                                            ...notifications,
                                            promotions: checked
                                        })}
                                    />
                                </div>
                            </div>

                            {/* Theme & Display */}
                            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                                <div className="flex items-center gap-3 mb-6">
                                    <Smartphone className="w-6 h-6 text-indigo-400" />
                                    <h3 className="text-xl font-bold text-white">Display</h3>
                                </div>
                                <div className="space-y-4">
                                    <SettingToggle
                                        label="Dark Mode"
                                        description="Use dark theme"
                                        checked={isDarkMode}
                                        onChange={setIsDarkMode}
                                    />
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Font Size
                                        </label>
                                        <select className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none">
                                            <option>Small</option>
                                            <option>Medium</option>
                                            <option>Large</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Animation Speed
                                        </label>
                                        <select className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none">
                                            <option>Slow</option>
                                            <option>Normal</option>
                                            <option>Fast</option>
                                            <option>Off</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;