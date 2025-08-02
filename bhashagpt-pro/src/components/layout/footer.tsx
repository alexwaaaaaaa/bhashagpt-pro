'use client';

import React from 'react';
import Link from 'next/link';
import { Bot, Globe, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-gray-900 border-t border-gray-800 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand Section */}
                    <div className="md:col-span-1">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                                <Bot className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xl font-bold">BhashaGPT Pro</span>
                        </div>
                        <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                            The future of language learning with AI-powered conversations, 
                            voice interaction, and personalized tutoring.
                        </p>
                        <div className="flex gap-4">
                            {['Twitter', 'Facebook', 'Instagram', 'LinkedIn', 'YouTube'].map((social) => (
                                <button
                                    key={social}
                                    className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center transition-colors duration-200"
                                    aria-label={`Follow us on ${social}`}
                                >
                                    <Globe className="w-4 h-4 text-gray-400" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Product Links */}
                    <div>
                        <h3 className="font-semibold text-white mb-4">Product</h3>
                        <ul className="space-y-3">
                            {[
                                { label: 'Features', href: '/#features' },
                                { label: 'Pricing', href: '/pricing' },
                                { label: 'AI Tutors', href: '/tutors' },
                                { label: 'Languages', href: '/languages' },
                                { label: 'Mobile App', href: '/download' },
                                { label: 'API Access', href: '/api' },
                            ].map((item) => (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
                                    >
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Company Links */}
                    <div>
                        <h3 className="font-semibold text-white mb-4">Company</h3>
                        <ul className="space-y-3">
                            {[
                                { label: 'About Us', href: '/about' },
                                { label: 'Blog', href: '/blog' },
                                { label: 'Careers', href: '/careers' },
                                { label: 'Press Kit', href: '/press' },
                                { label: 'Partners', href: '/partners' },
                                { label: 'Contact', href: '/contact' },
                            ].map((item) => (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
                                    >
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Support & Contact */}
                    <div>
                        <h3 className="font-semibold text-white mb-4">Support</h3>
                        <ul className="space-y-3 mb-6">
                            {[
                                { label: 'Help Center', href: '/help' },
                                { label: 'Community', href: '/community' },
                                { label: 'Tutorials', href: '/tutorials' },
                                { label: 'System Status', href: '/status' },
                                { label: 'Bug Reports', href: '/bugs' },
                            ].map((item) => (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
                                    >
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>

                        {/* Contact Info */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Mail className="w-4 h-4" />
                                <span>support@bhashagpt.com</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Phone className="w-4 h-4" />
                                <span>+1 (555) 123-4567</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <MapPin className="w-4 h-4" />
                                <span>San Francisco, CA</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="mt-12 pt-8 border-t border-gray-800">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="text-sm text-gray-400">
                            © {currentYear} BhashaGPT Pro. All rights reserved.
                        </div>
                        
                        <div className="flex flex-wrap gap-6 text-sm">
                            <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                                Privacy Policy
                            </Link>
                            <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                                Terms of Service
                            </Link>
                            <Link href="/cookies" className="text-gray-400 hover:text-white transition-colors">
                                Cookie Policy
                            </Link>
                            <Link href="/gdpr" className="text-gray-400 hover:text-white transition-colors">
                                GDPR
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;