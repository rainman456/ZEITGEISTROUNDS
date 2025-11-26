// Claim winnings context

use anchor_lang::prelude::*;
use crate::state::{Round, Prediction};
use crate::constants::*;

#[derive(Accounts)]
#[instruction(round_id: u64)]
pub struct ClaimWinnings<'info> {
    #[account(
        mut,
        seeds = [ROUND_SEED, round_id.to_le_bytes().as_ref()],
        bump = round.bump
    )]
    pub round: Account<'info, Round>,
    
    #[account(
        mut,
        seeds = [
            PREDICTION_SEED,
            round.key().as_ref(),
            user.key().as_ref(),
            &[round.winning_outcome.unwrap()]
        ],
        bump = prediction.bump,
        close = user
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
