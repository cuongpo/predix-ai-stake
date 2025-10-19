import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export interface Round {
  id: number
  aiPrediction: 'UP' | 'DOWN'
  confidence: number
  startTime: number
  endTime: number
  phase: 'voting' | 'frozen' | 'resolved' | 'cancelled'
  followPool: bigint
  counterPool: bigint
  followCount: number
  counterCount: number
  winningDirection?: 'UP' | 'DOWN'
  startPrice?: number
  endPrice?: number
  resolved: boolean
}

export interface UserStake {
  roundId: number
  amount: bigint
  direction: 'follow' | 'counter'
  claimed: boolean
  reward?: bigint
}

interface RoundStore {
  // Current round state
  currentRound: Round | null
  roundPhase: 'voting' | 'frozen' | 'resolved' | 'cancelled'
  timeRemaining: number
  isLoading: boolean
  
  // AI status
  aiStatus: 'active' | 'standby' | 'emergency'
  aiStats: {
    totalPredictions: number
    correctPredictions: number
    accuracy: number
    winStreak: number
    lastPrediction?: string
  }
  
  // User data
  userStakes: UserStake[]
  totalStaked: bigint
  totalWon: bigint
  
  // Round history
  roundHistory: Round[]
  
  // Actions
  setCurrentRound: (round: Round) => void
  updateRoundPhase: (phase: 'voting' | 'frozen' | 'resolved' | 'cancelled') => void
  updateTimeRemaining: (seconds: number) => void
  setLoading: (loading: boolean) => void
  updateAIStats: (stats: Partial<RoundStore['aiStats']>) => void
  addUserStake: (stake: UserStake) => void
  updateUserStake: (roundId: number, updates: Partial<UserStake>) => void
  addToHistory: (round: Round) => void
  setAIStatus: (status: 'active' | 'standby' | 'emergency') => void
  
  // Computed values
  getTotalPoolSize: () => bigint
  getUserStakeForRound: (roundId: number) => UserStake | null
  getWinRate: () => number
}

export const useRoundStore = create<RoundStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentRound: null,
    roundPhase: 'voting',
    timeRemaining: 300, // 5 minutes default
    isLoading: false,
    
    aiStatus: 'active',
    aiStats: {
      totalPredictions: 0,
      correctPredictions: 0,
      accuracy: 0,
      winStreak: 0,
    },
    
    userStakes: [],
    totalStaked: 0n,
    totalWon: 0n,
    
    roundHistory: [],
    
    // Actions
    setCurrentRound: (round) => set({ currentRound: round }),
    
    updateRoundPhase: (phase) => set({ roundPhase: phase }),
    
    updateTimeRemaining: (seconds) => set({ timeRemaining: Math.max(0, seconds) }),
    
    setLoading: (loading) => set({ isLoading: loading }),
    
    updateAIStats: (stats) => set((state) => ({
      aiStats: { ...state.aiStats, ...stats }
    })),
    
    addUserStake: (stake) => set((state) => ({
      userStakes: [...state.userStakes, stake],
      totalStaked: state.totalStaked + stake.amount
    })),
    
    updateUserStake: (roundId, updates) => set((state) => ({
      userStakes: state.userStakes.map(stake =>
        stake.roundId === roundId ? { ...stake, ...updates } : stake
      )
    })),
    
    addToHistory: (round) => set((state) => ({
      roundHistory: [round, ...state.roundHistory].slice(0, 50) // Keep last 50 rounds
    })),
    
    setAIStatus: (status) => set({ aiStatus: status }),
    
    // Computed values
    getTotalPoolSize: () => {
      const { currentRound } = get()
      if (!currentRound) return 0n
      return currentRound.followPool + currentRound.counterPool
    },
    
    getUserStakeForRound: (roundId) => {
      const { userStakes } = get()
      return userStakes.find(stake => stake.roundId === roundId) || null
    },
    
    getWinRate: () => {
      const { userStakes } = get()
      const resolvedStakes = userStakes.filter(stake => stake.reward !== undefined)
      if (resolvedStakes.length === 0) return 0
      const wins = resolvedStakes.filter(stake => (stake.reward || 0n) > 0n).length
      return wins / resolvedStakes.length
    }
  }))
)

// Timer subscription to update countdown
let timerInterval: NodeJS.Timeout | null = null

export const startRoundTimer = () => {
  if (timerInterval) clearInterval(timerInterval)
  
  timerInterval = setInterval(() => {
    const { timeRemaining, updateTimeRemaining, updateRoundPhase } = useRoundStore.getState()
    
    if (timeRemaining > 0) {
      updateTimeRemaining(timeRemaining - 1)
    } else {
      // Handle phase transitions
      const { roundPhase } = useRoundStore.getState()
      if (roundPhase === 'voting') {
        updateRoundPhase('frozen')
        updateTimeRemaining(300) // 5 minutes freeze period
      } else if (roundPhase === 'frozen') {
        updateRoundPhase('resolved')
        updateTimeRemaining(0)
      }
    }
  }, 1000)
}

export const stopRoundTimer = () => {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

// Auto-start timer when store is created
if (typeof window !== 'undefined') {
  startRoundTimer()
}
