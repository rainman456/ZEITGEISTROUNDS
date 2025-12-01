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
    // Transfer winnings from vault to user using CPI
    require!(
        ctx.accounts.vault.lamports() >= winnings,
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

    // CPI to System Program to transfer from vault to user
    anchor_lang::system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.user.to_account_info(),
            },
            vault_signer,
        ),
        winnings,
    )?;
    
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
