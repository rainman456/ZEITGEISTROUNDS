use anchor_lang::prelude::*;

declare_id!("24nBY5NPLcDBLzxDR3Av2NJpxsRRfDGv4KwZ9KB7vbpT");

// Module declarations
pub mod constants;
pub mod errors;
pub mod events;
pub mod state;
pub mod utils;
pub mod contexts;
pub mod instructions;

// Re-export all contexts at crate root for Anchor macro
pub use contexts::*;

#[program]
pub mod zeitgeist {
    use super::*;

    /// Initialize the global state (one-time setup)
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::handler(ctx)
    }

    /// Create a new prediction round
    pub fn create_round(
        ctx: Context<CreateRound>,
        round_id: u64,
        start_time: i64,
        end_time: i64,
        num_outcomes: u8,
        description: String,
    ) -> Result<()> {
        instructions::create_round::handler(ctx, round_id, start_time, end_time, num_outcomes, description)
    }

    /// Place a prediction on a round
    pub fn place_prediction(
        ctx: Context<PlacePrediction>,
        round_id: u64,
        outcome: u8,
        amount: u64,
    ) -> Result<()> {
        instructions::place_prediction::handler(ctx, round_id, outcome, amount)
    }

    /// Close betting for a round (after end_time)
    pub fn close_betting(ctx: Context<CloseBetting>, round_id: u64) -> Result<()> {
        instructions::close_betting::handler(ctx, round_id)
    }

    /// Settle a round with the winning outcome (admin only)
    pub fn settle_round(
        ctx: Context<SettleRound>,
        round_id: u64,
        winning_outcome: u8,
        winning_pool_amount: u64,
    ) -> Result<()> {
        instructions::settle_round::handler(ctx, round_id, winning_outcome, winning_pool_amount)
    }

    /// Claim winnings from a settled round
    pub fn claim_winnings(ctx: Context<ClaimWinnings>, round_id: u64) -> Result<()> {
        instructions::claim_winnings::handler(ctx, round_id)
    }

    /// Create a new tournament
    pub fn create_tournament(
        ctx: Context<CreateTournament>,
        tournament_id: u64,
        entry_fee: u64,
        max_rounds: u8,
        start_time: i64,
    ) -> Result<()> {
        instructions::create_tournament::handler(ctx, tournament_id, entry_fee, max_rounds, start_time)
    }

    /// Emergency cancel a round (admin only)
    pub fn emergency_cancel(
        ctx: Context<EmergencyCancel>,
        round_id: u64,
        reason: String,
    ) -> Result<()> {
        instructions::emergency_cancel::handler(ctx, round_id, reason)
    }
}