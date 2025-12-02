use anchor_lang::prelude::*;
use mpl_bubblegum::{
    instructions::MintV1CpiBuilder,
    types::{MetadataArgs, Collection, TokenProgramVersion, TokenStandard},
};
use crate::contexts::MintMomentCard;
use crate::errors::SocialRouletteError;

pub fn handler(ctx: Context<MintMomentCard>, round_id: u64) -> Result<()> {
    let round = &ctx.accounts.round;
    let prediction = &ctx.accounts.prediction;
    
    require!(round.is_settled(), SocialRouletteError::RoundNotSettled);

     let tree_authority_info = &ctx.accounts.tree_authority;
    if tree_authority_info.data_is_empty() {
        // Tree authority not initialized - this is expected on first use
        // Bubblegum's mint_v1 will handle this automatically
        msg!("Tree authority will be initialized during mint");
    }
    
    let rarity = if prediction.is_winner(round.winning_outcome) {
        let win_percentage = (round.winning_pool * 100) / round.total_pool;
        if win_percentage < 20 { "Legendary" }
        else if win_percentage < 40 { "Epic" }
        else { "Rare" }
    } else { "Common" };

    let metadata_uri = format!("https://api.zeitgeist.game/moments/{}/{}", round_id, ctx.accounts.user.key());

    let metadata = MetadataArgs {
        name: format!("Zeitgeist Round #{}", round_id),
        symbol: "ZGST".to_string(),
        uri: metadata_uri,
        seller_fee_basis_points: 0,
        primary_sale_happened: true,
        is_mutable: false,
        edition_nonce: None,
        token_standard: Some(TokenStandard::NonFungible),
        collection: Some(Collection { 
            verified: false, 
            key: ctx.accounts.collection_mint.key()  // Works with 1.4.0
        }),
        uses: None,
        token_program_version: TokenProgramVersion::Original,
        creators: vec![],
    };

    MintV1CpiBuilder::new(&ctx.accounts.bubblegum_program.to_account_info())
        .tree_config(&ctx.accounts.tree_authority.to_account_info())
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
    
    msg!("Minted cNFT for round {} with rarity: {}", round_id, rarity);
    Ok(())
}