'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    MessageCircle,
    User,
    Settings,
    CreditCard,
    BarChart3,
    LogOut,
    Home,
    Bot,
    Languages,
    Mic
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const pathname = usePathname();

    const menuItems = [
        { icon: Home, label: 'Dashboard', href: '/dashboard' },
        { icon: MessageCircle, label: 'Chat', href: '/chat' },
        { icon: Bot, label: 'AI Avatar', href: '/avatar' },
        { icon: Mic, label: 'Voice Practice', href: '/voice' },
        { icon: Languages, label: 'Translation', href: '/translate' },
        { icon: BarChart3, label: 'Progress', href: '/progress' },
        { icon: User, label: 'Profile', href: '/profile' },
        { icon: CreditCard, label: 'Subscription', href: '/pricing' },
        { icon: Settings, label: 'Settings', href: '/settings' },
    ];

    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <motion.aside
                initial={{ x: -300 }}
                animate={{ x: isOpen ? 0 : -300 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className={cn(
                    'fixed left-0 top-0 h-full w-64 bg-gray-900 border-r border-gray-800 z-50',
                    'lg:translate-x-0 lg:static lg:z-auto',
                    'flex flex-col'
                )}
            >
                {/* Logo */}
                <div className="p-6 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">BhashaGPT</h2>
                            <p className="text-xs text-gray-400">Pro Version</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4">
                    <ul className="space-y-2">
                        {menuItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        onClick={onClose}
                                        className={cn(
                                            'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                                            'hover:bg-gray-800 hover:text-white',
                                            isActive
                                                ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white border border-purple-500/30'
                                                : 'text-gray-400'
                                        )}
                                    >
                                        <item.icon className="w-5 h-5" />
                                        <span className="font-medium">{item.label}</span>
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeTab"
                                                className="ml-auto w-2 h-2 bg-purple-500 rounded-full"
                                            />
                                        )}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* User Section */}
                <div className="p-4 border-t border-gray-800">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-300" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-white">John Doe</p>
                            <p className="text-xs text-gray-400">Pro Member</p>
                        </div>
                    </div>
                    
                    <button className="flex items-center gap-3 w-full px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm">Sign Out</span>
                    </button>
                </div>
            </motion.aside>
        </>
    );
};

export default Sidebar;