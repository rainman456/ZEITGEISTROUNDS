// Create tournament context

use anchor_lang::prelude::*;
use crate::state::{GlobalState, Tournament};
use crate::constants::*;

#[derive(Accounts)]
#[instruction(tournament_id: u64)]
pub struct CreateTournament<'info> {
    #[account(
    mut,
    seeds = [GLOBAL_STATE_SEED],
    bump = global_state.bump,
    constraint = !global_state.paused @ crate::errors::SocialRouletteError::ProgramPaused  // ← ADD
)]
pub global_state: Account<'info, GlobalState>,
    
    #[account(
        init,
        payer = creator,
        space = 8 + Tournament::INIT_SPACE,
        seeds = [TOURNAMENT_SEED, tournament_id.to_le_bytes().as_ref()],
        bump
    )]
    pub tournament: Account<'info, Tournament>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}
