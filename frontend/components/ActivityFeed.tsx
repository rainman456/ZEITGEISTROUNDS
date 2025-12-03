import React from 'react';
import { ActivityItem } from '../types';

interface ActivityFeedProps {
    items: ActivityItem[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ items }) => {
    
    const getActivityVisuals = (item: ActivityItem) => {
        switch (item.type) {
            case 'win':
                return {
                    icon: '🏆',
                    bg: 'bg-koi-lime',
                    shape: 'rounded-full',
                    borderColor: 'border-black'
                };
            case 'streak':
                return {
                    icon: '🔥',
                    bg: 'bg-orange-500',
                    shape: 'rounded-none -skew-x-6',
                    borderColor: 'border-black'
                };
            case 'predict':
                const isYes = item.action.includes('YES');
                return {
                    icon: isYes ? '💹' : '📉',
                    bg: isYes ? 'bg-green-400' : 'bg-red-400',
                    shape: 'rounded-lg',
                    borderColor: 'border-black'
                };
            default:
                return {
                    icon: '🤖',
                    bg: 'bg-gray-400',
                    shape: 'rounded-full',
                    borderColor: 'border-black'
                };
        }
    };

    return (
        <div className="w-full bg-theme-surface border-l-2 border-theme-border h-full flex flex-col transition-colors duration-300">
            <div className="p-4 border-b-2 border-theme-border bg-theme-base">
                <h3 className="font-black text-theme-text flex items-center gap-2 text-xl italic">
                    <span className="w-3 h-3 border border-theme-border bg-green-500 animate-pulse"></span>
                    LIVE FEED
                </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                {items.map((item) => {
                    const visuals = getActivityVisuals(item);
                    return (
                        <div key={item.id} className="bg-theme-base border border-theme-border/30 p-3 shadow-neo-sm hover:translate-x-1 transition-transform cursor-default group relative overflow-hidden">
                            <div className="flex items-start gap-3 relative z-10">
                                {/* Activity Type Icon */}
                                <div className={`w-10 h-10 border-2 ${visuals.borderColor} flex-shrink-0 flex items-center justify-center text-xl shadow-sm ${visuals.bg} ${visuals.shape} transition-transform group-hover:scale-110`}>
                                    {visuals.icon}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <span className="font-bold text-koi-cyan truncate drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">
                                            {item.user.username}
                                        </span>
                                        <span className="text-[10px] text-gray-500 font-mono whitespace-nowrap">{item.timestamp}</span>
                                    </div>
                                    
                                    <p className="text-theme-text text-sm leading-snug mt-1">
                                        {item.type === 'predict' && (
                                            <>
                                                bet on <span className={`font-black px-1 border border-black ${item.action.includes('YES') ? 'bg-green-500 text-black' : 'bg-red-500 text-white'}`}>{item.action.includes('YES') ? 'YES' : 'NO'}</span> for {item.amount} SOL
                                            </>
                                        )}
                                        {item.type === 'win' && (
                                            <>
                                                won <span className="bg-koi-lime text-black px-1 font-black border border-black">{item.amount} SOL</span> 💰
                                            </>
                                        )}
                                        {item.type === 'streak' && (
                                            <span className="text-yellow-500 font-bold italic">
                                                is on a {item.action} win streak!
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};