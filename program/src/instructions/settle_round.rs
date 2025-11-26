// Settle round instruction

use anchor_lang::prelude::*;
//use anchor_lang::system_program;
use crate::contexts::SettleRound;
use crate::events::RoundSettled;
use crate::errors::SocialRouletteError;
use crate::utils::calculate_platform_fee;

pub fn handler(
    ctx: Context<SettleRound>,
    round_id: u64,
    winning_outcome: u8,
    winning_pool_amount: u64,  // ✅ Keep this parameter
) -> Result<()> {
    let global_state = &ctx.accounts.global_state;
    let round = &mut ctx.accounts.round;
    let clock = Clock::get()?;
    
    // Validate round can be settled
    require!(
        round.can_settle(clock.unix_timestamp),
        SocialRouletteError::BettingStillActive
    );
    
    require!(
        !round.is_settled(),
        SocialRouletteError::RoundAlreadySettled
    );
    
    // Validate winning outcome
    require!(
        winning_outcome < round.num_outcomes,
        SocialRouletteError::InvalidOutcome
    );
    
    // ✅ IMPORTANT: winning_pool_amount must be calculated by backend
    // Backend iterates through all prediction accounts to sum the winning side
    // This value is trusted from admin/oracle
    
    // Calculate platform fee
    let platform_fee = calculate_platform_fee(round.total_pool, global_state.platform_fee_bps)?;
    
    // Transfer platform fee from vault to platform wallet
    if platform_fee > 0 {
        let vault_lamports = ctx.accounts.vault.lamports();
        require!(
            vault_lamports >= platform_fee,
            SocialRouletteError::ArithmeticUnderflow
        );
        
        **ctx.accounts.vault.try_borrow_mut_lamports()? = vault_lamports
            .checked_sub(platform_fee)
            .ok_or(SocialRouletteError::ArithmeticUnderflow)?;
        
        **ctx.accounts.platform_wallet.try_borrow_mut_lamports()? = ctx.accounts.platform_wallet.lamports()
            .checked_add(platform_fee)
            .ok_or(SocialRouletteError::ArithmeticOverflow)?;
    }
    
    // Update round state
    round.platform_fee_collected = platform_fee;
    round.set_winning_outcome(winning_outcome, winning_pool_amount)?;
    
    emit!(RoundSettled {
        round_id,
        winning_outcome,
        total_pool: round.total_pool,
        winning_pool: winning_pool_amount,
        platform_fee,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}