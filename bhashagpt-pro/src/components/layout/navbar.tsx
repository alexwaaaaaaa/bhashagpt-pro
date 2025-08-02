'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    Bot,
    Menu,
    X,
    MessageCircle,
    User,
    Settings,
    LogOut,
    Crown,
    Moon,
    Sun,
    Monitor
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';
import Button from '@/components/ui/button';
import NoSSR from '@/components/ui/no-ssr';

// Hydration-safe theme toggle component
const ThemeToggle: React.FC = () => {
    const { theme, setTheme } = useTheme();

    return (
        <NoSSR fallback={<div className="hidden md:flex w-20 h-10" />}>
            <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="hidden md:flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
                {theme === 'dark' ? (
                    <Sun className="w-4 h-4 text-yellow-400" />
                ) : (
                    <Moon className="w-4 h-4 text-blue-400" />
                )}
                <span className="text-sm text-white">
                    {theme === 'dark' ? 'Light' : 'Dark'}
                </span>
            </button>
        </NoSSR>
    );
};

const Navbar: React.FC = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const { user, isAuthenticated, logout } = useAuth();
    const pathname = usePathname();

    const navigation = [
        { name: 'Home', href: '/', icon: Bot },
        { name: 'Chat', href: '/chat', icon: MessageCircle },
        { name: 'Profile', href: '/profile', icon: User },
        { name: 'Pricing', href: '/pricing', icon: Crown },
    ];

    const handleLogout = async () => {
        try {
            await logout();
            setIsProfileMenuOpen(false);
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <nav className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-lg border-b border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-white">BhashaGPT Pro</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-8">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;

                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                        isActive
                                            ? 'text-white bg-gray-800'
                                            : 'text-gray-300 hover:text-white hover:bg-gray-800'
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center gap-4">
                        {/* Desktop Theme Toggle */}
                        <ThemeToggle />

                        {isAuthenticated ? (
                            <div className="relative">
                                <button
                                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800 transition-colors"
                                >
                                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                                        <span className="text-sm font-semibold text-white">
                                            {user?.name?.charAt(0) || 'U'}
                                        </span>
                                    </div>
                                    <span className="hidden sm:block text-sm text-white">
                                        {user?.name}
                                    </span>
                                </button>

                                {/* Profile Dropdown */}
                                {isProfileMenuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg border border-gray-700 shadow-xl"
                                    >
                                        <div className="p-2">
                                            <Link
                                                href="/profile"
                                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg"
                                                onClick={() => setIsProfileMenuOpen(false)}
                                            >
                                                <User className="w-4 h-4" />
                                                Profile
                                            </Link>
                                            <Link
                                                href="/settings"
                                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg"
                                                onClick={() => setIsProfileMenuOpen(false)}
                                            >
                                                <Settings className="w-4 h-4" />
                                                Settings
                                            </Link>
                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                Logout
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Link href="/auth/login">
                                    <Button variant="ghost" size="sm">
                                        Login
                                    </Button>
                                </Link>
                                <Link href="/auth/register">
                                    <Button variant="primary" size="sm">
                                        Sign Up
                                    </Button>
                                </Link>
                            </div>
                        )}

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden p-2 rounded-lg hover:bg-gray-800 transition-colors border border-gray-700"
                            aria-label="Toggle mobile menu"
                        >
                            {isMobileMenuOpen ? (
                                <X className="w-6 h-6 text-white" />
                            ) : (
                                <Menu className="w-6 h-6 text-white" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                <motion.div
                    initial={false}
                    animate={{
                        height: isMobileMenuOpen ? 'auto' : 0,
                        opacity: isMobileMenuOpen ? 1 : 0,
                    }}
                    transition={{ duration: 0.2 }}
                    className="md:hidden overflow-hidden border-t border-gray-800"
                >
                    <div className="py-4 space-y-2">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;

                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        'flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors w-full',
                                        isActive
                                            ? 'text-white bg-gray-800 border-l-4 border-blue-500'
                                            : 'text-gray-300 hover:text-white hover:bg-gray-800'
                                    )}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <Icon className="w-5 h-5" />
                                    {item.name}
                                </Link>
                            );
                        })}
                        
                        {/* Mobile Auth Section */}
                        {!isAuthenticated && (
                            <div className="pt-4 border-t border-gray-700 mt-4 space-y-2">
                                <Link
                                    href="/auth/login"
                                    className="flex items-center justify-center px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Login
                                </Link>
                                <Link
                                    href="/auth/register"
                                    className="flex items-center justify-center px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Sign Up
                                </Link>
                            </div>
                        )}
                        
                        {/* Mobile User Menu */}
                        {isAuthenticated && (
                            <div className="pt-4 border-t border-gray-700 mt-4 space-y-2">
                                <div className="flex items-center gap-3 px-4 py-2 text-white">
                                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                                        <span className="text-sm font-semibold">
                                            {user?.name?.charAt(0) || 'U'}
                                        </span>
                                    </div>
                                    <span className="text-sm">{user?.name}</span>
                                </div>
                                <Link
                                    href="/settings"
                                    className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <Settings className="w-5 h-5" />
                                    Settings
                                </Link>
                                <button
                                    onClick={() => {
                                        handleLogout();
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors w-full text-left"
                                >
                                    <LogOut className="w-5 h-5" />
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </nav>
    );
};

export default Navbar;