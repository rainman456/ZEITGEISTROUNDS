use crate::constants::VAULT_SEED;
use crate::contexts::SettleRound;
use crate::errors::SocialRouletteError;
use crate::events::RoundSettled;
use crate::state::VerificationMethod;
use crate::utils::calculate_platform_fee;
use anchor_lang::prelude::*;

pub fn handler(
    ctx: Context<SettleRound>,
    round_id: u64,
    winning_pool_amount: u64, // Still needed - calculated by backend
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

    // ✅ NEW: Determine winning outcome based on verification method
    let winning_outcome = match round.verification_method {
        VerificationMethod::PythPrice => {
            // Verify Pyth price feed
            crate::oracle::pyth::verify_pyth_price(
                round,
                &ctx.accounts.oracle_data,
                clock.unix_timestamp,
            )?
        }
        VerificationMethod::SwitchboardVRF => {
            // Verify Switchboard VRF randomness
            crate::oracle::switchboard::verify_switchboard_vrf(
                &ctx.accounts.oracle_data,
                round.num_outcomes,
            )?
        }
        VerificationMethod::OnChainData => {
            // Verify on-chain data (block time, slot, etc.)
            crate::oracle::onchain::verify_onchain_data(
                &ctx.accounts.oracle_data,
                round.target_value,
                round.num_outcomes,
            )?
        }
        VerificationMethod::TwitterAPI => {
            // For Twitter API and other off-chain data, admin must provide outcome manually
            // This verification method requires the old flow
            return Err(SocialRouletteError::RequiresOffChainOracle.into());
        }
    };

    // Validate winning outcome is within range
    require!(
        winning_outcome < round.num_outcomes,
        SocialRouletteError::InvalidOutcome
    );

    // ✅ NOTE: winning_pool_amount must still be calculated by backend
    // Backend iterates through all prediction accounts to sum amounts where:
    // prediction.outcome == winning_outcome
    // This is too expensive to do on-chain due to compute limits

    // Calculate platform fee
    let platform_fee = calculate_platform_fee(round.total_pool, global_state.platform_fee_bps)?;

    // Transfer platform fee from vault to platform wallet
   // Transfer platform fee from vault to platform wallet using CPI
    if platform_fee > 0 {
        let vault_lamports = ctx.accounts.vault.lamports();
        require!(
            vault_lamports >= platform_fee,
            SocialRouletteError::InsufficientVaultBalance
        );

        // Create PDA signer seeds for vault
        let round_id_bytes = round_id.to_le_bytes();
        let vault_seeds = &[
            VAULT_SEED,
            round_id_bytes.as_ref(),
            &[ctx.bumps.vault],
        ];
        let vault_signer = &[&vault_seeds[..]];

        // CPI to System Program to transfer from vault to platform wallet
        anchor_lang::system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.platform_wallet.to_account_info(),
                },
                vault_signer,
            ),
            platform_fee,
        )?;
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
