'use client'

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Zap, Clock, ArrowRight, Users, Play, Square, Download } from 'lucide-react';
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { getContractAddresses, SONIC_RUSH_ABI } from '@/config/contracts';
import { formatEther } from 'viem';
import toast from 'react-hot-toast';
import { parseEther } from 'viem';

export default function StreamingInterface() {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('');
  const [streamId, setStreamId] = useState('');
  const [lastCreatedStreamId, setLastCreatedStreamId] = useState<number | null>(null);
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | null>(null);
  const [pendingTxType, setPendingTxType] = useState<'create' | 'withdraw' | 'cancel' | null>(null);
  const [pendingTxData, setPendingTxData] = useState<any>(null);
  const [currentToastId, setCurrentToastId] = useState<string | null>(null);
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const chainId = useChainId();
  const contracts = getContractAddresses(chainId);

  // Wait for transaction confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isTxError } = useWaitForTransactionReceipt({
    hash: pendingTxHash || undefined,
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

  // Get total streams (nextStreamId)
  const { data: totalStreams, refetch: refetchTotalStreams } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'getTotalStreams',
    query: {
      enabled: typeof window !== 'undefined',
    }
  });

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && pendingTxHash && pendingTxType) {
      const txType = pendingTxType; // Save before resetting
      const txData = pendingTxData; // Save before resetting
      
      // Dismiss any loading toast
      if (currentToastId) {
        toast.dismiss(currentToastId);
        setCurrentToastId(null);
      }
      
      // Reset pending state
      setPendingTxHash(null);
      setPendingTxType(null);
      setPendingTxData(null);
      
      if (txType === 'create') {
        // Show immediate success and start refreshing
        toast.success('🎉 Stream created successfully! Fetching stream ID...');
        
        // Force refresh and wait for updated data
        setTimeout(() => {
          refetchTotalStreams().then((result) => {
            const newTotal = result.data ? Number(result.data) : 0;
            const currentStreamId = Math.max(0, newTotal - 1);
            setLastCreatedStreamId(currentStreamId);
            toast.success(`✅ Stream #${currentStreamId} is ready to use!`);
            console.log('New stream created with ID:', currentStreamId, 'Total streams:', newTotal);
          });
        }, 2000); // Wait for blockchain to update
      } else if (txType === 'withdraw') {
        const { amount, streamId: txStreamId } = txData;
        toast.success(`💰 Withdrew ${formatEther(amount)} S from Stream #${txStreamId}!`);
        setTimeout(() => refetchTotalStreams(), 1000);
      } else if (txType === 'cancel') {
        const { streamId: txStreamId } = txData;
        toast.success(`🛑 Stream #${txStreamId} cancelled successfully!`);
        setTimeout(() => refetchTotalStreams(), 1000);
      }
      
    } else if (isTxError && pendingTxHash) {
      // Dismiss any loading toast
      if (currentToastId) {
        toast.dismiss(currentToastId);
        setCurrentToastId(null);
      }
      
      toast.error('Transaction failed!');
      setPendingTxHash(null);
      setPendingTxType(null);
      setPendingTxData(null);
    }
  }, [isConfirmed, isTxError, pendingTxHash, pendingTxType, pendingTxData, currentToastId, refetchTotalStreams]);




  // Get stream details by ID - only when valid ID is entered
  const { data: streamDetails, refetch: refetchStream } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'getStream',
    args: streamId && !isNaN(parseInt(streamId)) ? [BigInt(parseInt(streamId))] : undefined,
    query: {
      enabled: typeof window !== 'undefined' && streamId !== '' && !isNaN(parseInt(streamId)) && parseInt(streamId) >= 0,
    }
  });

  // Get claimable balance for the stream
  const { data: claimableBalance } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'getClaimableBalance',
    args: streamId && !isNaN(parseInt(streamId)) ? [BigInt(parseInt(streamId))] : undefined,
    query: {
      enabled: typeof window !== 'undefined' && streamId !== '' && !isNaN(parseInt(streamId)) && parseInt(streamId) >= 0,
    }
  });

  // Helper functions for validation
  const isValidStreamId = (id: string) => {
    const streamIdNum = parseInt(id);
    const maxStreams = totalStreams ? Number(totalStreams) : 0;
    
    // Stream IDs start from 0, so valid range is 0 to (totalStreams - 1)
    return !isNaN(streamIdNum) && streamIdNum >= 0 && streamIdNum < maxStreams;
  };

  const isStreamSender = (stream: any) => {
    return address && stream?.sender && address.toLowerCase() === stream.sender.toLowerCase();
  };

  const isStreamRecipient = (stream: any) => {
    return address && stream?.recipient && address.toLowerCase() === stream.recipient.toLowerCase();
  };

  const canWithdraw = (stream: any) => {
    return isStreamRecipient(stream) && stream?.isActive && claimableBalance && claimableBalance > BigInt(0);
  };

  const canCancel = (stream: any) => {
    return (isStreamSender(stream) || isStreamRecipient(stream)) && stream?.isActive;
  };

  const handleViewStream = () => {
    if (!streamId) {
      toast.error('Please enter a stream ID');
      return;
    }

    if (!isValidStreamId(streamId)) {
      const maxStreams = totalStreams ? Number(totalStreams) : 0;
      const maxId = Math.max(0, maxStreams - 1);
      toast.error(`Invalid stream ID. Valid range: 0 to ${maxId} (Total streams: ${maxStreams})`);
      return;
    }
    
    console.log('StreamingInterface - Viewing stream ID:', streamId);
    console.log('StreamingInterface - totalStreams:', totalStreams);
    console.log('StreamingInterface - streamDetails:', streamDetails);
    
    refetchStream();
  };

  const handleWithdrawFromStream = async () => {
    if (!streamId || !isConnected) {
      toast.error('Please enter stream ID and connect wallet');
      return;
    }

    if (!isValidStreamId(streamId)) {
      const maxStreams = totalStreams ? Number(totalStreams) : 0;
      const maxId = Math.max(0, maxStreams - 1);
      toast.error(`Invalid stream ID. Valid range: 0 to ${maxId}`);
      return;
    }

    if (!streamDetails) {
      toast.error('Stream data not loaded. Click "View Stream" first.');
      return;
    }

    if (!isStreamRecipient(streamDetails)) {
      if (isStreamSender(streamDetails)) {
        toast.error('You cannot withdraw from your own stream. Only the recipient can withdraw.');
      } else {
        toast.error('You are not the recipient of this stream.');
      }
      return;
    }

    if (!streamDetails.isActive) {
      toast.error('This stream is no longer active.');
      return;
    }

    if (!claimableBalance || claimableBalance === BigInt(0)) {
      toast.error('No funds available to withdraw from this stream.');
      return;
    }
    
    try {
      const toastId = toast.loading('Withdrawing... Please wait for confirmation.');
      setCurrentToastId(toastId);
      
      // Set transaction type and data before calling writeContract
      setPendingTxType('withdraw');
      setPendingTxData({ amount: claimableBalance, streamId: parseInt(streamId) });
      
      writeContract({
        address: contracts.SONIC_RUSH as `0x${string}`,
        abi: SONIC_RUSH_ABI,
        functionName: 'withdrawFromStream',
        args: [BigInt(parseInt(streamId))],
      });
      
    } catch (error: any) {
      if (currentToastId) {
        toast.dismiss(currentToastId);
        setCurrentToastId(null);
      }
      toast.error(`Withdraw failed: ${error.message}`);
      setPendingTxType(null);
      setPendingTxData(null);
    }
  };

  const handleCancelStream = async () => {
    if (!streamId || !isConnected) {
      toast.error('Please enter stream ID and connect wallet');
      return;
    }

    if (!isValidStreamId(streamId)) {
      const maxStreams = totalStreams ? Number(totalStreams) : 0;
      const maxId = Math.max(0, maxStreams - 1);
      toast.error(`Invalid stream ID. Valid range: 0 to ${maxId}`);
      return;
    }

    if (!streamDetails) {
      toast.error('Stream data not loaded. Click "View Stream" first.');
      return;
    }

    if (!streamDetails.isActive) {
      toast.error('This stream is already completed or cancelled.');
      return;
    }

    if (!isStreamSender(streamDetails)) {
      toast.error('You can only cancel streams that you created (sender only).');
      return;
    }

    // Show confirmation with explanation of what cancel does
    const confirmMessage = `Cancel Stream as creator?\n\nThis will:\n• Stop the stream immediately\n• Send claimable funds to recipient\n• Refund remaining funds to you\n• Make stream inactive (no more withdraws possible)\n\nContinue?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    try {
      const toastId = toast.loading('Cancelling stream... Please wait for confirmation.');
      setCurrentToastId(toastId);
      
      // Set transaction type and data before calling writeContract
      setPendingTxType('cancel');
      setPendingTxData({ streamId: parseInt(streamId) });
      
      writeContract({
        address: contracts.SONIC_RUSH as `0x${string}`,
        abi: SONIC_RUSH_ABI,
        functionName: 'cancelStream',
        args: [BigInt(parseInt(streamId))],
      });
      
    } catch (error: any) {
      if (currentToastId) {
        toast.dismiss(currentToastId);
        setCurrentToastId(null);
      }
      toast.error(`Cancel failed: ${error.message}`);
      setPendingTxType(null);
      setPendingTxData(null);
    }
      
  };

  const handleCreateStream = async () => {
    if (!recipient || !amount || !duration || !isConnected) {
      toast.error('Please fill all fields and connect wallet');
      return;
    }

    // Validate recipient address
    if (!recipient.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast.error('Invalid recipient address');
      return;
    }

    try {
      const amountWei = parseEther(amount);
      const durationSeconds = parseInt(duration) * 60; // Convert minutes to seconds
      
      const toastId = toast.loading('Creating stream... Please wait for confirmation.');
      setCurrentToastId(toastId);
      
      // Set transaction type and data before calling writeContract
      setPendingTxType('create');
      setPendingTxData({});
      
      writeContract({
        address: contracts.SONIC_RUSH as `0x${string}`,
        abi: SONIC_RUSH_ABI,
        functionName: 'createStream',
        args: [recipient as `0x${string}`, BigInt(durationSeconds)],
        value: amountWei,
      });
      
      setRecipient('');
      setAmount('');
      setDuration('');
      
    } catch (error: any) {
      if (currentToastId) {
        toast.dismiss(currentToastId);
        setCurrentToastId(null);
      }
      toast.error(`Stream creation failed: ${error.message}`);
      setPendingTxType(null);
      setPendingTxData(null);
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <Card className="max-w-md mx-auto bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-8">
            <div className="text-6xl mb-4">🌊</div>
            <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Connect your wallet to create and manage money streams
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

  return (
    <div className="space-y-6">
      {/* Streaming Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
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
              <Users className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Streams</p>
                <p className="font-semibold">{totalStreams?.toString() || '0'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Streaming Fee</p>
                <p className="font-semibold">0.1% (40% to stakers)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Stream Management</p>
                <p className="font-semibold text-xs">
                  {isConnected ? 
                    `Enter stream ID below to view/manage` : 
                    'Connect wallet to manage streams'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Create Stream */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-6 h-6 text-blue-600" />
              Create New Stream
            </CardTitle>
            <CardDescription>
              Stream S tokens continuously per second to any address. Recipients can withdraw instantly as funds flow in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Recipient Address</label>
                <Input
                  type="text"
                  placeholder="0x..."
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="font-mono"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Amount (S)</label>
                <Input
                  type="number"
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Available: {balance ? formatEther(balance.value) : '0'} S
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
                <Input
                  type="number"
                  placeholder="60"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Flow rate: {amount && duration ? (Number(amount) / Number(duration)).toFixed(6) : '0'} S/min
                </p>
              </div>
            </div>

            {/* Stream Preview */}
            {amount && duration && recipient && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Stream Preview</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
                    <span className="font-semibold ml-2">{amount} S</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                    <span className="font-semibold ml-2">{duration} minutes</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Streaming Fee:</span>
                    <span className="font-semibold ml-2">{(Number(amount) * 0.001).toFixed(4)} S</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Net Amount:</span>
                    <span className="font-semibold ml-2">{(Number(amount) * 0.999).toFixed(4)} S</span>
                  </div>
                </div>
              </div>
            )}

            <Button 
              onClick={handleCreateStream}
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={!recipient || !amount || !duration || !isConnected || isPending || isConfirming}
            >
              {!isConnected ? 'Connect Wallet' : 
               isPending ? 'Submitting...' : 
               isConfirming && pendingTxType === 'create' ? 'Confirming...' : 
               'Create Stream'}
            </Button>

            {/* Success Message */}
            {lastCreatedStreamId !== null && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <h4 className="font-semibold text-green-800 dark:text-green-200">Stream Created Successfully!</h4>
                </div>
                <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                  Your stream has been created with ID: <span className="font-mono font-bold">#{lastCreatedStreamId}</span>
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Use this ID in the &quot;Manage Stream by ID&quot; section below to view, withdraw, or cancel your stream.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2 text-green-700 border-green-300 hover:bg-green-100"
                  onClick={() => setStreamId(lastCreatedStreamId.toString())}
                >
                  Manage Stream #{lastCreatedStreamId}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Stream Management by ID */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Manage Stream by ID</CardTitle>
            <CardDescription>
              View stream details, withdraw funds, or cancel active streams
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Stream ID</label>
              <Input
                type="number"
                placeholder={`Enter stream ID (0 to ${totalStreams ? Math.max(0, Number(totalStreams) - 1) : 0})`}
                value={streamId}
                onChange={(e) => {
                  const value = e.target.value;
                  // Only allow positive numbers and empty string
                  if (value === '' || (parseInt(value) >= 0 && !isNaN(parseInt(value)))) {
                    setStreamId(value);
                  }
                }}
                min="0"
                max={totalStreams ? Math.max(0, Number(totalStreams) - 1) : 0}
                className="mb-4"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleViewStream}
                disabled={!streamId || !isValidStreamId(streamId)}
              >
                View Stream
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleWithdrawFromStream}
                disabled={!streamId || !isConnected || !canWithdraw(streamDetails) || isPending || isConfirming}
              >
                {isPending ? 'Submitting...' : isConfirming && pendingTxType === 'withdraw' ? 'Confirming...' :
                 !isConnected ? 'Connect Wallet' : 
                 !streamDetails ? 'Withdraw' :
                 !isStreamRecipient(streamDetails) ? 'Not Recipient' :
                 !streamDetails.isActive ? 'Stream Inactive' :
                 !claimableBalance || claimableBalance === BigInt(0) ? 'Nothing to Withdraw' :
                 'Withdraw'}
              </Button>
            </div>
            
            {/* Cancel Stream Warning */}
            {streamDetails && streamDetails.isActive && (isStreamSender(streamDetails) || isStreamRecipient(streamDetails)) && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="text-red-500 text-xl">⚠️</div>
                  <div>
                    <h4 className="font-semibold text-red-800 dark:text-red-200 mb-1">Cancel Stream</h4>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      This will immediately stop the stream and distribute funds. This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <Button 
              variant="destructive" 
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 text-lg border-2 border-red-500 shadow-lg hover:shadow-xl transition-all duration-200"
              onClick={handleCancelStream}
              disabled={!streamId || !isConnected || !canCancel(streamDetails) || isPending || isConfirming}
            >
              {isPending ? '⏳ Submitting...' : 
               isConfirming && pendingTxType === 'cancel' ? '⏳ Confirming...' :
               !isConnected ? '🔌 Connect Wallet' : 
               !streamDetails ? '🛑 Cancel Stream' :
               !streamDetails.isActive ? '✅ Already Completed/Cancelled' :
               !isStreamSender(streamDetails) && !isStreamRecipient(streamDetails) ? '❌ No Permission' :
               '🛑 CANCEL STREAM'}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Stream Details</CardTitle>
            <CardDescription>
              Real-time stream data and withdrawal status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {streamDetails && streamId ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Sender:</span>
                    <span className="font-mono ml-2">{streamDetails.sender?.slice(0, 10)}...</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Recipient:</span>
                    <span className="font-mono ml-2">{streamDetails.recipient?.slice(0, 10)}...</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
                    <span className="font-semibold ml-2">{formatEther(streamDetails.totalAmount)} S</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Flow Rate:</span>
                    <span className="font-semibold ml-2">{formatEther(streamDetails.flowRate)}/sec</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Start Time:</span>
                    <span className="ml-2">{new Date(Number(streamDetails.startTime) * 1000).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">End Time:</span>
                    <span className="ml-2">{new Date(Number(streamDetails.stopTime) * 1000).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Withdrawn:</span>
                    <span className="font-semibold ml-2">{formatEther(streamDetails.amountWithdrawn)} S</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Claimable:</span>
                    <span className="font-semibold ml-2 text-green-600">{claimableBalance ? formatEther(claimableBalance) : '0'} S</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                    <span className={`ml-2 font-semibold ${streamDetails.isActive ? 'text-green-600' : 'text-red-600'}`}>
                      {streamDetails.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600 dark:text-gray-400">Your Role:</span>
                    <span className={`ml-2 font-semibold ${
                      isStreamSender(streamDetails) ? 'text-blue-600' :
                      isStreamRecipient(streamDetails) ? 'text-purple-600' : 
                      'text-gray-600'
                    }`}>
                      {isStreamSender(streamDetails) ? 'Sender (Creator)' :
                       isStreamRecipient(streamDetails) ? 'Recipient' :
                       'Observer (No permissions)'}
                    </span>
                  </div>
                </div>
                
                {streamDetails.isActive && ( // Only show if stream is active
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                    <h4 className="font-medium mb-2">Stream Progress</h4>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(
                            (Date.now() / 1000 - Number(streamDetails.startTime)) / 
                            (Number(streamDetails.stopTime) - Number(streamDetails.startTime)) * 100,
                            100
                          )}%`
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-gray-500 mb-4">Enter a stream ID to view details</p>
                <p className="text-sm text-gray-400">
                  Stream information will appear here
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Important Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800">
          <CardHeader>
            <CardTitle className="text-yellow-800 dark:text-yellow-200">⚠️ Important: Cancel vs Withdraw</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-semibold text-yellow-800 dark:text-yellow-200">WITHDRAW (Recipients Only):</p>
              <p>• Claim your streamed funds without stopping the stream</p>
              <p>• Stream continues running after withdrawal</p>
              <p>• Can withdraw multiple times as funds become available</p>
            </div>
            <div>
              <p className="font-semibold text-yellow-800 dark:text-yellow-200">CANCEL (Creator or Recipient):</p>
              <p>• Immediately stops the entire stream</p>
              <p>• Automatically sends all claimable funds to recipient</p>
              <p>• Refunds remaining funds to creator</p>
              <p>• <strong>Stream becomes inactive - NO more withdrawals possible</strong></p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* How Streaming Works */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 border-0">
          <CardHeader>
            <CardTitle className="text-blue-700 dark:text-blue-300">1. Create Stream</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• Set recipient address</li>
              <li>• Choose amount & duration</li>
              <li>• 0.1% fee goes to stakers</li>
              <li>• Streaming starts immediately</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 border-0">
          <CardHeader>
            <CardTitle className="text-purple-700 dark:text-purple-300">2. Real-time Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• Tokens stream per second</li>
              <li>• Recipient can withdraw anytime</li>
              <li>• View live progress</li>
              <li>• Cancel if needed</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-teal-100 dark:from-green-900/20 dark:to-teal-900/20 border-0">
          <CardHeader>
            <CardTitle className="text-green-700 dark:text-green-300">3. Complete</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• Stream ends automatically</li>
              <li>• All funds are claimable</li>
              <li>• Fees support rewards</li>
              <li>• History is preserved</li>
            </ul>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}