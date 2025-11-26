// Global program state

use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct GlobalState {
    /// Program admin who can update settings
    pub admin: Pubkey,
    
    /// Platform fee in basis points (e.g., 200 = 2%)
    pub platform_fee_bps: u16,
    
    /// Total number of rounds created
    pub total_rounds: u64,
    
    /// Total number of tournaments created
    pub total_tournaments: u64,
    
    /// Total volume wagered across all rounds (in lamports)
    pub total_volume: u64,
    
    /// Whether the program is paused
    pub paused: bool,
    
    /// Bump seed for PDA derivation
    pub bump: u8,
}

impl GlobalState {
    pub fn increment_rounds(&mut self) -> Result<()> {
        self.total_rounds = self.total_rounds
            .checked_add(1)
            .ok_or(error!(crate::errors::SocialRouletteError::ArithmeticOverflow))?;
        Ok(())
    }
    
    pub fn increment_tournaments(&mut self) -> Result<()> {
        self.total_tournaments = self.total_tournaments
            .checked_add(1)
            .ok_or(error!(crate::errors::SocialRouletteError::ArithmeticOverflow))?;
        Ok(())
    }
    
    pub fn add_volume(&mut self, amount: u64) -> Result<()> {
        self.total_volume = self.total_volume
            .checked_add(amount)
            .ok_or(error!(crate::errors::SocialRouletteError::ArithmeticOverflow))?;
        Ok(())
    }
}
