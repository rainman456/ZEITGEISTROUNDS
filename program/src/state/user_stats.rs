// User statistics tracking

use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct UserStats {
    /// User's public key
    pub user: Pubkey,
    
    /// Total number of predictions made
    pub total_predictions: u64,
    
    /// Total number of winning predictions
    pub total_wins: u64,
    
    /// Total amount wagered (lamports)
    pub total_wagered: u64,
    
    /// Total amount won (lamports)
    pub total_won: u64,
    
    /// Net profit/loss (lamports, can be negative)
    pub net_profit: i64,
    
    /// Bump seed for PDA derivation
    pub bump: u8,
}

impl UserStats {
    pub fn record_prediction(&mut self, amount: u64) -> Result<()> {
        self.total_predictions = self.total_predictions
            .checked_add(1)
            .ok_or(error!(crate::errors::SocialRouletteError::ArithmeticOverflow))?;
        
        self.total_wagered = self.total_wagered
            .checked_add(amount)
            .ok_or(error!(crate::errors::SocialRouletteError::ArithmeticOverflow))?;
        
        // Update net profit (subtract bet)
        self.net_profit = self.net_profit
            .checked_sub(amount as i64)
            .ok_or(error!(crate::errors::SocialRouletteError::ArithmeticUnderflow))?;
        
        Ok(())
    }
    
    pub fn record_win(&mut self, winnings: u64) -> Result<()> {
        self.total_wins = self.total_wins
            .checked_add(1)
            .ok_or(error!(crate::errors::SocialRouletteError::ArithmeticOverflow))?;
        
        self.total_won = self.total_won
            .checked_add(winnings)
            .ok_or(error!(crate::errors::SocialRouletteError::ArithmeticOverflow))?;
        
        // Update net profit (add winnings)
        self.net_profit = self.net_profit
            .checked_add(winnings as i64)
            .ok_or(error!(crate::errors::SocialRouletteError::ArithmeticOverflow))?;
        
        Ok(())
    }
    
    pub fn win_rate_bps(&self) -> u64 {
        if self.total_predictions == 0 {
            return 0;
        }
        
        ((self.total_wins as u128 * 10000) / self.total_predictions as u128) as u64
    }
}
