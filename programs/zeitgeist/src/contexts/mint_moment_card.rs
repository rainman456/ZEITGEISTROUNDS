use anchor_lang::prelude::*;
use crate::state::{Round, Prediction};
use crate::constants::*;

#[derive(Accounts)]
#[instruction(round_id: u64)]
pub struct MintMomentCard<'info> {
    #[account(
        seeds = [ROUND_SEED, round_id.to_le_bytes().as_ref()],
        bump = round.bump
    )]
    pub round: Account<'info, Round>,
    
    #[account(
        seeds = [PREDICTION_SEED, round_id.to_le_bytes().as_ref(), user.key().as_ref()],
        bump = prediction.bump,
        constraint = prediction.user == user.key()
    )]
    pub prediction: Account<'info, Prediction>,
    
    /// CHECK: Merkle tree account - must be mutable for Bubblegum
    #[account(mut)]
    pub merkle_tree: UncheckedAccount<'info>,
    
    /// CHECK: Tree authority PDA - must be mutable for Bubblegum
    #[account(mut)]  // ← ADD THIS
    pub tree_authority: UncheckedAccount<'info>,
    
    /// CHECK: Collection mint
    pub collection_mint: UncheckedAccount<'info>,
    
    /// CHECK: Collection metadata - must be mutable for Bubblegum
    #[account(mut)]  // ← ADD THIS
    pub collection_metadata: UncheckedAccount<'info>,
    
    /// CHECK: Collection master edition - must be mutable for Bubblegum
    #[account(mut)]  // ← ADD THIS
    pub collection_edition: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// CHECK: Bubblegum program
    pub bubblegum_program: UncheckedAccount<'info>,
    
    /// CHECK: SPL Account Compression program
    pub compression_program: UncheckedAccount<'info>,
    
    /// CHECK: SPL Noop program
    pub log_wrapper: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}