'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Check, X, Minus } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRoundStore } from '@/store/roundStore'
import { formatEther } from 'viem'

export function RoundHistory() {
  const { roundHistory } = useRoundStore()

  // Mock data for demonstration
  const mockHistory = [
    { id: 123, resolved: true, winningDirection: 'UP', aiPrediction: 'UP', endPrice: 1.52, totalFollowStake: 1234567890123456789n, totalCounterStake: 987654321098765432n },
    { id: 122, resolved: true, winningDirection: 'DOWN', aiPrediction: 'UP', endPrice: 1.48, totalFollowStake: 876543210987654321n, totalCounterStake: 1029876543210987654n },
    { id: 121, resolved: true, winningDirection: 'UP', aiPrediction: 'UP', endPrice: 1.51, totalFollowStake: 1500000000000000000n, totalCounterStake: 500000000000000000n },
    { id: 120, resolved: false, winningDirection: 'UP', aiPrediction: 'DOWN', endPrice: 1.49, totalFollowStake: 700000000000000000n, totalCounterStake: 800000000000000000n },
  ]

  const history = roundHistory.length > 0 ? roundHistory : mockHistory;

  const getResultIcon = (round: any) => {
    if (!round.resolved) return <Minus className="w-4 h-4 text-slate-400" />;
    if (round.aiPrediction === round.winningDirection) {
      return <Check className="w-4 h-4 text-green-400" />;
    } else {
      return <X className="w-4 h-4 text-red-400" />;
    }
  };

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Round History</CardTitle>
        <CardDescription>Review the outcomes of recent prediction rounds</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((round, index) => (
            <motion.div
              key={round.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="glass-dark rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <p className="text-xs text-slate-400">Round</p>
                  <p className="font-bold text-white">#{round.id}</p>
                </div>
                <div className={`p-2 rounded-full ${round.winningDirection === 'UP' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                  {round.winningDirection === 'UP' ? (
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-300">
                    Result: <span className={round.winningDirection === 'UP' ? 'text-green-400' : 'text-red-400'}>{round.winningDirection}</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    Final Price: ${round.endPrice?.toFixed(4)}
                  </p>
                </div>
              </div>

              <div className="hidden md:flex items-center space-x-4">
                <div className="text-center">
                  <p className="text-xs text-slate-400">Follow Pool</p>
                  <p className="text-sm font-mono text-white">{formatEther(round.totalFollowStake).slice(0, 6)} POL</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400">Counter Pool</p>
                  <p className="text-sm font-mono text-white">{formatEther(round.totalCounterStake).slice(0, 6)} POL</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">AI</span>
                {getResultIcon(round)}
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
