import { useState, useEffect } from 'react'
import { usePrepareContractWrite, useContractWrite, useContractRead, useWaitForTransaction } from 'wagmi'
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

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_PREDICTION_POOL_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`

export function usePredictionContract() {
  const [isLoading, setIsLoading] = useState(false)

  const [stakeFollowArgs, setStakeFollowArgs] = useState<{ roundId: number; amount: bigint } | undefined>()
  const [stakeCounterArgs, setStakeCounterArgs] = useState<{ roundId: number; amount: bigint } | undefined>()
  const [claimRewardArgs, setClaimRewardArgs] = useState<{ roundId: number } | undefined>()

  // Prepare Stake Follow
  const { config: stakeFollowConfig } = usePrepareContractWrite({
    address: CONTRACT_ADDRESS,
    abi: PREDICTION_POOL_ABI,
    functionName: 'stakeFollow',
    args: stakeFollowArgs ? [BigInt(stakeFollowArgs.roundId)] : undefined,
    value: stakeFollowArgs?.amount,
    enabled: !!stakeFollowArgs,
  });
  const { data: stakeFollowData, write: writeStakeFollow, isLoading: isStakeFollowLoading } = useContractWrite(stakeFollowConfig);

  // Prepare Stake Counter
  const { config: stakeCounterConfig } = usePrepareContractWrite({
    address: CONTRACT_ADDRESS,
    abi: PREDICTION_POOL_ABI,
    functionName: 'stakeCounter',
    args: stakeCounterArgs ? [BigInt(stakeCounterArgs.roundId)] : undefined,
    value: stakeCounterArgs?.amount,
    enabled: !!stakeCounterArgs,
  });
  const { data: stakeCounterData, write: writeStakeCounter, isLoading: isStakeCounterLoading } = useContractWrite(stakeCounterConfig);

  // Prepare Claim Reward
  const { config: claimRewardConfig } = usePrepareContractWrite({
    address: CONTRACT_ADDRESS,
    abi: PREDICTION_POOL_ABI,
    functionName: 'claimReward',
    args: claimRewardArgs ? [BigInt(claimRewardArgs.roundId)] : undefined,
    enabled: !!claimRewardArgs,
  });
  const { data: claimRewardData, write: writeClaimReward, isLoading: isClaimRewardLoading } = useContractWrite(claimRewardConfig);

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
  useEffect(() => {
    if (stakeFollowArgs && writeStakeFollow) {
      writeStakeFollow();
      setStakeFollowArgs(undefined);
    }
  }, [stakeFollowArgs, writeStakeFollow]);

  useEffect(() => {
    if (stakeCounterArgs && writeStakeCounter) {
      writeStakeCounter();
      setStakeCounterArgs(undefined);
    }
  }, [stakeCounterArgs, writeStakeCounter]);

  useEffect(() => {
    if (claimRewardArgs && writeClaimReward) {
      writeClaimReward();
      setClaimRewardArgs(undefined);
    }
  }, [claimRewardArgs, writeClaimReward]);

  const stakeFollow = (roundId: number, amount: bigint) => {
    setIsLoading(true);
    setStakeFollowArgs({ roundId, amount });
  };

  const stakeCounter = (roundId: number, amount: bigint) => {
    setIsLoading(true);
    setStakeCounterArgs({ roundId, amount });
  };

  const claimReward = (roundId: number) => {
    setIsLoading(true);
    setClaimRewardArgs({ roundId });
  };

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
