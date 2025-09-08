'use client'

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Settings, DollarSign, Pause, AlertTriangle, Gift, Download } from 'lucide-react';
import { useAccount, useReadContract, useWriteContract, useChainId } from 'wagmi';
import { getContractAddresses, SONIC_RUSH_ABI } from '@/config/contracts';
import { formatEther } from 'viem';
import toast from 'react-hot-toast';
import { parseEther } from 'viem';

export default function AdminInterface() {
  const [newRewardRate, setNewRewardRate] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [charityWithdrawAmount, setCharityWithdrawAmount] = useState('');
  const [vaultName, setVaultName] = useState('');
  const { address, isConnected } = useAccount();
  const { writeContract } = useWriteContract();
  const chainId = useChainId();
  const contracts = getContractAddresses(chainId);

  // Check if user is owner
  const { data: owner } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'owner',
    query: {
      enabled: typeof window !== 'undefined',
    }
  });

  // Get charity address
  const { data: charityAddress } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'charityAddress',
    query: {
      enabled: typeof window !== 'undefined',
    }
  });

  const isOwner = address && owner && typeof owner === 'string' && address.toLowerCase() === owner.toLowerCase();
  const isCharity = address && charityAddress && typeof charityAddress === 'string' && address.toLowerCase() === charityAddress.toLowerCase();

  // Get current settings
  const { data: currentRewardRate } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'baseRewardRate',
    query: {
      enabled: typeof window !== 'undefined',
    }
  });

  const { data: vaultActive } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'vaultActive',
    query: {
      enabled: typeof window !== 'undefined',
    }
  });

  const { data: balanceInfo } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'getBalanceInfo',
    query: {
      enabled: typeof window !== 'undefined',
    }
  });

  const { data: excessFunds } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'calculateExcessFunds',
    query: {
      enabled: typeof window !== 'undefined',
    }
  });

  const handleUpdateRewardRate = async () => {
    if (!newRewardRate || !isConnected) {
      toast.error('Please enter reward rate and connect wallet');
      return;
    }

    try {
      await writeContract({
        address: contracts.SONIC_RUSH as `0x${string}`,
        abi: SONIC_RUSH_ABI,
        functionName: 'updateRewardRate',
        args: [BigInt(parseInt(newRewardRate))],
      });
      toast.success('Reward rate update submitted!');
      setNewRewardRate('');
    } catch (error: any) {
      toast.error(`Update failed: ${error.message}`);
    }
  };

  const handleSetVaultPaused = async (paused: boolean) => {
    if (!isConnected) {
      toast.error('Please connect wallet');
      return;
    }

    try {
      await writeContract({
        address: contracts.SONIC_RUSH as `0x${string}`,
        abi: SONIC_RUSH_ABI,
        functionName: 'setVaultPaused',
        args: [paused],
      });
      toast.success(`Vault ${paused ? 'paused' : 'unpaused'}!`);
    } catch (error: any) {
      toast.error(`Operation failed: ${error.message}`);
    }
  };

  const handleEmergencyPause = async () => {
    if (!isConnected) {
      toast.error('Please connect wallet');
      return;
    }

    if (!confirm('Are you sure you want to emergency pause the vault? This will stop all operations.')) {
      return;
    }

    try {
      await writeContract({
        address: contracts.SONIC_RUSH as `0x${string}`,
        abi: SONIC_RUSH_ABI,
        functionName: 'emergencyPause',
      });
      toast.success('Emergency pause activated!');
    } catch (error: any) {
      toast.error(`Emergency pause failed: ${error.message}`);
    }
  };

  const handleDistributeExcessFunds = async () => {
    if (!isConnected) {
      toast.error('Please connect wallet');
      return;
    }

    try {
      await writeContract({
        address: contracts.SONIC_RUSH as `0x${string}`,
        abi: SONIC_RUSH_ABI,
        functionName: 'distributeExcessFunds',
      });
      toast.success('Excess funds distributed!');
    } catch (error: any) {
      toast.error(`Distribution failed: ${error.message}`);
    }
  };

  const handleWithdrawOwnerRevenue = async () => {
    if (!withdrawAmount || !isConnected) {
      toast.error('Please enter amount and connect wallet');
      return;
    }

    try {
      const amountWei = parseEther(withdrawAmount);
      await writeContract({
        address: contracts.SONIC_RUSH as `0x${string}`,
        abi: SONIC_RUSH_ABI,
        functionName: 'withdrawOwnerRevenue',
        args: [amountWei],
      });
      toast.success('Owner revenue withdrawal submitted!');
      setWithdrawAmount('');
    } catch (error: any) {
      toast.error(`Withdrawal failed: ${error.message}`);
    }
  };

  const handleWithdrawCharityFunds = async () => {
    if (!charityWithdrawAmount || !isConnected) {
      toast.error('Please enter amount and connect wallet');
      return;
    }

    if (!isCharity) {
      toast.error('Only the charity address can withdraw charity funds');
      return;
    }

    try {
      const amountWei = parseEther(charityWithdrawAmount);
      await writeContract({
        address: contracts.SONIC_RUSH as `0x${string}`,
        abi: SONIC_RUSH_ABI,
        functionName: 'withdrawCharityFunds',
        args: [amountWei],
      });
      toast.success('Charity funds withdrawal submitted!');
      setCharityWithdrawAmount('');
    } catch (error: any) {
      toast.error(`Withdrawal failed: ${error.message}`);
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <Card className="max-w-md mx-auto bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-8">
            <div className="text-6xl mb-4">🔐</div>
            <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Connect your wallet to access admin functions
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

  if (!isOwner && !isCharity) {
    return (
      <div className="text-center py-12">
        <Card className="max-w-md mx-auto bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-8">
            <div className="text-6xl mb-4">🚫</div>
            <h3 className="text-xl font-semibold mb-2">Access Denied</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Only the contract owner or charity can access admin functions
            </p>
            <div className="mt-4 text-sm text-gray-500">
              <p>Owner: {owner && typeof owner === 'string' ? `${owner.slice(0, 6)}...${owner.slice(-4)}` : 'Loading...'}</p>
              <p>Charity: {charityAddress && typeof charityAddress === 'string' ? `${charityAddress.slice(0, 6)}...${charityAddress.slice(-4)}` : 'Loading...'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Role Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-0 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">
                  {isOwner ? '🔑 Contract Owner' : '🎁 Charity Address'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isOwner ? 'Full admin access' : 'Charity withdrawal access'}
                </p>
              </div>
              <div className="text-right text-sm text-gray-500">
                <p>Your Address: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Loading...'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Admin Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Current Reward Rate</p>
                <p className="font-semibold">{currentRewardRate?.toString() || '0'} BPS/hour</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Pause className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Vault Status</p>
                <p className={`font-semibold ${vaultActive ? 'text-green-600' : 'text-red-600'}`}>
                  {vaultActive ? 'Active' : 'Paused'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Excess Funds</p>
                <p className="font-semibold">{excessFunds ? formatEther(excessFunds) : '0'} S</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Admin Functions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Vault Settings - Owner Only */}
        {isOwner && (
          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                Vault Settings
              </CardTitle>
              <CardDescription>
                Manage vault parameters and settings (Owner only)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Update Reward Rate (BPS/hour)</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder={currentRewardRate?.toString() || '0'}
                  value={newRewardRate}
                  onChange={(e) => setNewRewardRate(e.target.value)}
                />
                <Button onClick={handleUpdateRewardRate} disabled={!newRewardRate}>
                  Update
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => handleSetVaultPaused(true)}
                variant="outline"
                className="flex-1"
                disabled={!vaultActive}
              >
                Pause Vault
              </Button>
              <Button 
                onClick={() => handleSetVaultPaused(false)}
                variant="outline"
                className="flex-1"
                disabled={vaultActive}
              >
                Unpause Vault
              </Button>
            </div>

            <Button 
              onClick={handleEmergencyPause}
              variant="destructive"
              className="w-full"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Emergency Pause
            </Button>
            </CardContent>
          </Card>
        )}

        {/* Revenue Management */}
        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Revenue Management
            </CardTitle>
            <CardDescription>
              {isOwner ? 'Manage excess funds and withdrawals' : 'Withdraw charity funds'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {isOwner && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Owner Revenue: {balanceInfo ? formatEther(balanceInfo[3]) : '0'} S
                </p>
              )}
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Charity Funds: {balanceInfo ? formatEther(balanceInfo[4]) : '0'} S
              </p>
            </div>

            {isOwner && (
              <>
                <Button 
                  onClick={handleDistributeExcessFunds}
                  className="w-full"
                  disabled={!excessFunds || excessFunds === BigInt(0)}
                >
                  <Gift className="w-4 h-4 mr-2" />
                  Distribute Excess Funds
                </Button>

                <div>
                  <label className="block text-sm font-medium mb-2">Withdraw Owner Revenue (S)</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                    />
                    <Button onClick={handleWithdrawOwnerRevenue} disabled={!withdrawAmount}>
                      <Download className="w-4 h-4 mr-2" />
                      Withdraw
                    </Button>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Withdraw Charity Funds (S)</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={charityWithdrawAmount}
                  onChange={(e) => setCharityWithdrawAmount(e.target.value)}
                />
                <Button onClick={handleWithdrawCharityFunds} disabled={!charityWithdrawAmount}>
                  <Download className="w-4 h-4 mr-2" />
                  Withdraw
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
