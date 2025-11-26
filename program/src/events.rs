// Events emitted by the Social Roulette program

use anchor_lang::prelude::*;

#[event]
pub struct GlobalStateInitialized {
    pub admin: Pubkey,
    pub platform_fee_bps: u16,
    pub timestamp: i64,
}

#[event]
pub struct RoundCreated {
    pub round_id: u64,
    pub creator: Pubkey,
    pub start_time: i64,
    pub end_time: i64,
    pub num_outcomes: u8,
    pub description: String,
}

#[event]
pub struct PredictionPlaced {
    pub round_id: u64,
    pub user: Pubkey,
    pub outcome: u8,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct BettingClosed {
    pub round_id: u64,
    pub total_pool: u64,
    pub total_predictions: u32,
    pub timestamp: i64,
}

#[event]
pub struct RoundSettled {
    pub round_id: u64,
    pub winning_outcome: u8,
    pub total_pool: u64,
    pub winning_pool: u64,
    pub platform_fee: u64,
    pub timestamp: i64,
}

#[event]
pub struct WinningsClaimed {
    pub round_id: u64,
    pub user: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct RoundCancelled {
    pub round_id: u64,
    pub reason: String,
    pub timestamp: i64,
}

#[event]
pub struct TournamentCreated {
    pub tournament_id: u64,
    pub creator: Pubkey,
    pub entry_fee: u64,
    pub max_rounds: u8,
    pub start_time: i64,
}

#[event]
pub struct TournamentEnded {
    pub tournament_id: u64,
    pub winner: Pubkey,
    pub total_prize_pool: u64,
    pub timestamp: i64,
}

#[event]
pub struct UserStatsUpdated {
    pub user: Pubkey,
    pub total_predictions: u64,
    pub total_wagered: u64,
    pub total_won: u64,
    pub win_rate: u64, // Basis points (e.g., 7500 = 75%)
}
