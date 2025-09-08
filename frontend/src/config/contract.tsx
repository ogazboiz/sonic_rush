import { TIMEFLOW_VAULT_ABI } from './timeflow-abi';

// SonicRushActivityBased Contract Addresses - UPDATED!
export const CONTRACT_ADDRESSES = {
  // Sonic Testnet - Latest deployed contract
  SONIC_TESTNET: '0x0f764437ffBE1fcd0d0d276a164610422710B482',
  
  // Sonic Mainnet - LIVE!
  SONIC_MAINNET: '0x60bEc5652AeC0b367bf83f84054DC99bB0Bcf15e',
} as const;

// Get contract address based ONLY on chain ID - no environment variables!
export const getContractAddress = (chainId: number): string => {
  // Chain-specific contract selection - automatic based on connected network
  switch (chainId) {
    case 14601: // Sonic Testnet
      return CONTRACT_ADDRESSES.SONIC_TESTNET;
    case 146: // Sonic Mainnet
      return CONTRACT_ADDRESSES.SONIC_MAINNET;
    default:
      throw new Error(`Unsupported chain ID: ${chainId}. Please connect to Sonic Mainnet (146) or Testnet (14601).`);
  }
};

// Contract configuration
export const TIMEFLOW_VAULT_CONTRACT = {
  abi: TIMEFLOW_VAULT_ABI,
  addresses: CONTRACT_ADDRESSES,
  getAddress: getContractAddress,
} as const;

// Type definitions for contract interactions
export interface Stream {
  sender: string;
  recipient: string;
  totalAmount: bigint;
  flowRate: bigint;
  startTime: bigint;
  stopTime: bigint;
  amountWithdrawn: bigint;
  isActive: boolean;
}

export interface Stake {
  amount: bigint;
  startTime: bigint;
  lastClaimTime: bigint;
  accumulatedRewards: bigint;
  isActive: boolean;
}

export interface VaultInfo {
  name: string;
  staked: bigint;
  rewards: bigint;
  rate: bigint;
  active: boolean;
}