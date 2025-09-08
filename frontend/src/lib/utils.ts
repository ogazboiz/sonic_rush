import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format ETH values
export function formatEth(wei: bigint | string | number | undefined | null): string {
  if (wei === undefined || wei === null) return '0';
  
  try {
    const weiValue = typeof wei === 'bigint' ? wei : BigInt(wei);
    const ethValue = Number(weiValue) / 1e18;
    
    if (ethValue === 0) return '0';
    if (ethValue < 0.0001) return '<0.0001';
    if (ethValue < 1) return ethValue.toFixed(4);
    if (ethValue < 1000) return ethValue.toFixed(3);
    
    return ethValue.toLocaleString('en-US', { maximumFractionDigits: 2 });
  } catch (error) {
    return '0';
  }
}

// Format time duration
export function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

// Format time remaining
export function getTimeRemaining(endTime: bigint): string {
  const now = Math.floor(Date.now() / 1000);
  const end = Number(endTime);
  const remaining = end - now;

  if (remaining <= 0) return 'Completed';
  return formatDuration(remaining);
}

// Calculate APY from reward rate (basis points per second)
export function calculateAPY(rewardRateBps: bigint | undefined | null): number {
  if (rewardRateBps === undefined || rewardRateBps === null) return 0;
  
  try {
    const bpsPerSecond = Number(rewardRateBps);
    const secondsPerYear = 365 * 24 * 60 * 60;
    return (bpsPerSecond * secondsPerYear) / 100; // Convert basis points to percentage
  } catch (error) {
    return 0;
  }
}

// Format address for display
export function truncateAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Calculate streaming progress
export function getStreamProgress(stream: {
  startTime: bigint;
  stopTime: bigint;
}): number {
  const now = Math.floor(Date.now() / 1000);
  const start = Number(stream.startTime);
  const end = Number(stream.stopTime);
  
  if (now <= start) return 0;
  if (now >= end) return 100;
  
  return ((now - start) / (end - start)) * 100;
}

// Format percentage
export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}