'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Clock, Brain, Users, Coins } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { useAccount, useBalance } from 'wagmi'
import { useRoundStore } from '@/store/roundStore'
import { usePredictionContract } from '@/hooks/usePredictionContract'
import { formatEther, parseEther } from 'viem'
import toast from 'react-hot-toast'

export function PredictionCard() {
  const { address } = useAccount()
  const { data: balance } = useBalance({ address })
  const { currentRound, timeRemaining, roundPhase } = useRoundStore()
  const { stakeFollow, stakeCounter, isLoading } = usePredictionContract()
  
  const [stakeAmount, setStakeAmount] = useState('0.1')
  const [selectedSide, setSelectedSide] = useState<'follow' | 'counter' | null>(null)

  const handleStake = async (side: 'follow' | 'counter') => {
    if (!address) {
      toast.error('Please connect your wallet')
      return
    }

    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      toast.error('Please enter a valid stake amount')
      return
    }

    try {
      const amount = parseEther(stakeAmount)
      
      if (side === 'follow') {
        await stakeFollow(currentRound?.id || 1, amount)
        toast.success('Successfully staked to Follow AI!')
      } else {
        await stakeCounter(currentRound?.id || 1, amount)
        toast.success('Successfully staked to Counter AI!')
      }
      
      setSelectedSide(side)
    } catch (error) {
      console.error('Staking error:', error)
      toast.error('Failed to place stake')
    }
  }

  const formatTimeRemaining = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getPhaseInfo = () => {
    switch (roundPhase) {
      case 'voting':
        return {
          title: 'Voting Phase',
          description: 'Place your stakes now!',
          color: 'text-green-400',
          bgColor: 'bg-green-400/10'
        }
      case 'frozen':
        return {
          title: 'Frozen Phase',
          description: 'Voting closed, waiting for result',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-400/10'
        }
      case 'resolved':
        return {
          title: 'Resolved',
          description: 'Round completed, claim rewards',
          color: 'text-blue-400',
          bgColor: 'bg-blue-400/10'
        }
      default:
        return {
          title: 'Loading',
          description: 'Preparing next round...',
          color: 'text-slate-400',
          bgColor: 'bg-slate-400/10'
        }
    }
  }

  const phaseInfo = getPhaseInfo()
  const canStake = roundPhase === 'voting' && address && !selectedSide

  return (
    <Card className="glass card-hover">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              Round #{currentRound?.id || 1}
            </CardTitle>
            <CardDescription>
              AI Prediction: POL will go{' '}
              <span className={currentRound?.aiPrediction === 'UP' ? 'text-green-400' : 'text-red-400'}>
                {currentRound?.aiPrediction || 'UP'}
              </span>
            </CardDescription>
          </div>
          <Badge className={`${phaseInfo.bgColor} ${phaseInfo.color} border-0`}>
            {phaseInfo.title}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* AI Prediction Display */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-4">
            <div className={`p-4 rounded-full ${currentRound?.aiPrediction === 'UP' ? 'bg-green-400/20' : 'bg-red-400/20'}`}>
              {currentRound?.aiPrediction === 'UP' ? (
                <TrendingUp className="w-8 h-8 text-green-400" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-400" />
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-2xl font-bold">
              AI Predicts: {currentRound?.aiPrediction || 'UP'}
            </h3>
            <p className="text-slate-400">
              Confidence: {currentRound?.confidence ? `${(currentRound.confidence * 100).toFixed(1)}%` : '85.2%'}
            </p>
          </div>
        </div>

        {/* Timer */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-slate-300">{phaseInfo.description}</span>
          </div>
          <div className="text-3xl font-mono font-bold countdown-timer">
            {formatTimeRemaining(timeRemaining)}
          </div>
          <Progress 
            value={(timeRemaining / 300) * 100} 
            className="w-full h-2 progress-animate"
          />
        </div>

        {/* Pool Information */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 glass-dark rounded-lg">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-sm text-slate-300">Follow AI</span>
            </div>
            <div className="text-lg font-bold text-white">
              {currentRound?.followPool ? `${formatEther(currentRound.followPool)} POL` : '0.00 POL'}
            </div>
            <div className="text-xs text-slate-400">
              {currentRound?.followCount || 0} participants
            </div>
          </div>

          <div className="text-center p-4 glass-dark rounded-lg">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <span className="text-sm text-slate-300">Counter AI</span>
            </div>
            <div className="text-lg font-bold text-white">
              {currentRound?.counterPool ? `${formatEther(currentRound.counterPool)} POL` : '0.00 POL'}
            </div>
            <div className="text-xs text-slate-400">
              {currentRound?.counterCount || 0} participants
            </div>
          </div>
        </div>

        {/* Staking Interface */}
        {canStake && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 p-4 glass-dark rounded-lg"
          >
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Stake Amount (POL)</label>
              <div className="flex space-x-2">
                <Input
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  placeholder="0.1"
                  min="0.01"
                  step="0.01"
                  className="flex-1 bg-slate-800/50 border-slate-600"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStakeAmount(balance ? formatEther(balance.value / 2n) : '0')}
                  className="whitespace-nowrap"
                >
                  50%
                </Button>
              </div>
              <p className="text-xs text-slate-400">
                Balance: {balance ? `${parseFloat(formatEther(balance.value)).toFixed(4)} POL` : '0.0000 POL'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => handleStake('follow')}
                disabled={isLoading}
                className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 btn-hover-scale"
              >
                {isLoading ? (
                  <div className="spinner" />
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Follow AI
                  </>
                )}
              </Button>

              <Button
                onClick={() => handleStake('counter')}
                disabled={isLoading}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 btn-hover-scale"
              >
                {isLoading ? (
                  <div className="spinner" />
                ) : (
                  <>
                    <TrendingDown className="w-4 h-4 mr-2" />
                    Counter AI
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {/* User's Stake Display */}
        {selectedSide && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 glass-dark rounded-lg border border-purple-500/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Coins className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-slate-300">Your Stake</span>
              </div>
              <Badge variant="outline" className="border-purple-500/50 text-purple-400">
                {selectedSide === 'follow' ? 'Following AI' : 'Countering AI'}
              </Badge>
            </div>
            <div className="mt-2">
              <span className="text-lg font-bold text-white">{stakeAmount} POL</span>
            </div>
          </motion.div>
        )}

        {/* Phase-specific Messages */}
        {roundPhase === 'frozen' && (
          <div className="text-center p-4 bg-yellow-400/10 rounded-lg border border-yellow-400/20">
            <p className="text-yellow-400">
              Voting has ended. Waiting for price resolution...
            </p>
          </div>
        )}

        {roundPhase === 'resolved' && (
          <div className="text-center p-4 bg-blue-400/10 rounded-lg border border-blue-400/20">
            <p className="text-blue-400 mb-2">
              Round completed! Check your rewards.
            </p>
            <Button variant="outline" className="border-blue-400/50 text-blue-400">
              Claim Rewards
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
