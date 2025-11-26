// Custom error codes for Social Roulette

use anchor_lang::prelude::*;

#[error_code]
pub enum SocialRouletteError {
    #[msg("Betting period has not started yet")]
    BettingNotStarted,
    
    #[msg("Betting period has already ended")]
    BettingEnded,
    
    #[msg("Betting period is still active")]
    BettingStillActive,
    
    #[msg("Round has not been settled yet")]
    RoundNotSettled,
    
    #[msg("Round has already been settled")]
    RoundAlreadySettled,
    
    #[msg("Invalid prediction amount (below minimum or above maximum)")]
    InvalidPredictionAmount,
    
    #[msg("Invalid outcome index")]
    InvalidOutcome,
    
    #[msg("User has already placed a prediction in this round")]
    AlreadyPredicted,
    
    #[msg("No winnings to claim")]
    NoWinnings,
    
    #[msg("Winnings already claimed")]
    AlreadyClaimed,
    
    #[msg("Unauthorized: only admin can perform this action")]
    Unauthorized,
    
    #[msg("Invalid betting duration (too short or too long)")]
    InvalidBettingDuration,
    
    #[msg("Maximum predictions reached for this round")]
    MaxPredictionsReached,
    
    #[msg("Invalid number of outcomes (must be between 2 and MAX_OUTCOMES)")]
    InvalidOutcomeCount,
    
    #[msg("Settlement timeout has not passed yet")]
    SettlementTimeoutNotPassed,
    
    #[msg("Cannot cancel round after betting has started")]
    CannotCancelActiveRound,
    
    #[msg("Arithmetic overflow occurred")]
    ArithmeticOverflow,
    
    #[msg("Arithmetic underflow occurred")]
    ArithmeticUnderflow,
    
    #[msg("Tournament has already started")]
    TournamentAlreadyStarted,
    
    #[msg("Tournament has not started yet")]
    TournamentNotStarted,
    
    #[msg("Tournament has ended")]
    TournamentEnded,
    
    #[msg("Invalid tournament entry fee")]
    InvalidEntryFee,
    
    #[msg("Maximum tournament rounds reached")]
    MaxTournamentRoundsReached,
    
    #[msg("Round does not belong to this tournament")]
    InvalidTournamentRound,

     #[msg("Program is currently paused")]  // ✅ Add this
    ProgramPaused,

    
}
