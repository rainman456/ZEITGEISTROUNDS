// Claim winnings instruction

use anchor_lang::prelude::*;
use crate::contexts::ClaimWinnings;
use crate::events::WinningsClaimed;
use crate::errors::SocialRouletteError;
use crate::utils::calculate_winnings;

pub fn handler(ctx: Context<ClaimWinnings>, round_id: u64) -> Result<()> {
    let round = &ctx.accounts.round;
    let prediction = &mut ctx.accounts.prediction;
    let user_stats = &mut ctx.accounts.user_stats;
    let clock = Clock::get()?;
    
    // Validate round is settled
    require!(
        round.is_settled(),
        SocialRouletteError::RoundNotSettled
    );
    
    // Validate prediction can claim
    require!(
        prediction.can_claim(true),
        SocialRouletteError::AlreadyClaimed
    );
    
    // Validate user is a winner
    require!(
        prediction.is_winner(round.winning_outcome),
        SocialRouletteError::NoWinnings
    );
    
    // Calculate winnings
    let winnings = calculate_winnings(
        prediction.amount,
        round.winning_pool,
        round.total_pool,
        
        round.platform_fee_collected,
        
    )?;
//     round.leaderboard.push((ctx.accounts.user.key(), winnings));
// round.leaderboard.sort_by(|a, b| b.1.cmp(&a.1)); // Sort by winnings desc
    
    require!(winnings > 0, SocialRouletteError::NoWinnings);
    
    // Transfer winnings from vault to user
    let vault_lamports = ctx.accounts.vault.lamports();
    require!(
        vault_lamports >= winnings,
        SocialRouletteError::ArithmeticUnderflow
    );
    
    **ctx.accounts.vault.try_borrow_mut_lamports()? = vault_lamports
        .checked_sub(winnings)
        .ok_or(SocialRouletteError::ArithmeticUnderflow)?;
    
    **ctx.accounts.user.try_borrow_mut_lamports()? = ctx.accounts.user.lamports()
        .checked_add(winnings)
        .ok_or(SocialRouletteError::ArithmeticOverflow)?;
    
    // Mark prediction as claimed
    prediction.mark_claimed()?;
    
    // Update user stats
    user_stats.record_win(winnings)?;
    
    emit!(WinningsClaimed {
        round_id,
        user: ctx.accounts.user.key(),
        amount: winnings,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}
