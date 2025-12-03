import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { LiveRound } from './components/LiveRound';
import { ActivityFeed } from './components/ActivityFeed';
import { Moments } from './components/Moments';
import { Tournaments } from './components/Tournaments';
import { Leaderboard } from './components/Leaderboard';
import { 
    Tab, RoundStatus, User, ActivityItem, 
    Question, PredictionType 
} from './types';
import { 
    MOCK_USERS, MOCK_QUESTIONS, MOCK_MOMENTS, 
    MOCK_TOURNAMENTS, MOCK_LEADERBOARD 
} from './constants';

// Declare confetti on window
declare global {
    interface Window {
        confetti: any;
    }
}

const App: React.FC = () => {
    // --- Global State ---
    const [currentTab, setCurrentTab] = useState<Tab>(Tab.LIVE);
    const [walletConnected, setWalletConnected] = useState(false);
    const [balance, setBalance] = useState(12.43);
    const [streak, setStreak] = useState(4); // Start near bonus for demo
    const [isDarkMode, setIsDarkMode] = useState(true);

    // --- Theme Logic ---
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    // --- Game State ---
    const [roundId, setRoundId] = useState(4291);
    const [timeLeft, setTimeLeft] = useState(60);
    const [status, setStatus] = useState<RoundStatus>(RoundStatus.BETTING);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    
    // Pools
    const [yesPool, setYesPool] = useState(8.4);
    const [noPool, setNoPool] = useState(4.0);
    
    // User Interaction
    const [userPrediction, setUserPrediction] = useState<{type: 'YES' | 'NO', amount: number} | null>(null);
    const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
    
    // We can remove the simple text overlay state since we have real confetti now
    // const [showConfetti, setShowConfetti] = useState(false);

    // --- Refs for intervals ---
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const activityRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // --- Sound Effect Logic ---
    const playWinSound = (isBonus: boolean = false) => {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;

        const ctx = new AudioContext();
        
        // Create a retro "level up" arpeggio
        // If bonus, play higher/longer notes
        const notes = isBonus 
            ? [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98] // Extended C Major
            : [523.25, 659.25, 783.99, 1046.50]; // C Major Arpeggio

        const now = ctx.currentTime;

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            // Square wave for 8-bit/retro feel
            osc.type = isBonus ? 'sawtooth' : 'square';
            osc.frequency.value = freq;
            
            // Envelope
            gain.gain.setValueAtTime(0.05, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.3);
        });
    };

    // --- Logic: Game Loop ---
    useEffect(() => {
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    handleRoundEnd();
                    return 0;
                }
                
                // Status Transitions
                if (prev === 51) setStatus(RoundStatus.LIVE);
                
                // Simulate Pool Changes
                if (status === RoundStatus.BETTING && Math.random() > 0.7) {
                    const amount = parseFloat((Math.random() * 2).toFixed(1));
                    if (Math.random() > 0.5) setYesPool(p => p + amount);
                    else setNoPool(p => p + amount);
                }

                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [status]);

    // --- Logic: Round End & Reset ---
    const handleRoundEnd = () => {
        setStatus(RoundStatus.SETTLING);
        
        // Wait 3 seconds then reset
        setTimeout(() => {
            const won = Math.random() > 0.5; // Random winner for demo
            
            // Check if user won
            if (userPrediction) {
                const userWon = (userPrediction.type === 'YES' && won) || (userPrediction.type === 'NO' && !won);
                if (userWon) {
                    // Calculate Winnings
                    const isStreakBonus = streak >= 5;
                    const baseMultiplier = 1.95;
                    const finalMultiplier = isStreakBonus ? baseMultiplier + 0.2 : baseMultiplier; // ~10% bonus logic roughly
                    
                    const winnings = parseFloat((userPrediction.amount * finalMultiplier).toFixed(2));
                    setBalance(b => b + winnings);
                    setStreak(s => s + 1);
                    
                    // Trigger Effects
                    if (window.confetti) {
                        window.confetti({
                            particleCount: isStreakBonus ? 250 : 150,
                            spread: isStreakBonus ? 100 : 70,
                            origin: { y: 0.6 },
                            colors: ['#CCFF00', '#FF0099', '#00FFFF'], // Koi colors
                            zIndex: 100
                        });
                    }
                    playWinSound(isStreakBonus);
                    
                    // Add win to feed
                    addActivity({
                        id: Date.now().toString(),
                        user: { username: 'You', avatarColor: 'bg-theme-surface border-theme-border border' },
                        action: isStreakBonus ? 'WON (STREAK BONUS!)' : 'Won',
                        amount: winnings,
                        timestamp: 'Just now',
                        type: 'win'
                    });
                } else {
                    setStreak(0);
                    // Add loss to feed (optional, but good for feedback)
                }
            }

            // Reset for next round
            resetRound();
        }, 3000);
    };

    const resetRound = () => {
        setRoundId(prev => prev + 1);
        setCurrentQuestionIndex(prev => (prev + 1) % MOCK_QUESTIONS.length);
        setTimeLeft(60);
        setStatus(RoundStatus.BETTING);
        setYesPool(5 + Math.random() * 5);
        setNoPool(5 + Math.random() * 5);
        setUserPrediction(null);
    };

    // --- Logic: Activity Feed Simulation ---
    const addActivity = (item: ActivityItem) => {
        setActivityFeed(prev => [item, ...prev].slice(0, 20));
    };

    useEffect(() => {
        activityRef.current = setInterval(() => {
            const randomUser = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];
            const actions = ['predict', 'win', 'streak'];
            const type = actions[Math.floor(Math.random() * actions.length)] as any;
            
            let item: ActivityItem = {
                id: Date.now().toString(),
                user: randomUser,
                timestamp: 'Just now',
                type: type,
                action: ''
            };

            if (type === 'predict') {
                item.action = Math.random() > 0.5 ? 'YES' : 'NO';
                item.amount = [0.1, 0.5, 1.0, 5.0][Math.floor(Math.random() * 4)];
            } else if (type === 'win') {
                item.action = 'won';
                item.amount = parseFloat((Math.random() * 5).toFixed(1));
            } else {
                item.action = Math.floor(Math.random() * 10 + 3).toString();
            }

            addActivity(item);
        }, 3000);

        return () => {
            if (activityRef.current) clearInterval(activityRef.current);
        };
    }, []);

    // --- Logic: User Interaction ---
    const handlePredict = (type: 'YES' | 'NO', amount: number) => {
        if (!walletConnected) {
            alert("Please connect your wallet first!");
            return;
        }
        if (balance < amount) {
            alert("Insufficient balance!");
            return;
        }

        setBalance(b => b - amount);
        setUserPrediction({ type, amount });
        
        if (type === 'YES') setYesPool(p => p + amount);
        else setNoPool(p => p + amount);
    };

    // --- Render Helpers ---
    const renderContent = () => {
        switch (currentTab) {
            case Tab.LIVE:
                return (
                    <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-80px)] overflow-hidden">
                        {/* Left Side: Game */}
                        <div className="flex-1 overflow-y-auto p-4 lg:p-8 flex flex-col justify-center relative">
                            <LiveRound 
                                roundId={roundId}
                                question={MOCK_QUESTIONS[currentQuestionIndex]}
                                timeLeft={timeLeft}
                                status={status}
                                yesPool={yesPool}
                                noPool={noPool}
                                onPredict={handlePredict}
                                userPrediction={userPrediction}
                                streak={streak}
                            />
                        </div>

                        {/* Right Side: Feed (Desktop) / Bottom (Mobile) */}
                        <div className="w-full lg:w-96 border-t-2 lg:border-t-0 lg:border-l-2 border-theme-border bg-theme-base h-80 lg:h-auto">
                            <ActivityFeed items={activityFeed} />
                        </div>
                    </div>
                );
            case Tab.MOMENTS:
                return <Moments moments={MOCK_MOMENTS} />;
            case Tab.TOURNAMENTS:
                return <Tournaments tournaments={MOCK_TOURNAMENTS} />;
            case Tab.LEADERBOARD:
                return <Leaderboard entries={MOCK_LEADERBOARD} />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen text-theme-text relative flex flex-col">
            <Header 
                balance={balance}
                streak={streak}
                currentTab={currentTab}
                onTabChange={setCurrentTab}
                walletConnected={walletConnected}
                onToggleWallet={() => setWalletConnected(!walletConnected)}
                isDarkMode={isDarkMode}
                toggleTheme={() => setIsDarkMode(!isDarkMode)}
            />

            <main className="pt-20 flex-1">
                {renderContent()}
            </main>
        </div>
    );
};

export default App;