import { createConfig, http } from 'wagmi';

// TimeFlowVault Contract Addresses - Sonic Network
export const TIMEFLOW_CONTRACT_ADDRESSES = {
  // Sonic Testnet addresses - CORRECTED!
  SONIC_TESTNET_TIMEFLOW_VAULT: '0x29BA007f6e604BF884968Ce11cB2D8e3b81A6284',
  
  // Sonic Mainnet addresses - LIVE!
  SONIC_TIMEFLOW_VAULT: '0x60bEc5652AeC0b367bf83f84054DC99bB0Bcf15e',
};

// Multi-chain contract selection based on chain ID - Network dependent only!
export const getContractAddresses = (chainId: number) => {
  // Chain-specific contract selection - no environment variables needed
  switch (chainId) {
    case 14601: // Sonic Testnet
      return {
        TIMEFLOW_VAULT: TIMEFLOW_CONTRACT_ADDRESSES.SONIC_TESTNET_TIMEFLOW_VAULT,
      };
    
    case 146: // Sonic Mainnet
      return {
        TIMEFLOW_VAULT: TIMEFLOW_CONTRACT_ADDRESSES.SONIC_TIMEFLOW_VAULT,
      };
    
    default:
      throw new Error(`Unsupported chain ID: ${chainId}. Please connect to Sonic Mainnet (146) or Testnet (14601).`);
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
  chains: [sonicTestnet, sonicMainnet],
  transports: {
    [sonicTestnet.id]: http('https://rpc.testnet.soniclabs.com'),
    [sonicMainnet.id]: http('https://rpc.soniclabs.com'),
  },
});