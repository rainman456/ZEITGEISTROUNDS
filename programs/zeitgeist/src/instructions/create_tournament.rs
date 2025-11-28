// Create tournament instruction

use anchor_lang::prelude::*;
use crate::constants::{MAX_TOURNAMENT_ROUNDS, MIN_TOURNAMENT_ENTRY_FEE};
use crate::contexts::CreateTournament;
use crate::state::TournamentStatus;
use crate::events::TournamentCreated;
use crate::errors::SocialRouletteError;

pub fn handler(
    ctx: Context<CreateTournament>,
    tournament_id: u64,
    entry_fee: u64,
    max_rounds: u8,
    start_time: i64,
) -> Result<()> {
    let global_state = &mut ctx.accounts.global_state;
    let tournament = &mut ctx.accounts.tournament;
    let clock = Clock::get()?;
    
    // Validate inputs
    require!(
        entry_fee >= MIN_TOURNAMENT_ENTRY_FEE,
        SocialRouletteError::InvalidEntryFee
    );
    
    require!(
        max_rounds > 0 && max_rounds <= MAX_TOURNAMENT_ROUNDS,
        SocialRouletteError::MaxTournamentRoundsReached
    );
    
    require!(
        start_time > clock.unix_timestamp,
        SocialRouletteError::InvalidBettingDuration
    );
    
    // Initialize all tournament fields explicitly
    tournament.tournament_id = tournament_id;
    tournament.creator = ctx.accounts.creator.key();
    tournament.winner = None;
    tournament.entry_fee = entry_fee;
    tournament.prize_pool = 0;
    tournament.start_time = start_time;
    tournament.max_rounds = max_rounds;
    tournament.current_round = 0;
    tournament.participant_count = 0;
    tournament.status = TournamentStatus::Pending;
    tournament.bump = ctx.bumps.tournament;
    
    // Update global state
    global_state.increment_tournaments()?;
    
    emit!(TournamentCreated {
        tournament_id,
        creator: ctx.accounts.creator.key(),
        entry_fee,
        max_rounds,
        start_time,
    });
    
    Ok(())
}
