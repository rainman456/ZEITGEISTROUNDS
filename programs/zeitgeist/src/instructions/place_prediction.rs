// Place prediction instruction

use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::contexts::PlacePrediction;
//use crate::state::UserStats;
use crate::events::PredictionPlaced;
use crate::errors::SocialRouletteError;
use crate::constants::*;

pub fn handler(
    ctx: Context<PlacePrediction>,
    round_id: u64,
    outcome: u8,
    amount: u64,
) -> Result<()> {
    let global_state = &mut ctx.accounts.global_state;
    let round = &mut ctx.accounts.round;
    let prediction = &mut ctx.accounts.prediction;
    let user_stats = &mut ctx.accounts.user_stats;
    let clock = Clock::get()?;
    
    // Validate betting is active
    require!(
        round.is_betting_active(clock.unix_timestamp),
        SocialRouletteError::BettingEnded
    );
    
    // Validate amount
    require!(
        amount >= MIN_PREDICTION_AMOUNT && amount <= MAX_PREDICTION_AMOUNT,
        SocialRouletteError::InvalidPredictionAmount
    );
    
    // Validate outcome
    require!(
        outcome < round.num_outcomes,
        SocialRouletteError::InvalidOutcome
    );
    
    // Validate max predictions
    require!(
        round.total_predictions < MAX_PREDICTIONS_PER_ROUND,
        SocialRouletteError::MaxPredictionsReached
    );
    
    // Transfer funds from payer to vault
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.payer.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        ),
        amount,
    )?;
    
    // Initialize prediction fields
    prediction.round_id = round_id;
    prediction.user = ctx.accounts.user.key();
    prediction.amount = amount;
    prediction.outcome = outcome;
    prediction.timestamp = clock.unix_timestamp;
    prediction.claimed = false;
    prediction.bump = ctx.bumps.prediction;
    
    // Update round
    round.add_prediction(amount, outcome)?;
    
    // ✅ Initialize user stats if first time (init_if_needed handles account creation)
    if user_stats.total_predictions == 0 {
        user_stats.user = ctx.accounts.user.key();
        user_stats.total_wins = 0;
        user_stats.total_wagered = 0;
        user_stats.total_won = 0;
        user_stats.net_profit = 0;
        user_stats.bump = ctx.bumps.user_stats;
    }
    
    // Update user stats
    user_stats.record_prediction(amount)?;
    
    // Update global volume
    global_state.add_volume(amount)?;
    
    emit!(PredictionPlaced {
        round_id,
        user: ctx.accounts.user.key(),
        outcome,
        amount,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}