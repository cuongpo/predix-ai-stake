import { useState } from 'react'
import { useContractWrite, useContractRead, useWaitForTransaction } from 'wagmi'
import { parseEther } from 'viem'
import toast from 'react-hot-toast'

// Contract ABI (simplified for demo)
const PREDICTION_POOL_ABI = [
  {
    inputs: [{ name: 'roundId', type: 'uint256' }],
    name: 'stakeFollow',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: 'roundId', type: 'uint256' }],
    name: 'stakeCounter',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: 'roundId', type: 'uint256' }],
    name: 'claimReward',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'roundId', type: 'uint256' },
      { name: 'user', type: 'address' }
    ],
    name: 'getUserStake',
    outputs: [
      {
        components: [
          { name: 'amount', type: 'uint256' },
          { name: 'direction', type: 'uint8' },
          { name: 'claimed', type: 'bool' },
          { name: 'reward', type: 'uint256' }
        ],
        name: '',
        type: 'tuple'
      }
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'roundId', type: 'uint256' }],
    name: 'getRoundStakes',
    outputs: [
      { name: 'followStake', type: 'uint256' },
      { name: 'counterStake', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function',
  }
] as const

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PREDICTION_POOL_ADDRESS as `0x${string}`

export function usePredictionContract() {
  const [isLoading, setIsLoading] = useState(false)

  // Stake Follow AI
  const { 
    data: stakeFollowData, 
    write: writeStakeFollow,
    isLoading: isStakeFollowLoading 
  } = useContractWrite({
    address: CONTRACT_ADDRESS,
    abi: PREDICTION_POOL_ABI,
    functionName: 'stakeFollow',
  })

  // Stake Counter AI
  const { 
    data: stakeCounterData, 
    write: writeStakeCounter,
    isLoading: isStakeCounterLoading 
  } = useContractWrite({
    address: CONTRACT_ADDRESS,
    abi: PREDICTION_POOL_ABI,
    functionName: 'stakeCounter',
  })

  // Claim Reward
  const { 
    data: claimRewardData, 
    write: writeClaimReward,
    isLoading: isClaimRewardLoading 
  } = useContractWrite({
    address: CONTRACT_ADDRESS,
    abi: PREDICTION_POOL_ABI,
    functionName: 'claimReward',
  })

  // Wait for transactions
  const { isLoading: isStakeFollowTxLoading } = useWaitForTransaction({
    hash: stakeFollowData?.hash,
    onSuccess: () => {
      toast.success('Successfully staked to Follow AI!')
      setIsLoading(false)
    },
    onError: (error) => {
      toast.error('Transaction failed')
      console.error('Stake Follow transaction error:', error)
      setIsLoading(false)
    }
  })

  const { isLoading: isStakeCounterTxLoading } = useWaitForTransaction({
    hash: stakeCounterData?.hash,
    onSuccess: () => {
      toast.success('Successfully staked to Counter AI!')
      setIsLoading(false)
    },
    onError: (error) => {
      toast.error('Transaction failed')
      console.error('Stake Counter transaction error:', error)
      setIsLoading(false)
    }
  })

  const { isLoading: isClaimRewardTxLoading } = useWaitForTransaction({
    hash: claimRewardData?.hash,
    onSuccess: () => {
      toast.success('Rewards claimed successfully!')
      setIsLoading(false)
    },
    onError: (error) => {
      toast.error('Claim failed')
      console.error('Claim reward transaction error:', error)
      setIsLoading(false)
    }
  })

  // Contract functions
  const stakeFollow = async (roundId: number, amount: bigint) => {
    try {
      setIsLoading(true)
      writeStakeFollow({
        args: [BigInt(roundId)],
        value: amount,
      })
    } catch (error) {
      console.error('Stake Follow error:', error)
      toast.error('Failed to stake')
      setIsLoading(false)
    }
  }

  const stakeCounter = async (roundId: number, amount: bigint) => {
    try {
      setIsLoading(true)
      writeStakeCounter({
        args: [BigInt(roundId)],
        value: amount,
      })
    } catch (error) {
      console.error('Stake Counter error:', error)
      toast.error('Failed to stake')
      setIsLoading(false)
    }
  }

  const claimReward = async (roundId: number) => {
    try {
      setIsLoading(true)
      writeClaimReward({
        args: [BigInt(roundId)],
      })
    } catch (error) {
      console.error('Claim Reward error:', error)
      toast.error('Failed to claim reward')
      setIsLoading(false)
    }
  }

  // Read functions
  const useGetUserStake = (roundId: number, userAddress: `0x${string}` | undefined) => {
    return useContractRead({
      address: CONTRACT_ADDRESS,
      abi: PREDICTION_POOL_ABI,
      functionName: 'getUserStake',
      args: userAddress ? [BigInt(roundId), userAddress] : undefined,
      enabled: !!userAddress,
      watch: true,
    })
  }

  const useGetRoundStakes = (roundId: number) => {
    return useContractRead({
      address: CONTRACT_ADDRESS,
      abi: PREDICTION_POOL_ABI,
      functionName: 'getRoundStakes',
      args: [BigInt(roundId)],
      watch: true,
    })
  }

  return {
    // Write functions
    stakeFollow,
    stakeCounter,
    claimReward,
    
    // Loading states
    isLoading: isLoading || 
               isStakeFollowLoading || 
               isStakeCounterLoading || 
               isClaimRewardLoading ||
               isStakeFollowTxLoading ||
               isStakeCounterTxLoading ||
               isClaimRewardTxLoading,
    
    // Read hooks
    useGetUserStake,
    useGetRoundStakes,
    
    // Transaction hashes
    stakeFollowHash: stakeFollowData?.hash,
    stakeCounterHash: stakeCounterData?.hash,
    claimRewardHash: claimRewardData?.hash,
  }
}
