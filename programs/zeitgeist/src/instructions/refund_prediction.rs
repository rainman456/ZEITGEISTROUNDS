// Refund prediction instruction

use anchor_lang::prelude::*;
use crate::contexts::RefundPrediction;
use crate::events::PredictionRefunded;
use crate::errors::SocialRouletteError;

pub fn handler(ctx: Context<RefundPrediction>, round_id: u64) -> Result<()> {
    let round = &ctx.accounts.round;
    let prediction = &mut ctx.accounts.prediction;
    let clock = Clock::get()?;
    
    // 1. Validate round is cancelled
    require!(
        round.is_cancelled(),
        SocialRouletteError::RoundNotCancelled
    );
    
    // 2. Validate prediction can be refunded
    require!(
        !prediction.claimed,
        SocialRouletteError::AlreadyClaimed
    );
    
    // Get refund amount (original bet)
    let refund_amount = prediction.amount;
    
    require!(refund_amount > 0, SocialRouletteError::NoRefund);
    
    // 3. Validate vault has sufficient funds
   // let vault_lamports = ctx.accounts.vault.lamports();
   // 4. Transfer refund from vault to user using CPI
    require!(
        ctx.accounts.vault.lamports() >= refund_amount,
        SocialRouletteError::InsufficientVaultBalance
    );
    
    // Create PDA signer seeds for vault
    let round_id_bytes = round_id.to_le_bytes();
    let vault_seeds = &[
        crate::constants::VAULT_SEED,
        round_id_bytes.as_ref(),
        &[ctx.bumps.vault],
    ];
    let vault_signer = &[&vault_seeds[..]];

    // CPI to System Program
    anchor_lang::system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.user.to_account_info(),
            },
            vault_signer,
        ),
        refund_amount,
    )?;
    // 5. Mark prediction as refunded (using claimed flag)
    prediction.mark_claimed()?;
    
    // 6. Emit refund event
    emit!(PredictionRefunded {
        round_id,
        user: ctx.accounts.user.key(),
        amount: refund_amount,
        timestamp: clock.unix_timestamp,
    });
    
    // Note: Account closure (step 6) handled automatically by `close = user` in context
    
    Ok(())
}