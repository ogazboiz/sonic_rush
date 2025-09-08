// TypeScript interfaces based on SonicRushActivityBased contract

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

// Vault stats: (totalStaked, totalRewardsAvailable, nextStreamId)
export type VaultStats = [bigint, bigint, bigint];

// Fee info: (STREAMING_FEE_BPS, 0, ownerRevenue, charityFunds)
export type FeeInfo = [bigint, bigint, bigint, bigint];

// Revenue split: (stakerShareBPS, ownerShareBPS)
export type RevenueSplit = [bigint, bigint];

// Activity info: (totalStreamVolume24h, lastActivityUpdate, activityScalingFactor)
export type ActivityInfo = [bigint, bigint, bigint];
