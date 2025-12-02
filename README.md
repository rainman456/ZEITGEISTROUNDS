### ZEITGEISTROUNDS

ZEITGEISTROUNDS is a Solana-based prediction market platform where users can create and participate in game prediction rounds. Users place predictions on outcomes, rounds are settled using oracle price data, and winners can claim rewards, including NFT “moment cards”.

The project is built with:
- **On-chain program**: Rust + Anchor
- **Backend / scripts**: TypeScript / Node.js
- **Blockchain**: Solana (PDAs, SPL tokens)
- **Oracles**: Pyth and Switchboard

---

### Features

- **Tournament and round management**
  - Create tournaments
  - Create and configure prediction rounds
  - Close betting for active rounds
  - Settle rounds using oracle data

- **Predictions and refunds**
  - Place predictions on game outcomes
  - Refund predictions when conditions allow (e.g. cancellations)

- **Rewards and NFTs**
  - Claim winnings after round settlement
  - Mint NFT “moment cards” that represent winning outcomes

- **Admin / safety controls**
  - Initialize global program state
  - Pause and unpause the program
  - Emergency cancel rounds when required

- **Automation support**
  - Scripts and a test runner to simulate full game cycles (create round → place predictions → close betting → settle → claim/refund)

---

### Repository Structure

- **On-chain program (`programs/zeitgeist/`)**
  - `src/lib.rs`: Program entrypoint and instruction wiring
  - `src/constants.rs`: Program-wide constants
  - `src/errors.rs`: Custom error types
  - `src/events.rs`: Emitted events
  - `src/utils.rs`: Shared helpers

  - `src/contexts/`: Anchor account context definitions for each instruction  
    - `initialize.rs`, `create_round.rs`, `create_tournament.rs`, `place_prediction.rs`, `refund_prediction.rs`, `settle_round.rs`, `claim_winnings.rs`, `mint_moment_card.rs`, `close_betting.rs`, `pause_program.rs`, `unpause_program.rs`, `emergency_cancel.rs`, `mod.rs`

  - `src/instructions/`: Instruction handlers implementing the core business logic  
    - Mirrors the files in `contexts/` (e.g. `create_round.rs`, `place_prediction.rs`, `settle_round.rs`, etc.)

  - `src/state/`: On-chain account state types  
    - `global_state.rs`, `tournament.rs`, `round.rs`, `prediction.rs`, `user_stats.rs`, `mod.rs`

  - `src/oracle/`: Oracle integrations  
    - `onchain.rs`: Common on-chain oracle logic
    - `pyth.rs`: Pyth-specific integration
    - `switchboard.rs`: Switchboard-specific integration
    - `mod.rs`

- **Backend / scripts (`backend/`)**
  - `idl/zeitgeist.json`: Anchor-generated IDL describing the program interface
  - `keypairs/payer.json`: Local wallet keypair (for dev/test)
  - `src/blockchain/`:
    - `program.ts`: Program connection and Anchor client setup
    - `pdas.ts`: PDA derivation helpers
  - `src/config/`:
    - `solana.config.ts`: Solana RPC and network configuration
  - `src/services/`: High-level service functions wrapping on-chain calls
    - `initialize.service.ts`, `round.service.ts`, `prediction.service.ts`, `claims.service.ts`, `refund.service.ts`, `settlement.service.ts`
    - `admin.service.ts` (pause/unpause, emergency controls)
    - `nft.service.ts` (moment card minting)
    - `oracle.service.ts` (oracle-related helpers)
  - `src/scripts/`:
    - `create-test-round.ts`: Creates a sample round
    - `place-test-prediction.ts`: Places sample predictions
    - `full-game-cycle.ts`: Runs a full round lifecycle end-to-end
  - `src/utils/`:
    - `airdrop.ts`: Airdrops devnet/test SOL to a wallet
    - `keypair-generator.ts`: Utility to generate keypairs
  - `src/test-runner.ts`: Orchestrates end-to-end test flows using services and scripts

---

### Requirements

- **System**
  - Node.js (LTS recommended)
  - Yarn (for the backend)
  - Rust + Cargo
  - Anchor CLI
  - Solana CLI

- **Solana / Anchor**
  - Solana CLI configured (e.g. `solana config set --url localhost` for localnet)
  - Local validator or access to devnet/mainnet as desired
  - Anchor installed and configured

---

### Environment Configuration

The backend expects environment variables (typically in `backend/.env`) similar to:

- **Wallet / identity**
  - Path to the payer keypair (e.g. `backend/keypairs/payer.json`)

- **RPC**
  - Solana RPC endpoint URL (local validator, devnet, or other cluster)

- **Oracles**
  - Pyth and/or Switchboard account addresses for required feeds

Adjust `backend/src/config/solana.config.ts` and `.env` according to your environment.

---

### Getting Started

#### 1. Install dependencies

From the project root:

```bash
cd backend
yarn install