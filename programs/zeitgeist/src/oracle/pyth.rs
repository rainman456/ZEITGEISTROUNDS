// use anchor_lang::prelude::*;
// use pyth_sdk_solana::load_price_feed_from_account_info;
// use crate::errors::SocialRouletteError;
// use crate::state::Round;

// pub fn verify_pyth_price(
//     round: &Round,
//     pyth_price_account: &AccountInfo,
//     current_timestamp: i64,
// ) -> Result<u8> {
//     // Load Pyth price feed
//     let price_feed = load_price_feed_from_account_info(pyth_price_account)
//         .map_err(|_| SocialRouletteError::InvalidOracle)?;
    
//     // Get current price
//     let price = price_feed
//         .get_price_no_older_than(current_timestamp, 60) // Max 60 seconds old
//         .ok_or(SocialRouletteError::OraclePriceStale)?;
    
//     // Convert price to comparable format (cents)
//   let current_price_cents = if price.expo >= 0 {
//     (price.price * 100) * (10_i64.pow(price.expo as u32))
// } else {
//     (price.price * 100) / (10_i64.pow(price.expo.unsigned_abs()))
// };
    
//     // Compare with target value
//     // Outcome 0 = "Will price be above target?"
//     // Outcome 1 = "Will price be below target?"
//     let winning_outcome = if current_price_cents >= round.target_value {
//         0 // Above/Equal
//     } else {
//         1 // Below
//     };
    
//     Ok(winning_outcome)
// }




use anchor_lang::prelude::*;
use crate::errors::SocialRouletteError;
use crate::state::Round;

pub fn verify_pyth_price(
    round: &Round,
    pyth_price_account: &AccountInfo,
    current_timestamp: i64,
) -> Result<u8> {
    // Manual parsing of Pyth price account
    // Pyth V2 price account structure (simplified):
    // [0..8]: discriminator
    // [8..16]: price (i64)
    // [16..20]: conf (u32)
    // [20..24]: exponent (i32)
    // [24..32]: publish_time (i64)
    
    let data = pyth_price_account.try_borrow_data()?;
    require!(data.len() >= 32, SocialRouletteError::InvalidOracle);
    
    // Parse price
    let price_bytes: [u8; 8] = data[8..16].try_into().unwrap();
    let price = i64::from_le_bytes(price_bytes);
    
    // Parse exponent
    let expo_bytes: [u8; 4] = data[20..24].try_into().unwrap();
    let exponent = i32::from_le_bytes(expo_bytes);
    
    // Parse publish time
    let time_bytes: [u8; 8] = data[24..32].try_into().unwrap();
    let publish_time = i64::from_le_bytes(time_bytes);
    
    // Check staleness (60 seconds)
    require!(
        current_timestamp - publish_time <= 60,
        SocialRouletteError::OraclePriceStale
    );
    
    // Convert to cents
    let current_price_cents = if exponent >= 0 {
        (price * 100) * (10_i64.pow(exponent as u32))
    } else {
        (price * 100) / (10_i64.pow(exponent.unsigned_abs()))
    };
    
    // Determine winner
    let winning_outcome = if current_price_cents >= round.target_value {
        0
    } else {
        1
    };
    
    Ok(winning_outcome)
}