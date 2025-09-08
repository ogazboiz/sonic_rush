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

const sonicMainnet: AppKitNetwork = {
  id: 146,
  name: 'Sonic',
  nativeCurrency: {
    decimals: 18,
    name: 'Sonic',
    symbol: 'S',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.soniclabs.com'],
    },
    public: {
      http: ['https://rpc.soniclabs.com'],
    },
  },
  blockExplorers: {
    default: { name: 'Sonic Scan', url: 'https://sonicscan.org' },
  },
  testnet: false,
};

// No environment dependency - users choose network in wallet

// Network configurations for TimeFlowVault - Now supporting both!
const allNetworks: [AppKitNetwork, ...AppKitNetwork[]] = [
  sonicMainnet,
  sonicTestnet,
];

// Use all networks - users can choose between mainnet and testnet
const supportedNetworks = allNetworks;

// 1. Get projectId at https://cloud.reown.com
const projectId = "8387f0bbb57a265cd4dd96c3e658ac55";

// 2. Create metadata for TimeFlowVault
const metadata = {
  name: "TimeFlowVault",
  description: "Hybrid protocol combining real-time money streaming with DeFi vault functionality on Sonic",
  url: "https://timeflowvault.com", 
  icons: ["https://timeflowvault.com/logo.png"],
};

// Log supported networks info
console.log(`⚡ TimeFlowVault Networks Available:`);
console.log(`📡 Supported Networks:`, supportedNetworks.map(n => `${n.name} (${n.id})`));
console.log(`🌐 Sonic Mainnet: Chain 146 - Contract: 0x60bEc5652AeC0b367bf83f84054DC99bB0Bcf15e`);
console.log(`🧪 Sonic Testnet: Chain 14601 - Contract: 0x29BA007f6e604BF884968Ce11cB2D8e3b81A6284`);
console.log(`🔄 Contract selection: Automatic based on connected network`);
console.log(`✅ Users can switch networks in wallet to use different contracts`);

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
  // Default to mainnet (users can switch in wallet)
  defaultNetwork: sonicMainnet,
});

interface AppKitProps {
  children: ReactNode;
}

export function AppKit({ children }: AppKitProps) {
  return <>{children}</>;
}

// Export network info for use in other components
export const NETWORK_INFO = {
  supportedNetworks,
  sonicTestnet,
  sonicMainnet,
};