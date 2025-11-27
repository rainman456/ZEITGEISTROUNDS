use anchor_lang::prelude::*;
use crate::state::GlobalState;
use crate::constants::*;

#[derive(Accounts)]
pub struct PauseProgram<'info> {
    #[account(
        mut,
        seeds = [GLOBAL_STATE_SEED],
        bump = global_state.bump,
        constraint = global_state.admin == admin.key() @ crate::errors::SocialRouletteError::Unauthorized
    )]
    pub global_state: Account<'info, GlobalState>,
    
    pub admin: Signer<'info>,
}