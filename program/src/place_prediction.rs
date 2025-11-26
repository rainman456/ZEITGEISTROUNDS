// Place prediction context

use anchor_lang::prelude::*;
use crate::state::{GlobalState, Round, Prediction};
use crate::constants::*;

#[derive(Accounts)]
#[instruction(round_id: u64, outcome: u8)]
pub struct PlacePrediction<'info> {
    #[account(
        seeds = [GLOBAL_STATE_SEED],
        bump = global_state.bump
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
        payer = user,
        space = 8 + Prediction::INIT_SPACE,
        seeds = [
            PREDICTION_SEED,
            round.key().as_ref(),
            user.key().as_ref(),
            outcome.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub prediction: Account<'info, Prediction>,
    
    /// CHECK: Vault PDA for holding funds
    #[account(
        mut,
        seeds = [VAULT_SEED, round.key().as_ref()],
        bump
    )]
    pub vault: AccountInfo<'info>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}
