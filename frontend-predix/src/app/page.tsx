'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/Header'
import { PredictionCard } from '@/components/PredictionCard'
import { StatsPanel } from '@/components/StatsPanel'
import { RoundHistory } from '@/components/RoundHistory'
import { LiveChart } from '@/components/LiveChart'
import { WalletStatus } from '@/components/WalletStatus'
import { useRoundStore } from '@/store/roundStore'
import { usePredictionData } from '@/hooks/usePredictionData'
import { motion } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Brain, Zap, Users } from 'lucide-react'

export default function HomePage() {
  const { currentRound, isLoading } = useRoundStore()
  const { priceData, aiStats } = usePredictionData()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-6"
        >
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold gradient-text">
              PREDIX AI
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto">
              AI-Powered Prediction Platform on Polygon 2.0
            </p>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Stake POL tokens to Follow or Counter AI predictions. 
              Win rewards every 10 minutes based on POL/USD price movements.
            </p>
          </div>

          {/* Key Features */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-8">
            {[
              { icon: Brain, title: "AI Predictions", desc: "LSTM Neural Network" },
              { icon: Zap, title: "10 Min Rounds", desc: "Fast-paced Action" },
              { icon: TrendingUp, title: "POL Rewards", desc: "Native Token Stakes" },
              { icon: Users, title: "Follow/Counter", desc: "Choose Your Side" }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="glass rounded-lg p-4 text-center"
              >
                <feature.icon className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                <h3 className="font-semibold text-white">{feature.title}</h3>
                <p className="text-sm text-slate-400">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Wallet Status */}
        <WalletStatus />

        {/* Main Content Tabs */}
        <Tabs defaultValue="predict" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 glass">
            <TabsTrigger value="predict" className="data-[state=active]:bg-purple-500/20">
              Predict
            </TabsTrigger>
            <TabsTrigger value="chart" className="data-[state=active]:bg-purple-500/20">
              Chart
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-purple-500/20">
              History
            </TabsTrigger>
            <TabsTrigger value="stats" className="data-[state=active]:bg-purple-500/20">
              Stats
            </TabsTrigger>
          </TabsList>

          {/* Prediction Tab */}
          <TabsContent value="predict" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Current Round */}
              <div className="lg:col-span-2">
                <PredictionCard />
              </div>
              
              {/* Stats Panel */}
              <div>
                <StatsPanel />
              </div>
            </div>
          </TabsContent>

          {/* Chart Tab */}
          <TabsContent value="chart" className="space-y-6">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  POL/USD Live Chart
                </CardTitle>
                <CardDescription>
                  Real-time price data with AI prediction indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LiveChart data={priceData} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <RoundHistory />
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* AI Performance */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-400" />
                    AI Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Accuracy</span>
                    <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                      {aiStats?.accuracy ? `${(aiStats.accuracy * 100).toFixed(1)}%` : 'N/A'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Total Predictions</span>
                    <span className="text-white font-mono">
                      {aiStats?.totalPredictions || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Win Streak</span>
                    <span className="text-white font-mono">
                      {aiStats?.winStreak || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Platform Stats */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-blue-400" />
                    Platform Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Total Volume</span>
                    <span className="text-white font-mono">
                      {/* This would come from your data */}
                      1,234.56 POL
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Active Users</span>
                    <span className="text-white font-mono">
                      {/* This would come from your data */}
                      42
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Rounds Today</span>
                    <span className="text-white font-mono">
                      {/* This would come from your data */}
                      144
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Network Info */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-orange-400" />
                    Network Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Network</span>
                    <Badge variant="outline" className="border-purple-500/50 text-purple-400">
                      Polygon Amoy
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">POL Price</span>
                    <span className="text-white font-mono">
                      ${priceData?.currentPrice?.toFixed(4) || '0.0000'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Status</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-green-400 text-sm">Live</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Loading State */}
        {isLoading && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="glass rounded-lg p-6 text-center space-y-4">
              <div className="spinner mx-auto" />
              <p className="text-slate-300">Loading prediction data...</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
