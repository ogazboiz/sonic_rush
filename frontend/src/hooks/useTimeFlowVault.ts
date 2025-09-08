'use client'

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { getContractAddresses, SONIC_RUSH_ABI } from '@/config/contracts'
import { useRefresh } from '@/context/refresh'
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'

// Stream data types
export interface Stream {
  sender: string
  recipient: string
  totalAmount: bigint
  flowRate: bigint
  startTime: bigint
  stopTime: bigint
  amountWithdrawn: bigint
  isActive: boolean
}

export interface Stake {
  amount: bigint
  startTime: bigint
  lastClaimTime: bigint
  accumulatedRewards: bigint
  isActive: boolean
}

// Custom hook for TimeFlow Vault following Agro's pattern
export function useTimeFlowVault() {
  const { address } = useAccount()
  const chainId = useChainId()
  const contracts = getContractAddresses(chainId)
  const { refreshTrigger, triggerDelayedRefresh } = useRefresh()
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  // Read contract data with auto-refresh
  const { data: vaultStats, refetch: refetchVaultStats } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'getVaultStats',
  })

  const { data: totalStreams, refetch: refetchTotalStreams } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'getTotalStreams',
  })

  const { data: streamingFeeBps } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'STREAMING_FEE_BPS',
  })

  const { data: userStake, refetch: refetchUserStake } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'getUserStake',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const { data: currentAPY, refetch: refetchCurrentAPY } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'getCurrentAPY',
  })

  const { data: activityInfo, refetch: refetchActivityInfo } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'getActivityInfo',
  })

  const { data: excessFunds, refetch: refetchExcessFunds } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'calculateExcessFunds',
  })

  const { data: balanceInfo, refetch: refetchBalanceInfo } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'getBalanceInfo',
  })

  // Auto-refresh on trigger (following Agro's pattern)
  useEffect(() => {
    if (refreshTrigger > 0) {
      setTimeout(() => {
        refetchVaultStats()
        refetchTotalStreams()
        refetchUserStake()
        refetchCurrentAPY()
        refetchActivityInfo()
        refetchExcessFunds()
        refetchBalanceInfo()
      }, 500) // Delayed refresh for blockchain settlement
    }
  }, [refreshTrigger, refetchVaultStats, refetchTotalStreams, refetchUserStake, refetchCurrentAPY, refetchActivityInfo, refetchExcessFunds, refetchBalanceInfo])

  // Transaction completion handler
  useEffect(() => {
    if (isConfirmed) {
      toast.success('Transaction confirmed!')
      triggerDelayedRefresh()
    }
  }, [isConfirmed, triggerDelayedRefresh])

  // Streaming functions
  const createStream = async (recipient: string, duration: number, amount: string) => {
    try {
      writeContract({
        address: contracts.SONIC_RUSH as `0x${string}`,
        abi: SONIC_RUSH_ABI,
        functionName: 'createStream',
        args: [recipient as `0x${string}`, BigInt(duration)],
        value: parseEther(amount),
      })
      toast.loading('Creating stream...', { id: 'create-stream' })
    } catch (error) {
      console.error('Create stream error:', error)
      toast.error('Failed to create stream')
    }
  }

  const withdrawFromStream = async (streamId: number) => {
    try {
      writeContract({
        address: contracts.SONIC_RUSH as `0x${string}`,
        abi: SONIC_RUSH_ABI,
        functionName: 'withdrawFromStream',
        args: [BigInt(streamId)],
      })
      toast.loading('Withdrawing from stream...', { id: 'withdraw-stream' })
    } catch (error) {
      console.error('Withdraw stream error:', error)
      toast.error('Failed to withdraw from stream')
    }
  }

  const cancelStream = async (streamId: number) => {
    try {
      writeContract({
        address: contracts.SONIC_RUSH as `0x${string}`,
        abi: SONIC_RUSH_ABI,
        functionName: 'cancelStream',
        args: [BigInt(streamId)],
      })
      toast.loading('Canceling stream...', { id: 'cancel-stream' })
    } catch (error) {
      console.error('Cancel stream error:', error)
      toast.error('Failed to cancel stream')
    }
  }

  // Vault functions
  const stakeETH = async (amount: string) => {
    try {
      writeContract({
        address: contracts.SONIC_RUSH as `0x${string}`,
        abi: SONIC_RUSH_ABI,
        functionName: 'stake',
        value: parseEther(amount),
      })
      toast.loading('Staking ETH...', { id: 'stake-eth' })
    } catch (error) {
      console.error('Stake error:', error)
      toast.error('Failed to stake ETH')
    }
  }

  const unstakeETH = async (amount: string) => {
    try {
      writeContract({
        address: contracts.SONIC_RUSH as `0x${string}`,
        abi: SONIC_RUSH_ABI,
        functionName: 'unstake',
        args: [parseEther(amount)],
      })
      toast.loading('Unstaking ETH...', { id: 'unstake-eth' })
    } catch (error) {
      console.error('Unstake error:', error)
      toast.error('Failed to unstake ETH')
    }
  }

  const claimRewards = async () => {
    try {
      writeContract({
        address: contracts.SONIC_RUSH as `0x${string}`,
        abi: SONIC_RUSH_ABI,
        functionName: 'claimRewards',
      })
      toast.loading('Claiming rewards...', { id: 'claim-rewards' })
    } catch (error) {
      console.error('Claim rewards error:', error)
      toast.error('Failed to claim rewards')
    }
  }

  // Note: Utility functions removed as they violated React hooks rules
  // These should be implemented as custom hooks or moved to components where hooks can be used properly

  // Format helpers
  const formatETH = (value: bigint | undefined) => {
    if (!value) return '0'
    return formatEther(value)
  }

  const formatStreamingFee = () => {
    if (!streamingFeeBps) return '0'
    return (Number(streamingFeeBps) / 100).toFixed(2) + '%'
  }

  return {
    // Contract data
    vaultStats: vaultStats as [bigint, bigint, bigint] | undefined,
    totalStreams: totalStreams as bigint | undefined,
    streamingFeeBps: streamingFeeBps as bigint | undefined,
    userStake: userStake as Stake | undefined,
    currentAPY: currentAPY as bigint | undefined,
    activityInfo: activityInfo as [bigint, bigint, bigint] | undefined,
    excessFunds: excessFunds as bigint | undefined,
    balanceInfo: balanceInfo as [bigint, bigint, bigint, bigint, bigint] | undefined,

    // Transaction states
    isLoading: isPending || isConfirming,
    isConfirmed,
    txHash: hash,

    // Write functions
    createStream,
    withdrawFromStream,
    cancelStream,
    stakeETH,
    unstakeETH,
    claimRewards,

    // Utility functions
    formatETH,
    formatStreamingFee,

    // Refetch functions
    refetchVaultStats,
    refetchTotalStreams,
    refetchUserStake,
    refetchCurrentAPY,
    refetchActivityInfo,
    refetchExcessFunds,
    refetchBalanceInfo,
  }
}

// Individual hook for stream data (for performance)
export function useStream(streamId: number) {
  const chainId = useChainId()
  const contracts = getContractAddresses(chainId)
  const { refreshTrigger } = useRefresh()

  const { data: stream, refetch: refetchStream } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'getStream',
    args: [BigInt(streamId)],
    query: { enabled: streamId >= 0 },
  })

  const { data: claimableBalance, refetch: refetchClaimableBalance } = useReadContract({
    address: contracts.SONIC_RUSH as `0x${string}`,
    abi: SONIC_RUSH_ABI,
    functionName: 'getClaimableBalance',
    args: [BigInt(streamId)],
    query: { enabled: streamId >= 0 },
  })

  // Auto-refresh
  useEffect(() => {
    if (refreshTrigger > 0) {
      setTimeout(() => {
        refetchStream()
        refetchClaimableBalance()
      }, 500)
    }
  }, [refreshTrigger, refetchStream, refetchClaimableBalance])

  // Real-time claimable balance updates
  const [realtimeClaimable, setRealtimeClaimable] = useState<bigint>(BigInt(0))

  useEffect(() => {
    if (!stream || !stream.isActive) return

    const updateClaimable = () => {
      const now = BigInt(Math.floor(Date.now() / 1000))
      const elapsed = now - stream.startTime
      const maxElapsed = stream.stopTime - stream.startTime
      const actualElapsed = elapsed > maxElapsed ? maxElapsed : elapsed
      const streamedSoFar = actualElapsed * stream.flowRate
      const claimable = streamedSoFar > stream.amountWithdrawn 
        ? streamedSoFar - stream.amountWithdrawn 
        : BigInt(0)
      setRealtimeClaimable(claimable)
    }

    updateClaimable()
    const interval = setInterval(updateClaimable, 1000) // Update every second

    return () => clearInterval(interval)
  }, [stream])

  return {
    stream: stream as Stream | undefined,
    claimableBalance: claimableBalance as bigint | undefined,
    realtimeClaimable,
    refetchStream,
    refetchClaimableBalance,
  }
}