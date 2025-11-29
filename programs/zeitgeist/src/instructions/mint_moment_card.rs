use anchor_lang::prelude::*;
use mpl_bubblegum::instructions::MintV1CpiBuilder;
use mpl_bubblegum::types::{MetadataArgs, TokenProgramVersion, TokenStandard, Collection};
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
// Build metadata URI (store full metadata off-chain)
let metadata_uri = format!(
    "https://api.zeitgeist.game/moments/{}/{}",
    round_id,
    ctx.accounts.user.key()
);

// Build metadata
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
// Mint compressed NFT using CPI - use as_ref() to convert UncheckedAccount to AccountInfo
MintV1CpiBuilder::new(ctx.accounts.bubblegum_program.as_ref())
    .tree_config(ctx.accounts.tree_authority.as_ref())
    .leaf_owner(ctx.accounts.user.to_account_info().as_ref())
    .leaf_delegate(ctx.accounts.user.to_account_info().as_ref())
    .merkle_tree(ctx.accounts.merkle_tree.as_ref())
    .payer(ctx.accounts.user.to_account_info().as_ref())
    .tree_creator_or_delegate(ctx.accounts.user.to_account_info().as_ref())
    .log_wrapper(ctx.accounts.log_wrapper.as_ref())
    .compression_program(ctx.accounts.compression_program.as_ref())
    .system_program(ctx.accounts.system_program.to_account_info().as_ref())
    .metadata(metadata)
    .invoke()
    .map_err(|e| {
        msg!("Error minting cNFT: {:?}", e);
        error!(SocialRouletteError::InvalidOracle)
    })?;
    
    msg!("Minted cNFT for round {} with rarity: {}", round_id, rarity);
    
    Ok(())
}