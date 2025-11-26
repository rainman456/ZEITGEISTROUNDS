// Create round context

use anchor_lang::prelude::*;
use crate::state::{GlobalState, Round};
use crate::constants::*;

#[derive(Accounts)]
#[instruction(round_id: u64)]
pub struct CreateRound<'info> {
    #[account(
        mut,
        seeds = [GLOBAL_STATE_SEED],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,
    
    #[account(
        init,
        payer = creator,
        space = 8 + Round::INIT_SPACE,
        seeds = [ROUND_SEED, round_id.to_le_bytes().as_ref()],
        bump
    )]
    pub round: Account<'info, Round>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}
