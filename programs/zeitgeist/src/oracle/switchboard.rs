// use anchor_lang::prelude::*;
// use switchboard_v2::VrfAccountData;
// use crate::errors::SocialRouletteError;

// pub fn verify_switchboard_vrf(
//     vrf_account: &AccountInfo,
//     num_outcomes: u8,
// ) -> Result<u8> {
//     // Load VRF data
//     let vrf = VrfAccountData::new(vrf_account)
//         .map_err(|_| SocialRouletteError::InvalidOracle)?;
    
//     // Get randomness result
//     let result_buffer = vrf.get_result()
//         .map_err(|_| SocialRouletteError::OracleNotReady)?;
    
//     // Convert to outcome index
//     let random_value = u64::from_le_bytes(result_buffer[0..8].try_into().unwrap());
//     let winning_outcome = (random_value % num_outcomes as u64) as u8;
    
//     Ok(winning_outcome)
// }




use anchor_lang::prelude::*;
use switchboard_solana::VrfAccountData;  // ← Changed from switchboard_v2
use crate::errors::SocialRouletteError;

pub fn verify_switchboard_vrf(
    vrf_account: &AccountInfo,
    num_outcomes: u8,
) -> Result<u8> {
    // Load VRF data
    let vrf = VrfAccountData::new(vrf_account)
        .map_err(|_| SocialRouletteError::InvalidOracle)?;
    
    // Get randomness result
    let result_buffer = vrf.get_result()
        .map_err(|_| SocialRouletteError::OracleNotReady)?;
    
    // Convert to outcome index
    let random_value = u64::from_le_bytes(result_buffer[0..8].try_into().unwrap());
    let winning_outcome = (random_value % num_outcomes as u64) as u8;
    
    Ok(winning_outcome)
}