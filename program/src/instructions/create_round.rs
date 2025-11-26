// Create round instruction

use anchor_lang::prelude::*;
use crate::contexts::CreateRound;
use crate::state::RoundStatus;
use crate::events::RoundCreated;
use crate::errors::SocialRouletteError;
use crate::constants::*;
use crate::utils::{validate_betting_duration, validate_future_timestamp};

pub fn handler(
    ctx: Context<CreateRound>,
    round_id: u64,
    start_time: i64,
    end_time: i64,
    num_outcomes: u8,
    description: String,
) -> Result<()> {
    let global_state = &mut ctx.accounts.global_state;
    let round = &mut ctx.accounts.round;
    let clock = Clock::get()?;
    
    // Validate inputs
    require!(
        num_outcomes >= 2 && num_outcomes <= MAX_OUTCOMES,
        SocialRouletteError::InvalidOutcomeCount
    );
    
    validate_future_timestamp(start_time, clock.unix_timestamp)?;
    validate_betting_duration(start_time, end_time, MIN_BETTING_DURATION, MAX_BETTING_DURATION)?;


      // Calculate betting close time (10 seconds after start)
    let betting_close_time = start_time
        .checked_add(10)
        .ok_or(SocialRouletteError::ArithmeticOverflow)?;
    
    // Initialize all round fields explicitly
    round.round_id = round_id;
    round.creator = ctx.accounts.creator.key();
    round.start_time = start_time;
    round.betting_close_time = betting_close_time;  // ✅ Add this
    round.end_time = end_time;
    round.total_pool = 0;
    round.total_predictions = 0;
    round.platform_fee_collected = 0;
    round.num_outcomes = num_outcomes;
    round.winning_outcome = crate::state::Round::UNSET_OUTCOME;
    round.tournament = None;
    round.winning_pool = 0;
    round.status = RoundStatus::Active;
    round.bump = ctx.bumps.round;
    // Manually initialize vault by transferring rent-exempt minimum
let rent = Rent::get()?;
let vault_rent_exempt = rent.minimum_balance(0);

if ctx.accounts.vault.lamports() == 0 {
    anchor_lang::system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.creator.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        ),
        vault_rent_exempt,
    )?;
}
    round.question = description.clone();
    
    // Update global state
    global_state.increment_rounds()?;
    
    emit!(RoundCreated {
        round_id,
        creator: ctx.accounts.creator.key(),
        start_time,
        end_time,
        num_outcomes,
        description,
    });
    
    Ok(())
}
