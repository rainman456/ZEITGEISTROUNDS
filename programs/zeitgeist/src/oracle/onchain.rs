use anchor_lang::prelude::*;
use crate::errors::SocialRouletteError;

pub fn verify_onchain_data(
    _data_source: &AccountInfo,  // May not be needed for clock/slot data
    target_value: i64,
    num_outcomes: u8,
) -> Result<u8> {
    let clock = Clock::get()?;
    let slot = clock.slot;
    
    // Compare slot with target
    let winning_outcome = if (slot as i64) >= target_value {
        0
    } else {
        1
    };
    
    // Validate outcome is within range
    require!(
        winning_outcome < num_outcomes,
        SocialRouletteError::InvalidOutcome
    );
    
    Ok(winning_outcome)
}