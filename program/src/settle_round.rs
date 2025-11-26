// Settle round context

use anchor_lang::prelude::*;
use crate::state::{GlobalState, Round};
use crate::constants::*;

#[derive(Accounts)]
#[instruction(round_id: u64)]
pub struct SettleRound<'info> {
    #[account(
        seeds = [GLOBAL_STATE_SEED],
        bump = global_state.bump,
        constraint = global_state.admin == admin.key() @ crate::errors::SocialRouletteError::Unauthorized
    )]
    pub global_state: Account<'info, GlobalState>,
    
    #[account(
        mut,
        seeds = [ROUND_SEED, round_id.to_le_bytes().as_ref()],
        bump = round.bump
    )]
    pub round: Account<'info, Round>,
    
    pub admin: Signer<'info>,
}
