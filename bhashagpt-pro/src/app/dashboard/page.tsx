'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    MessageCircle,
    Mic,
    Bot,
    Languages,
    TrendingUp,
    Clock,
    Target,
    Award,
    Calendar,
    BarChart3
} from 'lucide-react';
import Button from '@/components/ui/button';
import Card from '@/components/ui/card';

const Dashboard = () => {
    const stats = [
        {
            icon: MessageCircle,
            label: 'Messages Today',
            value: '24',
            change: '+12%',
            color: 'text-blue-500'
        },
        {
            icon: Mic,
            label: 'Voice Minutes',
            value: '45',
            change: '+8%',
            color: 'text-green-500'
        },
        {
            icon: Languages,
            label: 'Languages',
            value: '3',
            change: '+1',
            color: 'text-purple-500'
        },
        {
            icon: Award,
            label: 'Streak Days',
            value: '12',
            change: '+1',
            color: 'text-yellow-500'
        }
    ];

    const recentSessions = [
        {
            id: 1,
            language: 'Spanish',
            duration: '15 min',
            messages: 12,
            time: '2 hours ago',
            flag: '🇪🇸'
        },
        {
            id: 2,
            language: 'French',
            duration: '22 min',
            messages: 18,
            time: '5 hours ago',
            flag: '🇫🇷'
        },
        {
            id: 3,
            language: 'German',
            duration: '8 min',
            messages: 6,
            time: '1 day ago',
            flag: '🇩🇪'
        }
    ];

    const learningGoals = [
        { goal: 'Practice Spanish conversation', progress: 75, target: 'Daily' },
        { goal: 'Learn 50 new French words', progress: 60, target: 'Weekly' },
        { goal: 'Complete German basics', progress: 30, target: 'Monthly' }
    ];

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                    >
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                                Welcome back, John! 👋
                            </h1>
                            <p className="text-gray-400 mt-2">
                                Ready to continue your language learning journey?
                            </p>
                        </div>
                        <Button variant="primary" className="flex items-center gap-2">
                            <MessageCircle className="w-4 h-4" />
                            Start New Chat
                        </Button>
                    </motion.div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-400 text-sm">{stat.label}</p>
                                        <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                                        <p className={`text-sm mt-1 ${stat.color}`}>{stat.change}</p>
                                    </div>
                                    <div className={`p-3 rounded-lg bg-gray-800 ${stat.color}`}>
                                        <stat.icon className="w-6 h-6" />
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Recent Sessions */}
                    <div className="lg:col-span-2">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <Card className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-semibold text-white">Recent Sessions</h2>
                                    <Button variant="ghost" size="sm">
                                        View All
                                    </Button>
                                </div>
                                <div className="space-y-4">
                                    {recentSessions.map((session) => (
                                        <div
                                            key={session.id}
                                            className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <span className="text-2xl">{session.flag}</span>
                                                <div>
                                                    <h3 className="font-medium text-white">{session.language}</h3>
                                                    <p className="text-sm text-gray-400">
                                                        {session.messages} messages • {session.duration}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-gray-400">{session.time}</p>
                                                <Button variant="ghost" size="sm" className="mt-1">
                                                    Continue
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </motion.div>
                    </div>

                    {/* Learning Goals */}
                    <div>
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <Card className="p-6">
                                <div className="flex items-center gap-2 mb-6">
                                    <Target className="w-5 h-5 text-purple-400" />
                                    <h2 className="text-xl font-semibold text-white">Learning Goals</h2>
                                </div>
                                <div className="space-y-6">
                                    {learningGoals.map((goal, index) => (
                                        <div key={index}>
                                            <div className="flex justify-between items-center mb-2">
                                                <p className="text-sm text-white font-medium">{goal.goal}</p>
                                                <span className="text-xs text-gray-400">{goal.target}</span>
                                            </div>
                                            <div className="w-full bg-gray-700 rounded-full h-2">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${goal.progress}%` }}
                                                    transition={{ delay: 0.5 + index * 0.1, duration: 0.8 }}
                                                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full"
                                                />
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">{goal.progress}% complete</p>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </motion.div>
                    </div>
                </div>

                {/* Quick Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8"
                >
                    <Card className="p-6">
                        <h2 className="text-xl font-semibold text-white mb-6">Quick Actions</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { icon: MessageCircle, label: 'Start Chat', color: 'from-blue-500 to-cyan-500' },
                                { icon: Mic, label: 'Voice Practice', color: 'from-green-500 to-emerald-500' },
                                { icon: Bot, label: 'AI Avatar', color: 'from-purple-500 to-pink-500' },
                                { icon: BarChart3, label: 'View Progress', color: 'from-orange-500 to-red-500' }
                            ].map((action) => (
                                <Button
                                    key={action.label}
                                    variant="outline"
                                    className="h-20 flex-col gap-2 hover:scale-105 transition-transform"
                                >
                                    <div className={`p-2 rounded-lg bg-gradient-to-r ${action.color}`}>
                                        <action.icon className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="text-sm">{action.label}</span>
                                </Button>
                            ))}
                        </div>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
};

export default Dashboard;