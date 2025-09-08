'use client'

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useReadContract, useAccount } from 'wagmi';
import { getContractAddresses, SONIC_RUSH_ABI } from '@/config/contracts';
import { formatEther } from 'viem';
import { TrendingUp, Gift } from 'lucide-react';
import { truncateAddress } from '@/lib/utils';
import { Stream, VaultStats } from '@/types/contract';

export default function VaultOverview() {
  const { isConnected } = useAccount();
  const [recentStreams, setRecentStreams] = useState<Stream[]>([]);
  const contracts = getContractAddresses();


  // Get vault stats  
  const { data: vaultStats } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'getVaultStats',
    query: {
      enabled: typeof window !== 'undefined',
    }
  }) as { data: VaultStats | undefined };

  // Get current APY
  const { data: currentAPY } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'getCurrentAPY',
    query: {
      enabled: typeof window !== 'undefined',
    }
  });

  // Get activity info
  const { data: activityInfo } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'getActivityInfo',
    query: {
      enabled: typeof window !== 'undefined',
    }
  });

  // Get balance info
  const { data: balanceInfo } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'getBalanceInfo',
    query: {
      enabled: typeof window !== 'undefined',
    }
  });

  // Get excess funds
  const { data: excessFunds } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'calculateExcessFunds',
    query: {
      enabled: typeof window !== 'undefined',
    }
  });

  // Get vault active status - using a different approach since vaultActive is a public variable
  const vaultActive = true; // For now, assume vault is always active

  // Get fee info
  const { data: feeInfo } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'getFeeInfo',
    query: {
      enabled: typeof window !== 'undefined',
    }
  });

  // Get total streams
  const { data: totalStreams } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'getTotalStreams',
    query: {
      enabled: typeof window !== 'undefined',
    }
  });

  // Effect to fetch recent streams
  useEffect(() => {
    const fetchRecentStreams = async () => {
      if (!totalStreams || totalStreams === BigInt(0)) {
        setRecentStreams([]);
        return;
      }

      console.log('VaultOverview - Fetching streams, total:', totalStreams.toString());
      
      const streams = [];
      const streamCount = Number(totalStreams);
      
      // Get the most recent 5 streams (or all streams if less than 5)
      const streamsToFetch = Math.min(5, streamCount);
      
      for (let i = 0; i < streamsToFetch; i++) {
        const streamId = streamCount - 1 - i; // Start from newest
        try {
          // We can't use useReadContract in a loop, so we'll need a different approach
          // For now, let's just get the latest one and show it properly
          if (i === 0) {
            // This will be handled by the separate useReadContract call below
          }
        } catch (error) {
          console.error('Error preparing stream fetch for ID', streamId, error);
        }
      }
    };

    fetchRecentStreams();
  }, [totalStreams]);

  // Get the latest 5 streams
  const { data: stream1 } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'getStream',
    args: totalStreams && totalStreams > BigInt(0) ? [totalStreams - BigInt(1)] : undefined,
    query: {
      enabled: typeof window !== 'undefined' && !!totalStreams && totalStreams > BigInt(0),
    }
  });

  const { data: stream2 } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'getStream',
    args: totalStreams && totalStreams > BigInt(1) ? [totalStreams - BigInt(2)] : undefined,
    query: {
      enabled: typeof window !== 'undefined' && !!totalStreams && totalStreams > BigInt(1),
    }
  });

  const { data: stream3 } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'getStream',
    args: totalStreams && totalStreams > BigInt(2) ? [totalStreams - BigInt(3)] : undefined,
    query: {
      enabled: typeof window !== 'undefined' && !!totalStreams && totalStreams > BigInt(2),
    }
  });

  const { data: stream4 } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'getStream',
    args: totalStreams && totalStreams > BigInt(3) ? [totalStreams - BigInt(4)] : undefined,
    query: {
      enabled: typeof window !== 'undefined' && !!totalStreams && totalStreams > BigInt(3),
    }
  });

  const { data: stream5 } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'getStream',
    args: totalStreams && totalStreams > BigInt(4) ? [totalStreams - BigInt(5)] : undefined,
    query: {
      enabled: typeof window !== 'undefined' && !!totalStreams && totalStreams > BigInt(4),
    }
  });

  // Effect to update recent streams when we get data
  useEffect(() => {
    const streams: Stream[] = [];
    const streamData = [stream1, stream2, stream3, stream4, stream5];
    
    console.log('VaultOverview - Fetched streams:', streamData);
    console.log('VaultOverview - totalStreams:', totalStreams?.toString());
    
    // Add streams in order (newest first)
    streamData.forEach((stream, index) => {
      if (stream && stream.sender !== '0x0000000000000000000000000000000000000000') {
        streams.push({
          sender: stream.sender,
          recipient: stream.recipient,
          totalAmount: stream.totalAmount,
          flowRate: stream.flowRate,
          startTime: stream.startTime,
          stopTime: stream.stopTime,
          amountWithdrawn: stream.amountWithdrawn,
          isActive: stream.isActive
        });
      }
    });

    setRecentStreams(streams);
  }, [stream1, stream2, stream3, stream4, stream5, totalStreams]);

  return (
    <div className="space-y-6">
      {/* Vault Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              Vault Status
            </CardTitle>
            <CardDescription>
              Current vault information and statistics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Vault Name</p>
                <p className="font-semibold">SonicRush</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  vaultActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {vaultActive ? 'Active' : 'Paused'}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Staked</p>
                <p className="font-semibold">{vaultStats ? formatEther(vaultStats[0]) : '0'} S</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Rewards Available</p>
                <p className="font-semibold">{vaultStats ? formatEther(vaultStats[1]) : '0'} S</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Fee Information</CardTitle>
            <CardDescription>
              Streaming fees and collected amounts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Streaming Fee</p>
                <p className="font-semibold">0.1% (10 BPS)</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Fees Collected</p>
                <p className="font-semibold">{feeInfo ? formatEther(feeInfo[1]) : '0'} S</p>
              </div>
            </div>
            <div className="pt-2">
              <p className="text-xs text-gray-500">
                Streaming fees are automatically added to the rewards pool
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Activity & Excess Bonus Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Current Activity
            </CardTitle>
            <CardDescription>
              Real-time activity metrics and APY
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Current APY</p>
                <p className="font-semibold text-lg">
                  {currentAPY ? `${(Number(currentAPY) / 100).toFixed(2)}%` : '0.00%'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">24h Volume</p>
                <p className="font-semibold">
                  {activityInfo ? formatEther(activityInfo[0]) : '0'} S
                </p>
                <p className="text-xs text-gray-500">
                  {activityInfo && activityInfo[0] > BigInt(0) ? 
                    'Activity detected - rewards active' : 
                    'No activity - no time rewards'
                  }
                </p>
              </div>
            </div>
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Activity Scaling</span>
                <span>
                  {activityInfo ? `${Number(activityInfo[2]) / 1000}x` : '1.0x'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-500" />
              Excess Bonus Pool
            </CardTitle>
            <CardDescription>
              Additional rewards when platform is profitable
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Available Excess</p>
                <p className="font-semibold text-lg">
                  {excessFunds ? formatEther(excessFunds) : '0'} S
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Staker Bonus</p>
                <p className="font-semibold">20% of excess</p>
              </div>
            </div>
            <div className="pt-2">
              <p className="text-xs text-gray-500">
                Excess funds distributed: 50% owner, 30% charity, 20% stakers
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest 5 streams and platform activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!isConnected ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Connect your wallet to see recent activity</p>
                  <div className="mt-4">
                    <w3m-button />
                  </div>
                </div>
              ) : recentStreams.length > 0 ? (
                <>
                  {recentStreams.map((stream, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 text-sm font-semibold">S{index}</span>
                        </div>
                        <div>
                          <p className="font-medium">Stream Created</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {truncateAddress(stream.sender)} → {truncateAddress(stream.recipient)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatEther(stream.totalAmount)} S</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(Number(stream.startTime) * 1000).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div className="text-center">
                    <p className="text-xs text-gray-500">
                      Total Streams Created: {totalStreams?.toString() || '0'} • Platform Fees: {formatEther(feeInfo?.[1] || BigInt(0))} S
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Showing {recentStreams.length} most recent streams
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No recent streaming activity</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Create streams to see them appear here • Shows last 5 streams
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* How It Works */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 border-0">
          <CardHeader>
            <CardTitle className="text-blue-700 dark:text-blue-300">💰 Staking</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• Stake S tokens to earn platform rewards</li>
              <li>• Earn your share of all streaming fees (0.1%)</li>
              <li>• Claim rewards anytime, unstake flexibly</li>
              <li>• Activity-based APY up to 40% cap</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 border-0">
          <CardHeader>
            <CardTitle className="text-purple-700 dark:text-purple-300">🌊 Streaming</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• Stream S tokens continuously per second</li>
              <li>• Recipients withdraw as funds flow in</li>
              <li>• 0.1% fee: 40% to stakers, 60% to platform</li>
              <li>• Cancel anytime with automatic settlements</li>
            </ul>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}