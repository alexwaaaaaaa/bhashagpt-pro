'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, User, Crown, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';
import NoSSR from '@/components/ui/no-ssr';

const ThemeToggleButton: React.FC = () => {
    const { theme, setTheme } = useTheme();
    
    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    const ThemeIcon = theme === 'dark' ? Sun : Moon;
    const themeText = theme === 'dark' ? 'Light' : 'Dark';

    return (
        <button
            onClick={toggleTheme}
            className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors min-w-0 flex-1 text-gray-400 hover:text-white"
            title={`Switch to ${themeText.toLowerCase()} mode`}
        >
            <ThemeIcon className="w-5 h-5" />
            <span className="text-xs font-medium truncate">
                {themeText}
            </span>
        </button>
    );
};

const BottomNav: React.FC = () => {
    const pathname = usePathname();

    const navigation = [
        { name: 'Home', href: '/', icon: Home },
        { name: 'Chat', href: '/chat', icon: MessageCircle },
        { name: 'Profile', href: '/profile', icon: User },
        { name: 'Pricing', href: '/pricing', icon: Crown },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-lg border-t border-gray-800 z-50">
            <div className="flex items-center justify-around py-2">
                {navigation.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                'flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors min-w-0 flex-1',
                                isActive
                                    ? 'text-blue-400'
                                    : 'text-gray-400 hover:text-white'
                            )}
                        >
                            <Icon className={cn(
                                'w-5 h-5',
                                isActive && 'text-blue-400'
                            )} />
                            <span className={cn(
                                'text-xs font-medium truncate',
                                isActive ? 'text-blue-400' : 'text-gray-400'
                            )}>
                                {item.name}
                            </span>
                            {isActive && (
                                <div className="w-1 h-1 bg-blue-400 rounded-full" />
                            )}
                        </Link>
                    );
                })}
                
                {/* Theme Toggle Button */}
                <NoSSR fallback={
                    <div className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg min-w-0 flex-1 text-gray-400">
                        <Sun className="w-5 h-5" />
                        <span className="text-xs font-medium truncate">Theme</span>
                    </div>
                }>
                    <ThemeToggleButton />
                </NoSSR>
            </div>
        </div>
    );
};

export default BottomNav;