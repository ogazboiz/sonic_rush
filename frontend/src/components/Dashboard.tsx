'use client'

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import VaultOverview from './vault/VaultOverview';
import StakingInterface from './vault/StakingInterface';
import StreamingInterface from './vault/StreamingInterface';
import AdminInterface from './vault/AdminInterface';
import { Zap, Coins, TrendingUp, Users } from 'lucide-react';
import { useReadContract } from 'wagmi';
import { getContractAddresses, SONIC_RUSH_ABI } from '@/config/contracts';
import { formatEther } from 'viem';

export default function SonicRushDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const contracts = getContractAddresses();

  // Get vault stats for dashboard 
  const { data: vaultStats } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'getVaultStats',
    query: {
      enabled: typeof window !== 'undefined',
    }
  });

  // Get current APY
  const { data: currentAPY } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'getCurrentAPY',
    query: {
      enabled: typeof window !== 'undefined',
    }
  });


  // Get excess funds available
  const { data: excessFunds } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'calculateExcessFunds',
    query: {
      enabled: typeof window !== 'undefined',
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white">
              <Zap className="w-8 h-8" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              SonicRush
            </h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Activity-based streaming protocol: No activity = No rewards, More activity = Higher APY (up to 40%)
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-500">Connected to Sonic Testnet</span>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Value Locked</p>
                  <p className="text-2xl font-bold">{vaultStats ? formatEther(vaultStats[0]) : '0'} S</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Coins className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Streams</p>
                  <p className="text-2xl font-bold">{vaultStats ? vaultStats[2].toString() : '0'}</p>
                </div>
              </div>
            </CardContent>
          </Card>


          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                  <Zap className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Current APY</p>
                  <p className="text-2xl font-bold">{currentAPY ? (Number(currentAPY) / 100).toFixed(2) : '0.00'}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Interface */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8 bg-gray-100 dark:bg-gray-800">
              <TabsTrigger 
                value="overview" 
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg font-medium transition-all duration-200"
              >
                📊 Overview
              </TabsTrigger>
              <TabsTrigger 
                value="staking" 
                className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg font-medium transition-all duration-200"
              >
                💰 Staking
              </TabsTrigger>
              <TabsTrigger 
                value="streaming" 
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg font-medium transition-all duration-200"
              >
                🌊 Streaming
              </TabsTrigger>
              <TabsTrigger 
                value="admin" 
                className="data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg font-medium transition-all duration-200"
              >
                ⚙️ Admin
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <VaultOverview />
            </TabsContent>

            <TabsContent value="staking">
              <StakingInterface />
            </TabsContent>

            <TabsContent value="streaming">
              <StreamingInterface />
            </TabsContent>

            <TabsContent value="admin">
              <AdminInterface />
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Wallet Connection */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="fixed bottom-6 right-6"
        >
          <w3m-button />
        </motion.div>
      </div>
    </div>
  );
}