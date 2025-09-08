import { createConfig, http } from 'wagmi';

// TimeFlowVault Contract Addresses - Sonic Network
export const TIMEFLOW_CONTRACT_ADDRESSES = {
  // Sonic Testnet addresses
  SONIC_TESTNET_TIMEFLOW_VAULT: '0x0f764437ffBE1fcd0d0d276a164610422710B482',
  
  // Sonic Mainnet addresses (add when deployed)
  SONIC_TIMEFLOW_VAULT: process.env.NEXT_PUBLIC_SONIC_TIMEFLOW_VAULT_ADDRESS || '0x0000000000000000000000000000000000000000',
};

// Multi-chain contract selection based on chain ID
export const getContractAddresses = (chainId?: number) => {
  // If no chainId provided, use environment-based selection
  if (!chainId) {
    const isMainnet = process.env.NEXT_PUBLIC_ENVIRONMENT === 'mainnet';
    
    if (isMainnet) {
      // Default to Sonic mainnet in production (when available)
      return {
        TIMEFLOW_VAULT: TIMEFLOW_CONTRACT_ADDRESSES.SONIC_TIMEFLOW_VAULT,
      };
    } else {
      // Default to Sonic testnet in development
      return {
        TIMEFLOW_VAULT: TIMEFLOW_CONTRACT_ADDRESSES.SONIC_TESTNET_TIMEFLOW_VAULT,
      };
    }
  }

  // Chain-specific contract selection
  switch (chainId) {
    case 14601: // Sonic Testnet
      return {
        TIMEFLOW_VAULT: TIMEFLOW_CONTRACT_ADDRESSES.SONIC_TESTNET_TIMEFLOW_VAULT,
      };
    
    case 146: // Sonic Mainnet (when available)
      return {
        TIMEFLOW_VAULT: TIMEFLOW_CONTRACT_ADDRESSES.SONIC_TIMEFLOW_VAULT,
      };
    
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }
};

// Custom Sonic Testnet chain definition
export const sonicTestnet = {
  id: 14601,
  name: 'Sonic Testnet',
  network: 'sonic-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Sonic',
    symbol: 'S',
  },
  rpcUrls: {
    public: { http: ['https://rpc.testnet.soniclabs.com'] },
    default: { http: ['https://rpc.testnet.soniclabs.com'] },
  },
  blockExplorers: {
    etherscan: { 
      name: 'Sonic Scan', 
      url: 'https://testnet.sonicscan.org' 
    },
    default: { 
      name: 'Sonic Scan', 
      url: 'https://testnet.sonicscan.org' 
    },
  },
  testnet: true,
} as const;

// Custom Sonic Mainnet chain definition (for future use)
export const sonicMainnet = {
  id: 146,
  name: 'Sonic',
  network: 'sonic',
  nativeCurrency: {
    decimals: 18,
    name: 'Sonic',
    symbol: 'S',
  },
  rpcUrls: {
    public: { http: ['https://rpc.soniclabs.com'] },
    default: { http: ['https://rpc.soniclabs.com'] },
  },
  blockExplorers: {
    etherscan: { 
      name: 'Sonic Scan', 
      url: 'https://sonicscan.org' 
    },
    default: { 
      name: 'Sonic Scan', 
      url: 'https://sonicscan.org' 
    },
  },
  testnet: false,
} as const;

export const WAGMI_CHAINS = {
  sonicTestnet,
  sonicMainnet,
};

export const wagmiConfig = createConfig({
  chains: [sonicTestnet],
  transports: {
    [sonicTestnet.id]: http('https://rpc.testnet.soniclabs.com'),
    // [sonicMainnet.id]: http('https://rpc.soniclabs.com'), // Enable when mainnet is available
  },
});