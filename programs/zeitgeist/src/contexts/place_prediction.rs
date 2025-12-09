// Place prediction context

use anchor_lang::prelude::*;
use crate::state::{GlobalState, Round, Prediction, UserStats};
use crate::constants::*;

#[derive(Accounts)]
#[instruction(round_id: u64, outcome: u8)]
pub struct PlacePrediction<'info> {
    #[account(
        seeds = [GLOBAL_STATE_SEED],
        bump = global_state.bump,
        constraint = !global_state.paused @ crate::errors::SocialRouletteError::ProgramPaused  // ✅ Add pause check
    )]
    pub global_state: Account<'info, GlobalState>,
    
    #[account(
        mut,
        seeds = [ROUND_SEED, round_id.to_le_bytes().as_ref()],
        bump = round.bump
    )]
    pub round: Account<'info, Round>,
    
    #[account(
        init,
        payer = payer,
        space = 8 + Prediction::INIT_SPACE,
        seeds = [
            PREDICTION_SEED,
            round_id.to_le_bytes().as_ref(),
            user.key().as_ref(),
        ],
        bump
    )]
    pub prediction: Account<'info, Prediction>,
    
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + UserStats::INIT_SPACE,
        seeds = [USER_STATS_SEED, user.key().as_ref()],
        bump
    )]
    pub user_stats: Account<'info, UserStats>,
    
    /// CHECK: Vault PDA for holding funds
    #[account(
        mut,
        seeds = [VAULT_SEED, round_id.to_le_bytes().as_ref()],
        bump
    )]
    pub vault: AccountInfo<'info>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// CHECK: User account for PDA derivation (can be anyone in custodial mode)
    pub user: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}