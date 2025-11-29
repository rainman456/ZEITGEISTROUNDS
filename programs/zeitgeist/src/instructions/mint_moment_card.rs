use anchor_lang::prelude::*;
use mpl_bubblegum::instructions::MintV1CpiBuilder;
use mpl_bubblegum::types::{MetadataArgs, TokenProgramVersion, TokenStandard};
use crate::contexts::MintMomentCard;
use crate::errors::SocialRouletteError;

pub fn handler(ctx: Context<MintMomentCard>, round_id: u64) -> Result<()> {
    let round = &ctx.accounts.round;
    let prediction = &ctx.accounts.prediction;
    
    // Validate round is settled
    require!(
        round.is_settled(),
        SocialRouletteError::RoundNotSettled
    );
    
    // Determine rarity based on outcome
    let rarity = if prediction.is_winner(round.winning_outcome) {
        if prediction.outcome != round.winning_outcome {
            "Legendary" // Wrong prediction but won (impossible, but for edge cases)
        } else {
            // Calculate if underdog win
            let win_percentage = (round.winning_pool * 100) / round.total_pool;
            if win_percentage < 30 {
                "Legendary" // Underdog win
            } else {
                "Rare" // Normal win
            }
        }
    } else {
        "Common" // Loss
    };
    
    // Build metadata
    let metadata = MetadataArgs {
        name: format!("Zeitgeist Round #{}", round_id),
        symbol: "ZGST".to_string(),
        uri: format!(
            "https://api.zeitgeist.game/moments/{}/{}",
            round_id,
            ctx.accounts.user.key()
        ),
        seller_fee_basis_points: 0,
        primary_sale_happened: true,
        is_mutable: false,
        edition_nonce: None,
        token_standard: Some(TokenStandard::NonFungible),
        collection: Some(mpl_bubblegum::types::Collection {
            verified: false,
            key: ctx.accounts.collection_mint.key(),
        }),
        uses: None,
        token_program_version: TokenProgramVersion::Original,
        creators: vec![],
    };
    
    // Mint compressed NFT
    MintV1CpiBuilder::new(&ctx.accounts.bubblegum_program)
        .tree_config(&ctx.accounts.tree_authority)
        .leaf_owner(&ctx.accounts.user.to_account_info())
        .leaf_delegate(&ctx.accounts.user.to_account_info())
        .merkle_tree(&ctx.accounts.merkle_tree.to_account_info())
        .payer(&ctx.accounts.user.to_account_info())
        .tree_creator_or_delegate(&ctx.accounts.user.to_account_info())
        .log_wrapper(&ctx.accounts.log_wrapper.to_account_info())
        .compression_program(&ctx.accounts.compression_program.to_account_info())
        .system_program(&ctx.accounts.system_program.to_account_info())
        .metadata(metadata)
        .invoke()?;
    
    Ok(())
}