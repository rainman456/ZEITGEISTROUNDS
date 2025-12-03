import React from 'react';
import { Tournament } from '../types';

interface TournamentsProps {
    tournaments: Tournament[];
}

export const Tournaments: React.FC<TournamentsProps> = ({ tournaments }) => {
    return (
        <div className="max-w-6xl mx-auto p-6">
            <h2 className="text-4xl font-black italic mb-8 text-theme-text drop-shadow-[3px_3px_0_var(--shadow-color)]">ARENA EVENTS</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {tournaments.map(t => (
                    <div key={t.id} className="bg-theme-surface p-6 border-2 border-theme-border shadow-neo hover:translate-x-1 hover:-translate-y-1 transition-transform duration-200 relative overflow-hidden">
                        
                        {/* Decorative background stripes */}
                        <div className="absolute -right-10 -top-10 w-32 h-32 bg-theme-text/5 rotate-45 border-l-4 border-theme-text/10"></div>

                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <span className="bg-koi-lime text-black text-xs font-black px-2 py-1 border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                {t.sponsor ? `BY ${t.sponsor.toUpperCase()}` : 'OFFICIAL'}
                            </span>
                            <span className="text-sm font-mono text-white bg-red-600 px-2 py-0.5 border border-white">
                                {t.timeLeft}
                            </span>
                        </div>

                        <h3 className="text-2xl font-black mb-2 relative z-10 uppercase italic leading-none text-theme-text">{t.title}</h3>
                        <p className="text-gray-500 text-sm mb-6 relative z-10 font-mono">👥 {t.players.toLocaleString()} FIGHTERS</p>

                        <div className="space-y-3 relative z-10 bg-theme-base/50 p-4 border border-theme-border/20">
                            <div className="flex justify-between text-sm items-center">
                                <span className="text-gray-500 font-bold">POOL</span>
                                <span className="font-black text-koi-yellow text-lg text-stroke-sm">{t.prizePool}</span>
                            </div>
                            <div className="flex justify-between text-sm items-center">
                                <span className="text-gray-500 font-bold">RANK</span>
                                <span className="font-bold text-white bg-blue-600 px-2 border border-black">#{t.rank}</span>
                            </div>
                            
                            <div className="w-full bg-gray-300 dark:bg-gray-800 h-3 border border-theme-border mt-2">
                                <div className="h-full bg-koi-pink w-3/4 border-r border-theme-border"></div>
                            </div>
                        </div>
                        
                        <button className="w-full py-3 bg-theme-text text-theme-base font-black mt-4 border-2 border-theme-border shadow-[4px_4px_0px_0px_var(--shadow-color)] active:translate-y-1 active:shadow-none transition-all neo-button hover:bg-koi-cyan hover:text-black">
                            ENTER ARENA
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};