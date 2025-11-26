use anchor_lang::prelude::*;

// Module declarations
pub mod constants;
pub mod errors;
pub mod events;
pub mod state;
pub mod utils;

// Context modules
pub mod initialize;
pub mod create_round;
pub mod place_prediction;
pub mod close_betting;
pub mod settle_round;
pub mod claim_winnings;
pub mod create_tournament;
pub mod emergency_cancel;

// Instruction modules
pub mod initialize_handler;
pub mod create_round_handler;
pub mod place_prediction_handler;
pub mod close_betting_handler;
pub mod settle_round_handler;
pub mod claim_winnings_handler;
pub mod create_tournament_handler;
pub mod emergency_cancel_handler;

declare_id!("24nBY5NPLcDBLzxDR3Av2NJpxsRRfDGv4KwZ9KB7vbpT");

#[program]
pub mod my_program {
    use super::*;

    /// Initialize the global state (one-time setup)
    pub fn initialize(ctx: Context<initialize::Initialize>) -> Result<()> {
        initialize_handler::handler(ctx)
    }

    /// Create a new prediction round
    pub fn create_round(
        ctx: Context<create_round::CreateRound>,
        round_id: u64,
        start_time: i64,
        end_time: i64,
        num_outcomes: u8,
        description: String,
    ) -> Result<()> {
        create_round_handler::handler(ctx, round_id, start_time, end_time, num_outcomes, description)
    }

    /// Place a prediction on a round
    pub fn place_prediction(
        ctx: Context<place_prediction::PlacePrediction>,
        round_id: u64,
        outcome: u8,
        amount: u64,
    ) -> Result<()> {
        place_prediction_handler::handler(ctx, round_id, outcome, amount)
    }

    /// Close betting for a round (after end_time)
    pub fn close_betting(ctx: Context<close_betting::CloseBetting>, round_id: u64) -> Result<()> {
        close_betting_handler::handler(ctx, round_id)
    }

    /// Settle a round with the winning outcome (admin only)
    pub fn settle_round(
        ctx: Context<settle_round::SettleRound>,
        round_id: u64,
        winning_outcome: u8,
        winning_pool_amount: u64,
    ) -> Result<()> {
        settle_round_handler::handler(ctx, round_id, winning_outcome, winning_pool_amount)
    }

    /// Claim winnings from a settled round
    pub fn claim_winnings(ctx: Context<claim_winnings::ClaimWinnings>, round_id: u64) -> Result<()> {
        claim_winnings_handler::handler(ctx, round_id)
    }

    /// Create a new tournament
    pub fn create_tournament(
        ctx: Context<create_tournament::CreateTournament>,
        tournament_id: u64,
        entry_fee: u64,
        max_rounds: u8,
        start_time: i64,
    ) -> Result<()> {
        create_tournament_handler::handler(ctx, tournament_id, entry_fee, max_rounds, start_time)
    }

    /// Emergency cancel a round (admin only)
    pub fn emergency_cancel(
        ctx: Context<emergency_cancel::EmergencyCancel>,
        round_id: u64,
        reason: String,
    ) -> Result<()> {
        emergency_cancel_handler::handler(ctx, round_id, reason)
    }
}
