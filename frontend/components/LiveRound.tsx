import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, YAxis } from 'recharts';
import { Question, RoundStatus, PredictionType } from '../types';

interface LiveRoundProps {
    roundId: number;
    question: Question;
    timeLeft: number;
    status: RoundStatus;
    yesPool: number;
    noPool: number;
    onPredict: (type: 'YES' | 'NO', amount: number) => void;
    userPrediction: { type: 'YES' | 'NO', amount: number } | null;
    streak: number;
}

const generateChartData = (length: number) => {
    return Array.from({ length }, (_, i) => ({
        time: i,
        value: 50 + Math.random() * 20 - 10
    }));
};

export const LiveRound: React.FC<LiveRoundProps> = ({
    roundId,
    question,
    timeLeft,
    status,
    yesPool,
    noPool,
    onPredict,
    userPrediction,
    streak
}) => {
    const [stake, setStake] = useState(0.5);
    const [chartData, setChartData] = useState(generateChartData(30));

    const totalPool = yesPool + noPool;
    const yesPercent = totalPool > 0 ? Math.round((yesPool / totalPool) * 100) : 50;
    const noPercent = 100 - yesPercent;

    const isStreakBonusActive = streak >= 5;

    useEffect(() => {
        if (status === RoundStatus.SETTLING) return;
        const interval = setInterval(() => {
            setChartData(prev => {
                const lastVal = prev[prev.length - 1].value;
                const change = (Math.random() - 0.5) * 5;
                const newVal = Math.max(20, Math.min(80, lastVal + change));
                return [...prev.slice(1), { time: Date.now(), value: newVal }];
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [status]);

    const formatSOL = (n: number) => n.toFixed(1);

    return (
        <div className="w-full max-w-2xl mx-auto">
            {/* Status Header */}
            <div className="flex justify-between items-end mb-4">
                <div className="flex flex-col gap-1">
                    <span className="bg-theme-base border border-theme-border px-2 py-1 text-xs font-mono font-bold text-theme-text shadow-[2px_2px_0px_0px_var(--shadow-color)]">
                        ROUND #{roundId}
                    </span>
                    <span className={`text-2xl font-black italic ${
                        status === RoundStatus.LIVE ? 'text-red-500 animate-pulse' : 
                        status === RoundStatus.BETTING ? 'text-koi-lime text-shadow-sm' : 'text-koi-yellow'
                    }`}>
                        {status === RoundStatus.BETTING ? 'OPEN' : status === RoundStatus.LIVE ? 'LIVE' : 'SETTLING'}
                    </span>
                </div>
                <div className="text-right bg-theme-surface text-theme-text px-4 py-2 border-2 border-theme-border shadow-[4px_4px_0px_0px_var(--shadow-color)]">
                    <p className="text-[10px] font-black uppercase tracking-widest">Prize Pool</p>
                    <p className="text-xl font-black">🏆 {totalPool.toFixed(2)} SOL</p>
                </div>
            </div>

            {/* Streak Bonus Banner */}
            {isStreakBonusActive && status === RoundStatus.BETTING && (
                <div className="mb-4 bg-orange-500 border-2 border-theme-border p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-bounce-small">
                    <div className="flex items-center justify-center gap-2 text-black font-black uppercase italic">
                        <span>🔥🔥 Streak Bonus Active!</span>
                        <span className="bg-white px-2 border border-black">+10% Winnings</span>
                        <span>🔥🔥</span>
                    </div>
                </div>
            )}

            {/* Main Card */}
            <div className="bg-theme-surface border-4 border-theme-border p-6 relative shadow-neo transition-colors duration-300">
                
                {/* Countdown Box */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-theme-base border-4 border-theme-border px-4 py-2 shadow-neo z-10">
                    <span className={`text-3xl font-mono font-bold ${timeLeft < 10 ? 'text-red-500' : 'text-theme-text'}`}>
                        {timeLeft}s
                    </span>
                </div>

                {/* Question */}
                <div className="text-center mt-8 mb-8 relative z-10">
                    <span className="inline-block px-3 py-1 bg-koi-pink text-white border-2 border-theme-border text-xs font-black mb-4 -rotate-2 transform shadow-sm">
                        {question.category}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black uppercase leading-none mb-2 text-theme-text">
                        {question.text}
                    </h2>
                </div>

                {/* Chart Visualization */}
                <div className="h-32 mb-6 w-full border-2 border-theme-border bg-theme-base/50 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <YAxis domain={['auto', 'auto']} hide />
                            <Area 
                                type="step" 
                                dataKey="value" 
                                stroke="#CCFF00" 
                                strokeWidth={3}
                                fillOpacity={1} 
                                fill="#CCFF0033" 
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Betting Controls */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <button
                        disabled={status !== RoundStatus.BETTING}
                        onClick={() => onPredict('YES', stake)}
                        className={`
                            relative p-4 border-4 border-theme-border transition-all duration-100 neo-button
                            ${status !== RoundStatus.BETTING ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:-translate-y-1 hover:shadow-neo'}
                            bg-green-600 group
                        `}
                    >
                        <div className="flex flex-col items-center relative z-10">
                            <span className="text-white font-black text-2xl mb-1 italic">YES</span>
                            <span className="text-3xl font-black text-theme-text bg-theme-surface px-2 mb-1 border border-theme-border">{yesPercent}%</span>
                            <span className="text-xs text-white font-mono bg-black/50 px-2 py-0.5">{formatSOL(yesPool)} SOL</span>
                        </div>
                        {userPrediction?.type === 'YES' && (
                            <div className="absolute top-2 right-2 bg-yellow-400 text-black border-2 border-black text-[10px] font-bold px-1.5 py-0.5 rotate-12">
                                YOUR PICK
                            </div>
                        )}
                    </button>

                    <button
                        disabled={status !== RoundStatus.BETTING}
                        onClick={() => onPredict('NO', stake)}
                        className={`
                            relative p-4 border-4 border-theme-border transition-all duration-100 neo-button
                            ${status !== RoundStatus.BETTING ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:-translate-y-1 hover:shadow-neo'}
                            bg-red-600 group
                        `}
                    >
                        <div className="flex flex-col items-center relative z-10">
                            <span className="text-white font-black text-2xl mb-1 italic">NO</span>
                            <span className="text-3xl font-black text-theme-text bg-theme-surface px-2 mb-1 border border-theme-border">{noPercent}%</span>
                            <span className="text-xs text-white font-mono bg-black/50 px-2 py-0.5">{formatSOL(noPool)} SOL</span>
                        </div>
                        {userPrediction?.type === 'NO' && (
                            <div className="absolute top-2 right-2 bg-yellow-400 text-black border-2 border-black text-[10px] font-bold px-1.5 py-0.5 rotate-12">
                                YOUR PICK
                            </div>
                        )}
                    </button>
                </div>

                {/* Stake Selector */}
                <div className="bg-theme-base border-2 border-theme-border p-2">
                    <div className="flex justify-between items-center gap-2">
                        {[0.1, 0.5, 1.0, 5.0].map((amt) => (
                            <button
                                key={amt}
                                onClick={() => setStake(amt)}
                                className={`
                                    flex-1 py-2 text-sm font-bold border-2 transition-all neo-button
                                    ${stake === amt 
                                        ? 'bg-koi-cyan text-black border-theme-border shadow-[2px_2px_0px_0px_var(--shadow-color)]' 
                                        : 'bg-transparent text-theme-text border-theme-border/30 hover:border-theme-border'
                                    }
                                `}
                            >
                                {amt} SOL
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            
            {/* User Status Footer */}
            <div className="mt-6 text-center">
                {userPrediction ? (
                    <div className="inline-block bg-theme-surface text-theme-text border-2 border-theme-border px-4 py-2 shadow-neo-sm font-bold transform -rotate-1">
                        You bet {userPrediction.amount} SOL on {userPrediction.type} 🎲
                    </div>
                ) : (
                    <p className="text-gray-500 font-mono text-xs">Place a prediction to join the round</p>
                )}
            </div>
        </div>
    );
};