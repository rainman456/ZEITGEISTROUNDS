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
    let vault_lamports = ctx.accounts.vault.lamports();
    require!(
        vault_lamports >= refund_amount,
        SocialRouletteError::InsufficientVaultBalance
    );
    
    // 4. Transfer refund from vault to user
    **ctx.accounts.vault.try_borrow_mut_lamports()? = vault_lamports
        .checked_sub(refund_amount)
        .ok_or(SocialRouletteError::ArithmeticUnderflow)?;
    
    **ctx.accounts.user.try_borrow_mut_lamports()? = ctx.accounts.user.lamports()
        .checked_add(refund_amount)
        .ok_or(SocialRouletteError::ArithmeticOverflow)?;
    
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