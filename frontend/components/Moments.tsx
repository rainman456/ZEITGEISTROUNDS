import React, { useState } from 'react';
import { MomentCard } from '../types';

interface MomentsProps {
    moments: MomentCard[];
}

export const Moments: React.FC<MomentsProps> = ({ moments }) => {
    const [filter, setFilter] = useState<'All' | 'Wins' | 'Legendary'>('All');

    const filteredMoments = moments.filter(m => {
        if (filter === 'All') return true;
        if (filter === 'Wins') return m.result === 'WON';
        if (filter === 'Legendary') return m.rarity === 'Legendary';
        return true;
    });

    return (
        <div className="w-full max-w-5xl mx-auto p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <h2 className="text-4xl font-black italic text-theme-text drop-shadow-[2px_2px_0_var(--shadow-color)]">MY COLLECTION</h2>
                <div className="flex gap-2 bg-theme-base p-1 border-2 border-theme-border shadow-neo-sm">
                    {['All', 'Wins', 'Legendary'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as any)}
                            className={`px-4 py-2 text-sm font-bold uppercase transition-all ${
                                filter === f 
                                ? 'bg-theme-text text-theme-base' 
                                : 'bg-transparent text-gray-500 hover:text-theme-text'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {filteredMoments.map(moment => (
                    <Card key={moment.id} moment={moment} />
                ))}
            </div>
        </div>
    );
};

const Card: React.FC<{ moment: MomentCard }> = ({ moment }) => {
    const [isFlipped, setIsFlipped] = useState(false);

    const getRarityColor = () => {
        switch(moment.rarity) {
            case 'Legendary': return 'bg-yellow-400 text-black border-yellow-600';
            case 'Rare': return 'bg-blue-400 text-black border-blue-600';
            default: return 'bg-gray-200 text-black border-gray-400';
        }
    };

    return (
        <div 
            className="group h-[350px] w-full perspective-1000 cursor-pointer"
            onClick={() => setIsFlipped(!isFlipped)}
        >
            <div className={`relative w-full h-full transition-all duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : 'group-hover:-translate-y-2'}`}>
                
                {/* Front */}
                <div className="absolute w-full h-full backface-hidden bg-theme-surface border-2 border-theme-border shadow-neo p-5 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <span className="text-xs font-mono bg-theme-text text-theme-base px-1">#{moment.roundId}</span>
                        <span className={`text-xs px-2 py-1 font-bold border-2 ${getRarityColor()} uppercase`}>
                            {moment.rarity}
                        </span>
                    </div>
                    
                    <div className="border-y-2 border-theme-border/10 py-4 my-2 flex-1 flex items-center">
                        <h4 className="font-bold text-xl leading-tight text-center w-full uppercase italic text-theme-text">{moment.question}</h4>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-4 text-sm font-mono text-theme-text">
                            <span>Your Bet:</span>
                            <span className={`font-bold px-2 border border-current ${moment.prediction === 'YES' ? 'text-green-500' : 'text-red-500'}`}>
                                {moment.prediction}
                            </span>
                        </div>
                        
                        {moment.result === 'WON' ? (
                            <div className="w-full py-2 bg-koi-lime border-2 border-black text-center font-black text-black text-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                +{moment.winnings} SOL
                            </div>
                        ) : (
                            <div className="w-full py-2 bg-gray-200 dark:bg-gray-800 border-2 border-theme-border text-center font-bold text-gray-500">
                                REKT
                            </div>
                        )}
                    </div>
                </div>

                {/* Back */}
                <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-black border-2 border-theme-border shadow-neo p-5 flex flex-col items-center justify-center">
                    <div className="text-center space-y-6">
                        <div className="text-6xl animate-bounce-small">
                            {moment.result === 'WON' ? '🏆' : '💀'}
                        </div>
                        <div className="w-full bg-white/10 p-2">
                            <p className="text-koi-cyan text-xs uppercase tracking-widest font-bold">Timestamp</p>
                            <p className="font-mono text-white">{moment.timestamp}</p>
                        </div>
                        <div className="w-full bg-white/10 p-2">
                            <p className="text-koi-cyan text-xs uppercase tracking-widest font-bold">Tx Hash</p>
                            <p className="font-mono text-xs text-white truncate">8x28a...90af</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};