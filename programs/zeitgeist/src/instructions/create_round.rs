// Create round instruction

use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey::Pubkey;
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
    verification_method: crate::state::VerificationMethod,  // ← ADD
    target_value: i64,                                      // ← ADD
    data_source: Pubkey,                                    // ← ADD
    oracle: Pubkey,  
    betting_window_duration: i64,  
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
    require!(
    betting_window_duration >= 10 && betting_window_duration <= 300,
    SocialRouletteError::InvalidBettingWindowDuration
);


      // Calculate betting close time (10 seconds after start)
    let betting_close_time = start_time
        .checked_add(betting_window_duration)
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
   // round.question = description.clone();
round.verification_method = verification_method;  // ← ADD
round.target_value = target_value;                // ← ADD
round.data_source = data_source;                  // ← ADD
round.oracle = oracle;                            // ← ADD
    // Manually initialize vault by transferring rent-exempt minimum
// Manually derive vault PDA and verify
let (vault_pda, _vault_bump) = Pubkey::find_program_address(
    &[VAULT_SEED, round_id.to_le_bytes().as_ref()],
    ctx.program_id,
);

// Verify the vault account matches the derived PDA
require_keys_eq!(
    ctx.accounts.vault.key(),
    vault_pda,
    SocialRouletteError::Unauthorized
);

// Initialize vault by transferring rent-exempt minimum
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

round.question = description.clone();  // Move this AFTER vault initialization
    
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
