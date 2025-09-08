"use client";
import { createAppKit } from "@reown/appkit/react";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { ReactNode } from "react";

// Sonic Network definitions
const sonicTestnet: AppKitNetwork = {
  id: 14601,
  name: 'Sonic Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Sonic',
    symbol: 'S',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.soniclabs.com'],
    },
    public: {
      http: ['https://rpc.testnet.soniclabs.com'],
    },
  },
  blockExplorers: {
    default: { name: 'Sonic Scan', url: 'https://testnet.sonicscan.org' },
  },
  testnet: true,
};

// Environment detection - default to testnet for now
const isMainnet = process.env.NEXT_PUBLIC_ENVIRONMENT === 'mainnet';

// Network configurations for TimeFlowVault
const testnetNetworks: [AppKitNetwork, ...AppKitNetwork[]] = [
  sonicTestnet,
];

// Use appropriate networks based on environment (currently only testnet available)
const supportedNetworks = testnetNetworks;

// 1. Get projectId at https://cloud.reown.com
const projectId = "8387f0bbb57a265cd4dd96c3e658ac55";

// 2. Create metadata for TimeFlowVault
const metadata = {
  name: "TimeFlowVault",
  description: "Hybrid protocol combining real-time money streaming with DeFi vault functionality on Sonic",
  url: "https://timeflowvault.com", 
  icons: ["https://timeflowvault.com/logo.png"],
};

// Get primary network info for logging
const primaryNetwork = supportedNetworks[0];
const networkType = isMainnet ? 'Mainnet' : 'Testnet';

// Log environment info for debugging
console.log(`⚡ TimeFlowVault Environment: ${primaryNetwork.name} ${networkType}`);
console.log(`📡 Supported Networks:`, supportedNetworks.map(n => `${n.name} (${n.id})`));
console.log(`🚀 Primary Network: ${primaryNetwork.name} - Chain ID ${primaryNetwork.id}`);

if (primaryNetwork.id === 14601) {
  console.log(`✅ Sonic Testnet ready for TimeFlowVault!`);
  console.log(`🔗 Explorer: https://testnet.sonicscan.org`);
  console.log(`💧 RPC: https://rpc.testnet.soniclabs.com`);
  console.log(`💰 Faucet: https://testnet.soniclabs.com/account`);
}

// 3. Create the AppKit instance
createAppKit({
  adapters: [new EthersAdapter()],
  metadata,
  networks: supportedNetworks,
  projectId,
  features: {
    analytics: true,
    email: true,
    socials: ['google', 'x', 'github'],
  },
  // Testnet specific configurations  
  defaultNetwork: sonicTestnet,
});

interface AppKitProps {
  children: ReactNode;
}

export function AppKit({ children }: AppKitProps) {
  return <>{children}</>;
}

// Export network info for use in other components
export const NETWORK_INFO = {
  isMainnet,
  primaryNetwork,
  supportedNetworks,
  sonicTestnet,
};