// User prediction state

use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Prediction {
    /// Round this prediction belongs to
    pub round_id: u64,
    
    /// User who made the prediction
    pub user: Pubkey,
    
    /// Amount wagered (lamports)
    pub amount: u64,
    
    /// Predicted outcome (0-based index)
    pub outcome: u8,
    
    /// Timestamp when prediction was placed
    pub timestamp: i64,
    
    /// Whether winnings have been claimed
    pub claimed: bool,
    
    /// Bump seed for PDA derivation
    pub bump: u8,
}

impl Prediction {
    pub fn is_winner(&self, winning_outcome: u8) -> bool {
        self.outcome == winning_outcome
    }
    
    pub fn can_claim(&self, round_settled: bool) -> bool {
        round_settled && !self.claimed
    }
    
    pub fn mark_claimed(&mut self) -> Result<()> {
        self.claimed = true;
        Ok(())
    }
}
