// Tournament state structure

use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum TournamentStatus {
    Pending,    // Not started yet
    Active,     // Currently running
    Completed,  // Finished
}

#[account]
#[derive(InitSpace)]
pub struct Tournament {
    /// Unique tournament ID
    pub tournament_id: u64,
    
    /// Creator of the tournament
    pub creator: Pubkey,
    
    /// Optional winner (set when tournament completes)
    pub winner: Option<Pubkey>,
    
    /// Entry fee per participant (lamports)
    pub entry_fee: u64,
    
    /// Total prize pool accumulated (lamports)
    pub prize_pool: u64,
    
    /// Start time (Unix timestamp)
    pub start_time: i64,
    
    /// Maximum number of rounds in tournament
    pub max_rounds: u8,
    
    /// Current round number (0-based)
    pub current_round: u8,
    
    /// Number of participants
    pub participant_count: u64,
    
    /// Current status
    pub status: TournamentStatus,
    
    /// Bump seed for PDA derivation
    pub bump: u8,
}

impl Tournament {
    pub fn is_active(&self, current_time: i64) -> bool {
        self.status == TournamentStatus::Active && current_time >= self.start_time
    }
    
    pub fn can_start(&self, current_time: i64) -> bool {
        self.status == TournamentStatus::Pending && current_time >= self.start_time
    }
    
    pub fn is_completed(&self) -> bool {
        self.status == TournamentStatus::Completed
    }
    
    pub fn add_participant(&mut self, entry_fee: u64) -> Result<()> {
        self.participant_count = self.participant_count
            .checked_add(1)
            .ok_or(error!(crate::errors::SocialRouletteError::ArithmeticOverflow))?;
        
        self.prize_pool = self.prize_pool
            .checked_add(entry_fee)
            .ok_or(error!(crate::errors::SocialRouletteError::ArithmeticOverflow))?;
        
        Ok(())
    }
    
    pub fn advance_round(&mut self) -> Result<()> {
        require!(
            self.current_round < self.max_rounds,
            crate::errors::SocialRouletteError::MaxTournamentRoundsReached
        );
        
        self.current_round = self.current_round
            .checked_add(1)
            .ok_or(error!(crate::errors::SocialRouletteError::ArithmeticOverflow))?;
        
        Ok(())
    }
    
    pub fn complete(&mut self, winner: Pubkey) -> Result<()> {
        self.winner = Some(winner);
        self.status = TournamentStatus::Completed;
        Ok(())
    }
    
    pub fn start(&mut self) -> Result<()> {
        self.status = TournamentStatus::Active;
        Ok(())
    }
}
