// use anchor_lang::prelude::*;
// use mpl_bubblegum::instructions::MintV1CpiBuilder;
// use mpl_bubblegum::types::{MetadataArgs, TokenProgramVersion, TokenStandard, Collection};
// use crate::contexts::MintMomentCard;
// use crate::errors::SocialRouletteError;

// use anchor_lang::prelude::*;
// use mpl_bubblegum::instructions::MintV1CpiBuilder;
// use mpl_bubblegum::types::{MetadataArgs, TokenProgramVersion, TokenStandard, Collection};
// use solana_program::pubkey::Pubkey as SolanaPubkey;  // ← ADD THIS
// use crate::contexts::MintMomentCard;
// use crate::errors::SocialRouletteError;

// pub fn handler(ctx: Context<MintMomentCard>, round_id: u64) -> Result<()> {
//     let round = &ctx.accounts.round;
//     let prediction = &ctx.accounts.prediction;
    
//     // Validate round is settled
//     require!(
//         round.is_settled(),
//         SocialRouletteError::RoundNotSettled
//     );
    
//     // Determine rarity based on outcome
//     let rarity = if prediction.is_winner(round.winning_outcome) {
//         let win_percentage = (round.winning_pool * 100) / round.total_pool;
        
//         if win_percentage < 20 {
//             "Legendary"
//         } else if win_percentage < 40 {
//             "Epic"
//         } else {
//             "Rare"
//         }
//     } else {
//         "Common"
//     };

//     // Build metadata URI (store full metadata off-chain)
//      let metadata_uri = format!(
//         "https://api.zeitgeist.game/moments/{}/{}",
//         round_id,
//         ctx.accounts.user.key()
//     );

//     // Convert Anchor Pubkey to Solana Pubkey for mpl-bubblegum compatibility
//     let collection_mint_bytes = ctx.accounts.collection_mint.key().to_bytes();
//     let collection_key = SolanaPubkey::new_from_array(collection_mint_bytes);
    
//     // Build metadata with proper types
//     let metadata = MetadataArgs {
//         name: format!("Zeitgeist Round #{}", round_id),
//         symbol: String::from("ZGST"),
//         uri: metadata_uri,
//         seller_fee_basis_points: 0,
//         primary_sale_happened: true,
//         is_mutable: false,
//         edition_nonce: None,
//         token_standard: Some(TokenStandard::NonFungible),
//         collection: Some(Collection {
//             verified: false,
//             key: collection_key,  // ← Now uses SolanaPubkey
//         }),
//         uses: None,
//         token_program_version: TokenProgramVersion::Original,
//         creators: vec![],
//     };

//     // Get account infos
//     let tree_config = &ctx.accounts.tree_authority.to_account_info();
//     let leaf_owner = &ctx.accounts.user.to_account_info();
//     let leaf_delegate = &ctx.accounts.user.to_account_info();
//     let merkle_tree = &ctx.accounts.merkle_tree.to_account_info();
//     let payer = &ctx.accounts.user.to_account_info();
//     let tree_creator = &ctx.accounts.user.to_account_info();
//     let log_wrapper = &ctx.accounts.log_wrapper.to_account_info();
//     let compression_program = &ctx.accounts.compression_program.to_account_info();
//     let system_program = &ctx.accounts.system_program.to_account_info();
//     let bubblegum = &ctx.accounts.bubblegum_program.to_account_info();

//     // Mint compressed NFT using CPI
//     MintV1CpiBuilder::new(bubblegum)
//         .tree_config(tree_config)
//         .leaf_owner(leaf_owner)
//         .leaf_delegate(leaf_delegate)
//         .merkle_tree(merkle_tree)
//         .payer(payer)
//         .tree_creator_or_delegate(tree_creator)
//         .log_wrapper(log_wrapper)
//         .compression_program(compression_program)
//         .system_program(system_program)
//         .metadata(metadata)
//         .invoke()
//         .map_err(|_| error!(SocialRouletteError::InvalidOracle))?;
    
//     msg!("Minted cNFT for round {} with rarity: {}", round_id, rarity);
    
//     Ok(())
// }




use anchor_lang::prelude::*;
use mpl_bubblegum::{
    instructions::MintV1CpiBuilder,
    types::{MetadataArgs, Creator, Collection, TokenProgramVersion, TokenStandard},
};
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
        let win_percentage = (round.winning_pool * 100) / round.total_pool;
        
        if win_percentage < 20 {
            "Legendary"
        } else if win_percentage < 40 {
            "Epic"
        } else {
            "Rare"
        }
    } else {
        "Common"
    };

    // Build metadata URI (store full metadata off-chain)
    let metadata_uri = format!(
        "https://api.zeitgeist.game/moments/{}/{}",
        round_id,
        ctx.accounts.user.key()
    );

    // Build metadata - mpl-bubblegum 1.4.0 uses Anchor's types directly
    let metadata = MetadataArgs {
        name: format!("Zeitgeist Round #{}", round_id),
        symbol: String::from("ZGST"),
        uri: metadata_uri,
        seller_fee_basis_points: 0,
        primary_sale_happened: true,
        is_mutable: false,
        edition_nonce: None,
        token_standard: Some(TokenStandard::NonFungible),
        collection: Some(Collection {
            verified: false,
            key: ctx.accounts.collection_mint.key(),
        }),
        uses: None,
        token_program_version: TokenProgramVersion::Original,
        creators: vec![],
    };

    // Mint compressed NFT using CPI - mpl-bubblegum 1.4.0 uses Anchor's AccountInfo
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