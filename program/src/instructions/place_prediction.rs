// Place prediction instruction

use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::contexts::PlacePrediction;
use crate::state::UserStats;
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
    let clock = Clock::get()?;
    
    // Derive user stats PDA
    let user_key = ctx.accounts.user.key();
    let (user_stats_pda, user_stats_bump) = Pubkey::find_program_address(
        &[USER_STATS_SEED, user_key.as_ref()],
        ctx.program_id,
    );
    
    require!(
        ctx.accounts.user_stats.key() == user_stats_pda,
        SocialRouletteError::Unauthorized
    );
    
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
    
    // Transfer funds from user to vault
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.user.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        ),
        amount,
    )?;
    
    // Initialize prediction fields explicitly
    prediction.round_id = round_id;
    prediction.user = ctx.accounts.user.key();
    prediction.amount = amount;
    prediction.outcome = outcome;
    prediction.timestamp = clock.unix_timestamp;
    prediction.claimed = false;
    prediction.bump = ctx.bumps.prediction;
    
    // Update round
    round.add_prediction(amount, outcome)?;
    
    // Initialize or update user stats
    if ctx.accounts.user_stats.data_is_empty() {
        // Create user stats account
        let space = 8 + UserStats::INIT_SPACE;
        let rent = Rent::get()?;
        let lamports = rent.minimum_balance(space);
        
        system_program::create_account(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::CreateAccount {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.user_stats.to_account_info(),
                },
            ),
            lamports,
            space as u64,
            ctx.program_id,
        )?;
        
        // Initialize user stats data
        let mut data = ctx.accounts.user_stats.try_borrow_mut_data()?;
        let mut user_stats = UserStats::try_from_slice(&[0u8; 8 + UserStats::INIT_SPACE])?;
        user_stats.user = ctx.accounts.user.key();
        user_stats.total_predictions = 0;
        user_stats.total_wins = 0;
        user_stats.total_wagered = 0;
        user_stats.total_won = 0;
        user_stats.net_profit = 0;
        user_stats.bump = user_stats_bump;
        user_stats.record_prediction(amount)?;
        user_stats.serialize(&mut &mut data[..])?;
    } else {
        // Update existing user stats
        let mut data = ctx.accounts.user_stats.try_borrow_mut_data()?;
        let mut user_stats = UserStats::try_from_slice(&data)?;
        user_stats.record_prediction(amount)?;
        user_stats.serialize(&mut &mut data[..])?;
    }
    
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
