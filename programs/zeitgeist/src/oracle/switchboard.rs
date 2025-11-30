use anchor_lang::prelude::*;
use crate::errors::SocialRouletteError;

pub fn verify_switchboard_vrf(
    vrf_account: &AccountInfo,
    num_outcomes: u8,
) -> Result<u8> {
    // Manually parse Switchboard VRF account
    // VRF account structure (simplified):
    // [0..8]: discriminator
    // [8..40]: current_round.result (32 bytes of randomness)
    
    let data = vrf_account.try_borrow_data()?;
    
    // Validate minimum size
    require!(
        data.len() >= 40,
        SocialRouletteError::InvalidOracle
    );
    
    // Extract randomness bytes (skip 8-byte discriminator)
    let result_buffer = &data[8..40];
    
    // Convert first 8 bytes to u64
    let random_bytes: [u8; 8] = result_buffer[0..8]
        .try_into()
        .map_err(|_| SocialRouletteError::InvalidOracle)?;
    
    let random_value = u64::from_le_bytes(random_bytes);
    
    // Map to outcome index
    let winning_outcome = (random_value % num_outcomes as u64) as u8;
    
    Ok(winning_outcome)
}