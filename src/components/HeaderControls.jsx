import React, { useEffect, useState } from 'react';
import { Moon, Sun, Globe, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import NotificationCenter from './NotificationCenter';
import AIQueryAssistantModal from './AIQueryAssistantModal';

export default function HeaderControls() {
    const { i18n } = useTranslation();
    const [theme, setTheme] = useState('corporate-light');
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem('app-theme') || 'corporate-light';
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'corporate-light' ? 'premium-dark' : 'corporate-light';
        setTheme(newTheme);
        localStorage.setItem('app-theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'ar' : 'en';
        i18n.changeLanguage(newLang);
    };

    const isArabic = i18n.language === 'ar';

    return (
        <>
            <div className="absolute top-6 ltr:right-6 rtl:left-6 z-50 flex items-center gap-3">
                <button
                    onClick={() => setIsAiModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 shadow-sm text-xs font-bold text-white hover:opacity-95 transition"
                    title="AI Assistant — Experimental"
                >
                    <Sparkles size={14} className="text-amber-300 animate-pulse" />
                    <span>AI Assistant</span>
                </button>

                <NotificationCenter />

                <button
                    onClick={toggleLanguage}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    title="Toggle Language"
                >
                    <Globe size={16} />
                    {isArabic ? 'English' : 'عربي'}
                </button>

                <button
                    onClick={toggleTheme}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    title={`Switch to ${theme === 'corporate-light' ? 'Premium Dark' : 'Corporate Light'} Mode`}
                >
                    {theme === 'corporate-light' ? <Moon size={16} /> : <Sun size={16} />}
                </button>
            </div>

            <AIQueryAssistantModal
                isOpen={isAiModalOpen}
                onClose={() => setIsAiModalOpen(false)}
            />
        </>
    );
}

