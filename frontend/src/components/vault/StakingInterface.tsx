'use client'

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Coins, TrendingUp, Clock, Gift } from 'lucide-react';
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { getContractAddresses, SONIC_RUSH_ABI } from '@/config/contracts';
import { formatEther } from 'viem';
import toast from 'react-hot-toast';
import { parseEther } from 'viem';
import { useEffect, useMemo } from 'react';

export default function StakingInterface() {
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | null>(null);
  const [pendingTxType, setPendingTxType] = useState<'stake' | 'unstake' | 'claim' | null>(null);
  const [currentToastId, setCurrentToastId] = useState<string | null>(null);
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const chainId = useChainId();
  const contracts = getContractAddresses(chainId);

  // Wait for transaction confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isTxError } = useWaitForTransactionReceipt({
    hash: hash,
  });

  // Update pending hash when transaction is submitted
  useEffect(() => {
    if (hash) {
      setPendingTxHash(hash);
    }
  }, [hash]);


  // Get user balance - dynamic based on connected network
  const { data: balance } = useBalance({
    address,
    chainId, // Uses the connected network's chainId
  });

  // Get user stake info
  const { data: userStake, refetch: refetchStake } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'getUserStake',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && typeof window !== 'undefined',
    }
  });

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && pendingTxHash && pendingTxType) {
      // Dismiss any loading toast
      if (currentToastId) {
        toast.dismiss(currentToastId);
        setCurrentToastId(null);
      }
      
      if (pendingTxType === 'stake') {
        toast.success('✅ Stake transaction confirmed!');
      } else if (pendingTxType === 'unstake') {
        toast.success('✅ Unstake transaction confirmed!');
      } else if (pendingTxType === 'claim') {
        toast.success('✅ Rewards claimed successfully!');
      }
      
      // Reset pending state
      setPendingTxHash(null);
      setPendingTxType(null);
      
      // Refresh data
      setTimeout(() => refetchStake(), 1000);
    } else if (isTxError && pendingTxHash) {
      // Dismiss any loading toast
      if (currentToastId) {
        toast.dismiss(currentToastId);
        setCurrentToastId(null);
      }
      
      toast.error('❌ Transaction failed!');
      setPendingTxHash(null);
      setPendingTxType(null);
    }
  }, [isConfirmed, isTxError, pendingTxHash, pendingTxType, currentToastId, refetchStake]);

  // Get vault stats  
  const { data: vaultStats } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'getVaultStats',
    query: {
      enabled: typeof window !== 'undefined',
    }
  });

  // Get current APY
  const { data: currentAPYFromContract } = useReadContract({
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

  // Get base reward rate
  const { data: baseRewardRate } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'baseRewardRate',
    query: {
      enabled: typeof window !== 'undefined',
    }
  });

  // Calculate claimable rewards properly - your share of available rewards
  const claimableRewards = useMemo(() => {
    if (!userStake || !vaultStats || !userStake.amount || userStake.amount === BigInt(0)) {
      return BigInt(0);
    }
    
    const totalStaked = vaultStats[0]; // Total staked by everyone
    const totalRewardsAvailable = vaultStats[1]; // Available reward pool
    
    if (totalStaked === BigInt(0) || totalRewardsAvailable === BigInt(0)) {
      return BigInt(0);
    }
    
    // Your proportional share: (your stake / total stake) × available rewards
    const yourShare = (userStake.amount * totalRewardsAvailable) / totalStaked;
    return yourShare;
  }, [userStake, vaultStats]);

  const handleStake = async () => {
    if (!stakeAmount || !isConnected) {
      toast.error('Please connect wallet and enter amount');
      return;
    }

    try {
      const amountWei = parseEther(stakeAmount);
      
      const toastId = toast.loading('Staking... Please wait for confirmation.');
      setCurrentToastId(toastId);
      setPendingTxType('stake');
      
      writeContract({
        address: contracts.SONIC_RUSH as `0x${string}`,
        abi: SONIC_RUSH_ABI,
        functionName: 'stake',
        value: amountWei,
      });

      setStakeAmount('');
    } catch (error: any) {
      if (currentToastId) {
        toast.dismiss(currentToastId);
        setCurrentToastId(null);
      }
      toast.error(`Staking failed: ${error.message}`);
      setPendingTxType(null);
    }
  };

  const handleUnstake = async () => {
    if (!unstakeAmount || !isConnected) {
      toast.error('Please connect wallet and enter amount');
      return;
    }

    try {
      const amountWei = parseEther(unstakeAmount);
      
      const toastId = toast.loading('Unstaking... Please wait for confirmation.');
      setCurrentToastId(toastId);
      setPendingTxType('unstake');
      
      writeContract({
        address: contracts.SONIC_RUSH as `0x${string}`,
        abi: SONIC_RUSH_ABI,
        functionName: 'unstake',
        args: [amountWei],
      });

      setUnstakeAmount('');
    } catch (error: any) {
      if (currentToastId) {
        toast.dismiss(currentToastId);
        setCurrentToastId(null);
      }
      toast.error(`Unstaking failed: ${error.message}`);
      setPendingTxType(null);
    }
  };

  const handleClaimRewards = async () => {
    if (!isConnected) {
      toast.error('Please connect wallet');
      return;
    }

    try {
      const toastId = toast.loading('Claiming rewards... Please wait for confirmation.');
      setCurrentToastId(toastId);
      setPendingTxType('claim');
      
      writeContract({
        address: contracts.SONIC_RUSH as `0x${string}`,
        abi: SONIC_RUSH_ABI,
        functionName: 'claimRewards',
      });

    } catch (error: any) {
      if (currentToastId) {
        toast.dismiss(currentToastId);
        setCurrentToastId(null);
      }
      toast.error(`Claiming failed: ${error.message}`);
      setPendingTxType(null);
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <Card className="max-w-md mx-auto bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-8">
            <div className="text-6xl mb-4">🔗</div>
            <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Connect your wallet to start staking and earning rewards
            </p>
            <Button onClick={() => {
              const button = document.querySelector('w3m-button') as any;
              if (button) button.click();
            }}>
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // getCurrentAPY returns APY in basis points, so divide by 100 to get percentage
  const currentAPY = currentAPYFromContract ? Number(currentAPYFromContract) / 100 : 0;
  const stakedAmount = userStake ? userStake.amount : BigInt(0);
  const isStaking = userStake ? userStake.isActive : false;

  // Debug logging
  console.log('StakingInterface Debug:', {
    address,
    userStake,
    stakedAmount: stakedAmount?.toString(),
    isStaking,
    claimableRewards: claimableRewards?.toString(),
    vaultStats: vaultStats ? {
      totalStaked: vaultStats[0]?.toString(),
      totalRewards: vaultStats[1]?.toString(),
      totalStreams: vaultStats[2]?.toString()
    } : null
  });

  return (
    <div className="space-y-6">
      {/* Staking Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Your Balance</p>
                <p className="font-semibold">{balance ? formatEther(balance.value) : '0'} S</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Your Stake</p>
                <p className="font-semibold">{formatEther(stakedAmount)} S</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Claimable Rewards</p>
                <p className="font-semibold text-green-600">
                  {formatEther(claimableRewards)} S
                </p>
                <p className="text-xs text-gray-500">Ready to claim</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Activity-Based APY</p>
                <p className="font-semibold">{currentAPY.toFixed(0)}%</p>
                <p className="text-xs text-gray-500">
                  {activityInfo && activityInfo[0] > BigInt(0) ? 
                    `24h Volume: ${formatEther(activityInfo[0])} S` : 
                    'No activity = 0% APY'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>


      {/* Staking Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Stake */}
        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-blue-600">💰 Stake Tokens</CardTitle>
            <CardDescription>
              Stake S tokens to earn your share of all platform fees (up to 40% APY)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Amount to Stake</label>
              <Input
                type="number"
                placeholder="0.0"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                className="mb-2"
              />
              <p className="text-xs text-gray-500">
                Available: {balance ? formatEther(balance.value) : '0'} S
              </p>
            </div>
            <Button 
              onClick={handleStake}
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={!stakeAmount || Number(stakeAmount) <= 0 || isPending || isConfirming}
            >
              {isPending ? 'Submitting...' : isConfirming && pendingTxType === 'stake' ? 'Confirming...' : 'Stake Tokens'}
            </Button>
          </CardContent>
        </Card>

        {/* Unstake */}
        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-orange-600">🔓 Unstake Tokens</CardTitle>
            <CardDescription>
              Withdraw your staked tokens flexibly - partial or full amounts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Amount to Unstake</label>
              <Input
                type="number"
                placeholder="0.0"
                value={unstakeAmount}
                onChange={(e) => setUnstakeAmount(e.target.value)}
                className="mb-2"
                disabled={!isStaking}
              />
              <p className="text-xs text-gray-500">
                Staked: {formatEther(stakedAmount)} S
              </p>
            </div>
            <Button 
              onClick={handleUnstake}
              variant="outline"
              className="w-full"
              disabled={!isStaking || !unstakeAmount || Number(unstakeAmount) <= 0 || isPending || isConfirming}
            >
              {isPending ? 'Submitting...' : isConfirming && pendingTxType === 'unstake' ? 'Confirming...' : 'Unstake Tokens'}
            </Button>
          </CardContent>
        </Card>

        {/* Claim Rewards */}
        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-green-600">🎁 Claim Rewards</CardTitle>
            <CardDescription>
              Claim your proportional share of collected platform fees
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-4">
              <div className="text-3xl font-bold text-green-600">
                {claimableRewards ? formatEther(claimableRewards as bigint) : '0'}
              </div>
              <p className="text-sm text-gray-500">S tokens available</p>
            </div>
            <Button 
              onClick={handleClaimRewards}
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={!claimableRewards || claimableRewards === BigInt(0) || isPending || isConfirming}
            >
              {isPending ? 'Submitting...' : isConfirming && pendingTxType === 'claim' ? 'Confirming...' : 'Claim Rewards'}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* How Staking Works */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border-0">
          <CardHeader>
            <CardTitle className="text-green-700 dark:text-green-300">💰 Stake Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• Deposit S tokens to earn rewards</li>
              <li>• No lock-up periods</li>
              <li>• Unstake anytime</li>
              <li>• Start earning immediately</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 border-0">
          <CardHeader>
            <CardTitle className="text-blue-700 dark:text-blue-300">🌊 Earn from Streams</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• Get 40% of 0.1% streaming fees</li>
              <li>• More activity = Higher APY</li>
              <li>• No activity = No time rewards</li>
              <li>• Up to 40% APY cap</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 border-0">
          <CardHeader>
            <CardTitle className="text-purple-700 dark:text-purple-300">🎯 Claim Rewards</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• Claim rewards anytime</li>
              <li>• Automatic accumulation</li>
              <li>• No gas fees for claiming</li>
              <li>• Compound your earnings</li>
            </ul>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}