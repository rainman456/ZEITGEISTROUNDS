export enum Tab {
    LIVE = 'Live Rounds',
    MOMENTS = 'My Moments',
    TOURNAMENTS = 'Tournaments',
    LEADERBOARD = 'Leaderboard'
}

export enum RoundStatus {
    BETTING = 'BETTING',
    LIVE = 'LIVE',
    SETTLING = 'SETTLING'
}

export enum PredictionType {
    PRICE = '💹 PRICE',
    ONCHAIN = '⚡ ON-CHAIN',
    SOCIAL = '🐦 SOCIAL',
    MARKET = '📊 MARKET'
}

export interface Question {
    id: number;
    text: string;
    category: PredictionType;
    duration: number; // usually 60s
}

export interface User {
    username: string;
    avatarColor: string;
}

export interface ActivityItem {
    id: string;
    user: User;
    action: string;
    amount?: number;
    timestamp: string; // e.g. "2s ago"
    type: 'predict' | 'win' | 'streak';
}

export interface MomentCard {
    id: number;
    roundId: number;
    question: string;
    prediction: 'YES' | 'NO';
    amount: number;
    result: 'WON' | 'LOST';
    winnings?: number;
    rarity: 'Common' | 'Rare' | 'Legendary';
    timestamp: string;
}

export interface Tournament {
    id: number;
    title: string;
    timeLeft: string;
    prizePool: string;
    players: number;
    rank: number;
    accuracy: number;
    sponsor?: string;
}

export interface LeaderboardEntry {
    rank: number;
    username: string;
    avatarColor: string;
    winRate: number;
    totalPredictions: number;
    winnings: number;
    streak: number;
}
