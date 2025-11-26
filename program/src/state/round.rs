// Round state structure

use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum RoundStatus {
    Active,      // Betting is open
    Closed,      // Betting closed, awaiting settlement
    Settled,     // Outcome determined, winnings claimable
    Cancelled,   // Round cancelled, refunds available
}



#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub enum VerificationMethod {
    PythPrice,        // Use Pyth oracle
    OnChainData,      // Use Solana blockchain data
    TwitterAPI,       // External API (backend)
    SwitchboardVRF,   // Random number
}


#[account]
#[derive(InitSpace)]
pub struct Round {
    /// Unique round ID
    pub round_id: u64,
    
    /// Creator of the round
    pub creator: Pubkey,
    
    /// Betting start time (Unix timestamp)
    pub start_time: i64,
    
    /// Betting end time (Unix timestamp)
    pub end_time: i64,
    
    /// Total amount in the prize pool (lamports)
    pub total_pool: u64,
    
    /// Number of predictions placed
    pub total_predictions: u32,
    
    /// Platform fee collected (lamports)
    pub platform_fee_collected: u64,
    
    /// Number of possible outcomes (2-10)
    pub num_outcomes: u8,
    
    /// Winning outcome index (0-based, 255 = not set)
    pub winning_outcome: u8,
    
    /// Optional tournament this round belongs to
    pub tournament: Option<Pubkey>,
    
    /// Total amount bet on the winning outcome
    pub winning_pool: u64,
    
    /// Current status of the round
    pub status: RoundStatus,
    
    /// Bump seed for PDA derivation
    pub bump: u8,

     /// Betting window closes after this time (start_time + 10 seconds)
    pub betting_close_time: i64,

      #[max_len(200)]
    pub question: String,

       pub verification_method: VerificationMethod,
    
    /// Target value for comparison (e.g., price in cents: 15000 = $150.00)
    pub target_value: i64,
    
    /// Data source address (e.g., Pyth price feed pubkey)
    pub data_source: Pubkey,
    
    /// Authorized oracle that can settle this round
    pub oracle: Pubkey,
    
}

impl Round {
    pub const UNSET_OUTCOME: u8 = 255;
    
    pub fn is_betting_active(&self, current_time: i64) -> bool {
        self.status == RoundStatus::Active 
            && current_time >= self.start_time 
            //&& current_time < self.end_time
            && current_time < self.betting_close_time
    }
    
    pub fn is_betting_ended(&self, current_time: i64) -> bool {
        current_time >= self.end_time
    }
    
    pub fn can_settle(&self, current_time: i64) -> bool {
        self.status == RoundStatus::Closed && self.is_betting_ended(current_time)
    }
    
    pub fn is_settled(&self) -> bool {
        self.status == RoundStatus::Settled
    }
    
    pub fn is_cancelled(&self) -> bool {
        self.status == RoundStatus::Cancelled
    }
    
    pub fn add_prediction(&mut self, amount: u64, outcome: u8) -> Result<()> {
        self.total_pool = self.total_pool
            .checked_add(amount)
            .ok_or(error!(crate::errors::SocialRouletteError::ArithmeticOverflow))?;
        
        self.total_predictions = self.total_predictions
            .checked_add(1)
            .ok_or(error!(crate::errors::SocialRouletteError::ArithmeticOverflow))?;
        
        Ok(())
    }
    
    pub fn set_winning_outcome(&mut self, outcome: u8, winning_pool_amount: u64) -> Result<()> {
        self.winning_outcome = outcome;
        self.winning_pool = winning_pool_amount;
        self.status = RoundStatus::Settled;
        Ok(())
    }
    
    pub fn close_betting(&mut self) -> Result<()> {
        self.status = RoundStatus::Closed;
        Ok(())
    }
    
    pub fn cancel(&mut self) -> Result<()> {
        self.status = RoundStatus::Cancelled;
        Ok(())
    }
}
