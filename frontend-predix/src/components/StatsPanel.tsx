'use client'

import { motion } from 'framer-motion'
import { TrendingUp, Brain, Users, Zap, Target, Award } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { usePredictionData } from '@/hooks/usePredictionData'
import { useRoundStore } from '@/store/roundStore'

export function StatsPanel() {
  const { aiStats, priceData } = usePredictionData()
  const { aiStatus, getTotalPoolSize } = useRoundStore()

  const stats = [
    {
      title: 'AI Accuracy',
      value: aiStats ? `${(aiStats.accuracy * 100).toFixed(1)}%` : '75.2%',
      icon: Target,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
      description: 'Overall prediction accuracy'
    },
    {
      title: 'Win Streak',
      value: aiStats?.winStreak?.toString() || '5',
      icon: Award,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
      description: 'Consecutive correct predictions'
    },
    {
      title: 'Total Predictions',
      value: aiStats?.totalPredictions?.toString() || '128',
      icon: Brain,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
      description: 'Predictions made today'
    },
    {
      title: 'Active Users',
      value: '42',
      icon: Users,
      color: 'text-orange-400',
      bgColor: 'bg-orange-400/10',
      description: 'Users in current round'
    }
  ]

  return (
    <div className="space-y-6">
      {/* AI Status Card */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            AI Engine Status
          </CardTitle>
          <CardDescription>
            Real-time AI prediction system monitoring
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Status</span>
            <Badge 
              className={
                aiStatus === 'active' 
                  ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                  : aiStatus === 'emergency'
                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                  : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
              }
            >
              <div className="w-2 h-2 rounded-full bg-current mr-2 animate-pulse" />
              {aiStatus === 'active' ? 'Active' : aiStatus === 'emergency' ? 'Emergency Stop' : 'Standby'}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Model Version</span>
            <span className="text-white font-mono text-sm">v1.2.3</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Last Update</span>
            <span className="text-white text-sm">2 minutes ago</span>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="glass card-hover">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 truncate">{stat.title}</p>
                    <p className="text-lg font-bold text-white">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Price Info Card */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            POL Price Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Current Price</span>
            <span className="text-white font-mono text-lg">
              ${priceData?.currentPrice?.toFixed(4) || '1.5000'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-slate-300">24h Change</span>
            <span className={`font-mono ${
              (priceData?.change24h || 0) >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {(priceData?.change24h || 0) >= 0 ? '+' : ''}
              {priceData?.change24h?.toFixed(2) || '0.00'}%
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Volume 24h</span>
            <span className="text-white font-mono text-sm">
              {priceData?.volume24h ? `$${(priceData.volume24h / 1e6).toFixed(2)}M` : '$50.2M'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Market Cap</span>
            <span className="text-white font-mono text-sm">
              {priceData?.marketCap ? `$${(priceData.marketCap / 1e9).toFixed(2)}B` : '$1.5B'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-300">Accuracy Rate</span>
              <span className="text-white">{aiStats ? `${(aiStats.accuracy * 100).toFixed(1)}%` : '75.2%'}</span>
            </div>
            <Progress value={aiStats ? aiStats.accuracy * 100 : 75.2} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-300">Confidence Level</span>
              <span className="text-white">85.4%</span>
            </div>
            <Progress value={85.4} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-300">System Health</span>
              <span className="text-green-400">98.7%</span>
            </div>
            <Progress value={98.7} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-sm">Quick Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Rounds Today</span>
            <span className="text-white font-mono">144</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Total Volume</span>
            <span className="text-white font-mono">1,234.56 POL</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Winners</span>
            <span className="text-green-400 font-mono">67.3%</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Avg Stake</span>
            <span className="text-white font-mono">0.25 POL</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
