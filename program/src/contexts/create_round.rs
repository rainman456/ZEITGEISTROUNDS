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
        bump = global_state.bump,
        constraint = !global_state.paused @ crate::errors::SocialRouletteError::ProgramPaused  // ✅ Add pause check
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
    
    /// CHECK: Vault PDA that will hold round funds
    #[account(
       // init,
       // payer = creator,
        //space = 0,  // ✅ No data, just holds lamports
       // seeds = [VAULT_SEED, round_id.to_le_bytes().as_ref()],
        //bump
        mut,
    seeds = [VAULT_SEED, round_id.to_le_bytes().as_ref()],
    bump
    )]
    pub vault: SystemAccount<'info>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}