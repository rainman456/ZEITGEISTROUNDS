import React from 'react';
import { LeaderboardEntry } from '../types';

interface LeaderboardProps {
    entries: LeaderboardEntry[];
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ entries }) => {
    return (
        <div className="max-w-4xl mx-auto p-6">
            <h2 className="text-4xl font-black italic mb-8 text-theme-text drop-shadow-[3px_3px_0_var(--shadow-color)]">HALL OF FAME</h2>
            
            <div className="bg-theme-surface border-2 border-theme-border shadow-neo overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-theme-text text-theme-base font-black uppercase text-sm border-b-2 border-theme-border">
                            <tr>
                                <th className="p-4 border-r border-theme-base">#</th>
                                <th className="p-4 border-r border-theme-base">Player</th>
                                <th className="p-4 text-right border-r border-theme-base">Win %</th>
                                <th className="p-4 text-right border-r border-theme-base">Profits</th>
                                <th className="p-4 text-center">Fire</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-theme-border/10">
                            {entries.map((entry) => (
                                <tr key={entry.rank} className="hover:bg-theme-base transition-colors group font-mono text-theme-text">
                                    <td className="p-4 font-bold text-lg border-r border-theme-border/10">
                                        {entry.rank === 1 && '🥇'}
                                        {entry.rank === 2 && '🥈'}
                                        {entry.rank === 3 && '🥉'}
                                        {entry.rank > 3 && entry.rank}
                                    </td>
                                    <td className="p-4 border-r border-theme-border/10">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 border-2 border-theme-border ${entry.avatarColor} flex items-center justify-center text-xs font-black text-black shadow-sm group-hover:rotate-12 transition-transform`}>
                                                {entry.username.substring(1,3).toUpperCase()}
                                            </div>
                                            <span className={`font-bold text-lg ${entry.rank <= 3 ? 'text-koi-yellow text-stroke-sm' : 'text-theme-text'}`}>
                                                {entry.username}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right border-r border-theme-border/10">{entry.winRate}%</td>
                                    <td className="p-4 text-right text-koi-lime font-bold border-r border-theme-border/10 text-stroke-xs">{entry.winnings} SOL</td>
                                    <td className="p-4 text-center">
                                        <span className="inline-block bg-orange-500 text-black px-2 py-1 font-bold border border-theme-border shadow-[2px_2px_0px_0px_var(--shadow-color)] text-xs transform -rotate-2">
                                            🔥 {entry.streak}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};