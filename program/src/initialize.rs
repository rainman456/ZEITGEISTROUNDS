// Initialize context

use anchor_lang::prelude::*;
use crate::state::GlobalState;
use crate::constants::*;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + GlobalState::INIT_SPACE,
        seeds = [GLOBAL_STATE_SEED],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}
