use anchor_lang::prelude::*;
use pyth_sdk_solana::load_price_feed_from_account_info;
use crate::errors::SocialRouletteError;
use crate::state::Round;

pub fn verify_pyth_price(
    round: &Round,
    pyth_price_account: &AccountInfo,
    current_timestamp: i64,
) -> Result<u8> {
    // Load Pyth price feed
    let price_feed = load_price_feed_from_account_info(pyth_price_account)
        .map_err(|_| SocialRouletteError::InvalidOracle)?;
    
    // Get current price
    let price = price_feed
        .get_price_no_older_than(current_timestamp, 60) // Max 60 seconds old
        .ok_or(SocialRouletteError::OraclePriceStale)?;
    
    // Convert price to comparable format (cents)
    let current_price_cents = (price.price * 100) / (10_i64.pow(price.expo.unsigned_abs()));
    
    // Compare with target value
    // Outcome 0 = "Will price be above target?"
    // Outcome 1 = "Will price be below target?"
    let winning_outcome = if current_price_cents >= round.target_value {
        0 // Above/Equal
    } else {
        1 // Below
    };
    
    Ok(winning_outcome)
}