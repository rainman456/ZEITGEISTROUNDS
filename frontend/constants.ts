import { PredictionType, Question, User, MomentCard, Tournament, LeaderboardEntry } from './types';

export const MOCK_USERS: User[] = [
    { username: '@SolanaWhale', avatarColor: 'bg-purple-500' },
    { username: '@DeFiDegen', avatarColor: 'bg-green-500' },
    { username: '@CryptoSage', avatarColor: 'bg-blue-500' },
    { username: '@BonkLover', avatarColor: 'bg-orange-500' },
    { username: '@WifHat', avatarColor: 'bg-pink-500' },
    { username: '@JupSpace', avatarColor: 'bg-cyan-500' },
    { username: '@AnatolyFan', avatarColor: 'bg-indigo-500' },
];

export const MOCK_QUESTIONS: Question[] = [
    { id: 1, text: "Will SOL price be > $150.00 in 60 seconds?", category: PredictionType.PRICE, duration: 60 },
    { id: 2, text: "Will the next Solana block time be < 400ms?", category: PredictionType.ONCHAIN, duration: 60 },
    { id: 3, text: "Will @solana get more Twitter mentions than @ethereum?", category: PredictionType.SOCIAL, duration: 60 },
    { id: 4, text: "Will BTC volatility increase > 2%?", category: PredictionType.MARKET, duration: 60 },
    { id: 5, text: "Will a new legendary NFT mint out in 60s?", category: PredictionType.ONCHAIN, duration: 60 },
];

export const MOCK_MOMENTS: MomentCard[] = [
    { id: 101, roundId: 4288, question: "Will SOL hit $148?", prediction: 'YES', amount: 0.5, result: 'WON', winnings: 0.95, rarity: 'Common', timestamp: '2m ago' },
    { id: 102, roundId: 4280, question: "Block time < 350ms?", prediction: 'NO', amount: 1.0, result: 'LOST', rarity: 'Common', timestamp: '15m ago' },
    { id: 103, roundId: 4150, question: "BTC Breakout?", prediction: 'YES', amount: 5.0, result: 'WON', winnings: 12.5, rarity: 'Legendary', timestamp: '1h ago' },
    { id: 104, roundId: 4102, question: "Bonk flip DOGE?", prediction: 'YES', amount: 0.1, result: 'WON', winnings: 0.3, rarity: 'Rare', timestamp: '3h ago' },
];

export const MOCK_TOURNAMENTS: Tournament[] = [
    { id: 1, title: "Crypto Twitter Predictions", timeLeft: "23h 45m", prizePool: "1,000 SOL", players: 2847, rank: 142, accuracy: 89, sponsor: "Phantom" },
    { id: 2, title: "DeFi Summer Blitz", timeLeft: "2h 10m", prizePool: "500 SOL", players: 1205, rank: 56, accuracy: 72, sponsor: "Jupiter" },
    { id: 3, title: "NFT Floor Watch", timeLeft: "4d 12h", prizePool: "2,500 SOL", players: 5430, rank: 890, accuracy: 65, sponsor: "Magic Eden" },
];

export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
    { rank: 1, username: "@SolanaKing", avatarColor: "bg-yellow-500", winRate: 92, totalPredictions: 450, winnings: 124.5, streak: 12 },
    { rank: 2, username: "@DiamondHands", avatarColor: "bg-blue-400", winRate: 88, totalPredictions: 320, winnings: 98.2, streak: 5 },
    { rank: 3, username: "@AlphaSeeker", avatarColor: "bg-purple-500", winRate: 85, totalPredictions: 210, winnings: 85.0, streak: 8 },
    { rank: 4, username: "@MoonBoi", avatarColor: "bg-green-400", winRate: 81, totalPredictions: 560, winnings: 72.1, streak: 2 },
    { rank: 5, username: "@BearSlayer", avatarColor: "bg-red-400", winRate: 79, totalPredictions: 150, winnings: 65.4, streak: 4 },
];
