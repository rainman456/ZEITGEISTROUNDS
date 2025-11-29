// // Settle round context

// use anchor_lang::prelude::*;
// use crate::state::{GlobalState, Round};
// use crate::constants::*;

// #[derive(Accounts)]
// #[instruction(round_id: u64)]
// pub struct SettleRound<'info> {
//     #[account(
//         seeds = [GLOBAL_STATE_SEED],
//         bump = global_state.bump,
//         constraint = global_state.admin == admin.key() @ crate::errors::SocialRouletteError::Unauthorized
//     )]
//     pub global_state: Account<'info, GlobalState>,
    
//     #[account(
//         mut,
//         seeds = [ROUND_SEED, round_id.to_le_bytes().as_ref()],
//         bump = round.bump
//     )]
//     pub round: Account<'info, Round>,
    
//     /// CHECK: Vault PDA holding round funds
//     #[account(
//         mut,
//         seeds = [VAULT_SEED, round_id.to_le_bytes().as_ref()],
//         bump
//     )]
//     pub vault: AccountInfo<'info>,
    
//     /// CHECK: Platform fee recipient
//      #[account(
//         mut,
//         constraint = platform_wallet.key() == global_state.platform_wallet @ crate::errors::SocialRouletteError::Unauthorized  // ✅ ADD THIS
//     )]
//     pub platform_wallet: AccountInfo<'info>,
    
//     pub admin: Signer<'info>,




//     pub oracle_data: AccountInfo<'info>,
    
//     /// CHECK: Oracle authority that can settle
//     #[account(
//         constraint = oracle.key() == round.oracle @ crate::errors::SocialRouletteError::Unauthorized
//     )]
//     pub oracle: Signer<'info>,
    
//     pub system_program: Program<'info, System>,
// }


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
    
    /// CHECK: Vault PDA holding round funds
    #[account(
        mut,
        seeds = [VAULT_SEED, round_id.to_le_bytes().as_ref()],
        bump
    )]
    pub vault: AccountInfo<'info>,
    
    /// CHECK: Platform fee recipient
    #[account(
        mut,
        constraint = platform_wallet.key() == global_state.platform_wallet @ crate::errors::SocialRouletteError::Unauthorized
    )]
    pub platform_wallet: AccountInfo<'info>,
    
    /// CHECK: Oracle data source (Pyth price feed, Switchboard VRF, or on-chain data)
    /// This account is validated inside the instruction based on verification_method
    pub oracle_data: AccountInfo<'info>,
    
    /// CHECK: Oracle authority - must match round.oracle for automated settlement
    #[account(
        constraint = oracle.key() == round.oracle @ crate::errors::SocialRouletteError::Unauthorized
    )]
    pub oracle: Signer<'info>,
    
    pub admin: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}