import { TIMEFLOW_VAULT_ABI } from './timeflow-abi';

// SonicRushActivityBased Contract Addresses  
export const CONTRACT_ADDRESSES = {
  // Sonic Testnet - NEW Activity-Based Contract
  SONIC_TESTNET: '0xF8eF427B959322D568246ffa5cCa16DB06b07a25',
  
  // Sonic Mainnet (add when deployed)
  SONIC_MAINNET: process.env.NEXT_PUBLIC_SONIC_MAINNET_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
} as const;

// Get contract address based on environment and chain ID
export const getContractAddress = (chainId?: number): string => {
  const isMainnet = process.env.NEXT_PUBLIC_ENVIRONMENT === 'mainnet';
  
  // If chainId is provided, use chain-specific logic
  if (chainId) {
    switch (chainId) {
      case 14601: // Sonic Testnet
        return CONTRACT_ADDRESSES.SONIC_TESTNET;
      case 146: // Sonic Mainnet (when available)
        return CONTRACT_ADDRESSES.SONIC_MAINNET;
      default:
        throw new Error(`Unsupported chain ID: ${chainId}`);
    }
  }
  
  // Environment-based selection
  if (isMainnet) {
    return CONTRACT_ADDRESSES.SONIC_MAINNET;
  } else {
    return CONTRACT_ADDRESSES.SONIC_TESTNET;
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