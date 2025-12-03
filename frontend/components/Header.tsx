import React, { useState } from 'react';
import { Tab } from '../types';

interface HeaderProps {
    balance: number;
    streak: number;
    currentTab: Tab;
    onTabChange: (tab: Tab) => void;
    walletConnected: boolean;
    onToggleWallet: () => void;
    isDarkMode: boolean;
    toggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
    balance, 
    streak,
    currentTab, 
    onTabChange, 
    walletConnected, 
    onToggleWallet,
    isDarkMode,
    toggleTheme
}) => {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const navItems = Object.values(Tab);
    const isStreakBonusActive = streak >= 5;

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-40 bg-theme-base border-b-2 border-theme-border transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onTabChange(Tab.LIVE)}>
                        <div className="w-10 h-10 bg-koi-lime border-2 border-theme-border shadow-neo-sm flex items-center justify-center text-black font-black text-xl group-hover:animate-bounce">
                            ⚡
                        </div>
                        <h1 className="text-2xl font-black italic tracking-tighter hidden sm:block">
                            <span className="text-theme-text">ZEITGEIST</span>
                            <span className="text-koi-lime ml-1 text-stroke-sm">ROUNDS</span>
                        </h1>
                    </div>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex gap-4">
                        {navItems.map((tab) => (
                            <button
                                key={tab}
                                onClick={() => onTabChange(tab)}
                                className={`px-4 py-2 font-bold text-sm border-2 transition-all duration-200 neo-button ${
                                    currentTab === tab 
                                    ? 'bg-theme-text text-theme-base border-theme-border shadow-neo-sm' 
                                    : 'bg-theme-base text-theme-text border-transparent hover:border-theme-border/50'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </nav>

                    {/* Wallet & Stats */}
                    <div className="flex items-center gap-4">
                        {/* Streak Indicator */}
                        <div className={`
                            hidden sm:flex items-center gap-2 px-3 py-1 rounded border-2 border-theme-border
                            ${isStreakBonusActive ? 'bg-orange-500 text-black animate-pulse' : 'bg-theme-surface text-theme-text'}
                        `}>
                            <span className="text-lg">🔥</span>
                            <div className="flex flex-col leading-none">
                                <span className="font-black text-sm">{streak}</span>
                                <span className="text-[9px] font-bold uppercase tracking-tighter">
                                    {isStreakBonusActive ? 'BONUS ACTIVE' : 'STREAK'}
                                </span>
                            </div>
                        </div>

                        {/* Theme Toggle */}
                        <button 
                            onClick={toggleTheme}
                            className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-theme-border hover:bg-theme-surface transition-colors"
                            aria-label="Toggle Dark Mode"
                        >
                            {isDarkMode ? '☀️' : '🌙'}
                        </button>

                        {walletConnected && (
                            <div className="hidden sm:flex flex-col items-end mr-2 bg-theme-surface px-3 py-1 rounded border border-theme-border">
                                <span className="text-[10px] text-gray-500 uppercase font-mono tracking-wider">Balance</span>
                                <span className="text-sm font-bold text-koi-lime font-mono drop-shadow-sm filter stroke-black">{balance.toFixed(2)} SOL</span>
                            </div>
                        )}
                        
                        <button 
                            onClick={onToggleWallet}
                            className={`
                                px-4 py-2 font-bold text-sm neo-button
                                ${walletConnected 
                                    ? 'bg-theme-surface text-theme-text border-theme-border shadow-neo-sm' 
                                    : 'bg-koi-lime text-black border-theme-border shadow-neo-sm'
                                }
                            `}
                        >
                            {walletConnected ? '8x7k...Pm2Q' : 'Connect Wallet'}
                        </button>

                        {/* Mobile Menu Toggle */}
                        <button 
                            className="md:hidden w-10 h-10 bg-theme-surface text-theme-text border-2 border-theme-border flex items-center justify-center shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                            onClick={() => setIsDrawerOpen(true)}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                                <path strokeLinecap="square" strokeLinejoin="miter" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Drawer Overlay */}
            {isDrawerOpen && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => setIsDrawerOpen(false)}
                    />
                    
                    {/* Drawer Content */}
                    <div className="relative w-[85%] max-w-sm h-full bg-theme-base border-l-4 border-theme-border shadow-[-10px_0_30px_rgba(0,0,0,0.5)] flex flex-col p-6 animate-slide-in-right">
                        <div className="flex justify-between items-center mb-8 border-b-2 border-theme-border pb-4">
                            <h2 className="text-2xl font-black italic text-theme-text">MENU</h2>
                            <button 
                                onClick={() => setIsDrawerOpen(false)}
                                className="w-10 h-10 bg-koi-pink text-white border-2 border-theme-border shadow-neo-sm flex items-center justify-center hover:bg-pink-600 transition-colors neo-button"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                                    <path strokeLinecap="square" strokeLinejoin="miter" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex flex-col gap-4">
                            {navItems.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => {
                                        onTabChange(tab);
                                        setIsDrawerOpen(false);
                                    }}
                                    className={`p-4 text-left font-bold text-xl border-2 transition-all neo-button ${
                                        currentTab === tab 
                                        ? 'bg-koi-lime text-black border-theme-border shadow-neo' 
                                        : 'bg-theme-surface text-theme-text border-theme-border/20 hover:border-theme-border'
                                    }`}
                                >
                                    {tab.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        <div className="mt-auto flex flex-col gap-4">
                            {/* Mobile Streak Display */}
                            <div className={`flex items-center justify-between border-2 border-theme-border p-4 shadow-neo-sm ${isStreakBonusActive ? 'bg-orange-500 text-black' : 'bg-theme-surface text-theme-text'}`}>
                                <span className="font-bold">CURRENT STREAK</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">🔥</span>
                                    <span className="text-2xl font-black">{streak}</span>
                                </div>
                            </div>

                             <div className="flex items-center justify-between bg-theme-surface border-2 border-theme-border p-4 shadow-neo-sm">
                                <span className="font-bold text-theme-text">Dark Mode</span>
                                <button 
                                    onClick={toggleTheme}
                                    className="w-12 h-6 rounded-full bg-theme-base border-2 border-theme-border relative"
                                >
                                    <div className={`absolute top-0.5 bottom-0.5 w-4 bg-theme-text rounded-full transition-all ${isDarkMode ? 'right-1' : 'left-1'}`}></div>
                                </button>
                             </div>

                            {walletConnected && (
                                <div className="bg-theme-surface border-2 border-theme-border p-4 shadow-neo-sm">
                                    <p className="text-xs text-gray-500 font-mono mb-1">YOUR BALANCE</p>
                                    <p className="text-2xl font-black text-koi-lime drop-shadow-[1px_1px_0_#000]">{balance.toFixed(2)} SOL</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};