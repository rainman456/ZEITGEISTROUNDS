// Utility functions for Social Roulette

use anchor_lang::prelude::*;
use crate::errors::SocialRouletteError;

/// Calculate platform fee from amount
pub fn calculate_platform_fee(amount: u64, fee_bps: u16) -> Result<u64> {
    let fee = (amount as u128)
        .checked_mul(fee_bps as u128)
        .ok_or(SocialRouletteError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(SocialRouletteError::ArithmeticOverflow)?;
    
    Ok(fee as u64)
}

/// Calculate proportional winnings for a winner
/// Formula: (user_bet / total_winning_bets) * (total_pool - platform_fee)
pub fn calculate_winnings(
    user_bet: u64,
    total_winning_bets: u64,
    total_pool: u64,
    platform_fee: u64,
) -> Result<u64> {
    if total_winning_bets == 0 {
        return Ok(0);
    }
    
    let distributable_pool = total_pool
        .checked_sub(platform_fee)
        .ok_or(SocialRouletteError::ArithmeticUnderflow)?;
    
    let winnings = (user_bet as u128)
        .checked_mul(distributable_pool as u128)
        .ok_or(SocialRouletteError::ArithmeticOverflow)?
        .checked_div(total_winning_bets as u128)
        .ok_or(SocialRouletteError::ArithmeticOverflow)?;
    
    Ok(winnings as u64)
}

/// Calculate win rate in basis points (0-10000)
pub fn calculate_win_rate(wins: u64, total: u64) -> u64 {
    if total == 0 {
        return 0;
    }
    
    ((wins as u128 * 10000) / total as u128) as u64
}

/// Validate timestamp is in the future
pub fn validate_future_timestamp(timestamp: i64, current_time: i64) -> Result<()> {
    require!(
        timestamp > current_time,
        SocialRouletteError::InvalidBettingDuration
    );
    Ok(())
}

/// Validate betting duration is within limits
pub fn validate_betting_duration(start_time: i64, end_time: i64, min: i64, max: i64) -> Result<()> {
    let duration = end_time
        .checked_sub(start_time)
        .ok_or(SocialRouletteError::ArithmeticUnderflow)?;
    
    require!(
        duration >= min && duration <= max,
        SocialRouletteError::InvalidBettingDuration
    );
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_platform_fee() {
        // 2% of 1000 = 20
        assert_eq!(calculate_platform_fee(1000, 200).unwrap(), 20);
        
        // 5% of 10000 = 500
        assert_eq!(calculate_platform_fee(10000, 500).unwrap(), 500);
        
        // 0.01% of 1000000 = 100
        assert_eq!(calculate_platform_fee(1000000, 1).unwrap(), 100);
    }

    #[test]
    fn test_calculate_winnings() {
        // User bet 100, total winning bets 1000, pool 10000, fee 200
        // Distributable = 10000 - 200 = 9800
        // Winnings = (100 / 1000) * 9800 = 980
        assert_eq!(calculate_winnings(100, 1000, 10000, 200).unwrap(), 980);
        
        // Equal split: 500 / 1000 * 9800 = 4900
        assert_eq!(calculate_winnings(500, 1000, 10000, 200).unwrap(), 4900);
    }

    #[test]
    fn test_calculate_win_rate() {
        // 75 wins out of 100 = 7500 basis points (75%)
        assert_eq!(calculate_win_rate(75, 100), 7500);
        
        // 1 win out of 2 = 5000 basis points (50%)
        assert_eq!(calculate_win_rate(1, 2), 5000);
        
        // 0 wins = 0%
        assert_eq!(calculate_win_rate(0, 100), 0);
        
        // No predictions = 0%
        assert_eq!(calculate_win_rate(0, 0), 0);
    }
}
