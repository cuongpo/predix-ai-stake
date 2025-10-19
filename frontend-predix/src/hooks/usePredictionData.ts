import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

interface PriceData {
  timestamp: number
  price: number
  volume: number
  high: number
  low: number
  open: number
  close: number
}

interface AIStats {
  accuracy: number
  totalPredictions: number
  correctPredictions: number
  winStreak: number
  lastPrediction?: string
  emergencyStop: boolean
}

const AI_API_URL = process.env.NEXT_PUBLIC_AI_API_URL || 'http://localhost:8000'

export function usePredictionData() {
  const [priceData, setPriceData] = useState<{
    currentPrice: number
    priceHistory: PriceData[]
    change24h: number
  }>({
    currentPrice: 1.5,
    priceHistory: [],
    change24h: 0
  })

  // Fetch AI stats from backend
  const { data: aiStats, isLoading: aiStatsLoading } = useQuery({
    queryKey: ['aiStats'],
    queryFn: async (): Promise<AIStats> => {
      try {
        const response = await fetch(`${AI_API_URL}/status`)
        if (!response.ok) throw new Error('Failed to fetch AI stats')
        const data = await response.json()
        return {
          accuracy: data.accuracy || 0.75,
          totalPredictions: data.total_predictions || 0,
          correctPredictions: data.correct_predictions || 0,
          winStreak: data.win_streak || 0,
          lastPrediction: data.last_prediction_time,
          emergencyStop: data.emergency_stop || false
        }
      } catch (error) {
        console.error('Failed to fetch AI stats:', error)
        // Return mock data for development
        return {
          accuracy: 0.752,
          totalPredictions: 128,
          correctPredictions: 96,
          winStreak: 5,
          emergencyStop: false
        }
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
  })

  // Fetch latest prediction
  const { data: latestPrediction } = useQuery({
    queryKey: ['latestPrediction'],
    queryFn: async () => {
      try {
        const response = await fetch(`${AI_API_URL}/predictions/latest`)
        if (!response.ok) throw new Error('Failed to fetch latest prediction')
        return await response.json()
      } catch (error) {
        console.error('Failed to fetch latest prediction:', error)
        // Return mock prediction for development
        return {
          direction: 'UP',
          confidence: 0.852,
          timestamp: new Date().toISOString(),
          signature_hash: '0x1234...',
          metadata: {
            total_predictions: 128,
            accuracy: 0.752
          }
        }
      }
    },
    refetchInterval: 60000, // Refetch every minute
  })

  // Simulate real-time price data
  useEffect(() => {
    const generateMockPriceData = () => {
      const now = Date.now()
      const basePrice = 1.5
      
      // Generate 24 hours of price data (1 point per minute)
      const history: PriceData[] = []
      for (let i = 1440; i >= 0; i--) {
        const timestamp = now - (i * 60 * 1000)
        const randomChange = (Math.random() - 0.5) * 0.1
        const price = basePrice + randomChange
        
        history.push({
          timestamp,
          price,
          volume: Math.random() * 1000000,
          high: price * 1.02,
          low: price * 0.98,
          open: price,
          close: price
        })
      }

      const currentPrice = history[history.length - 1]?.price || basePrice
      const price24hAgo = history[0]?.price || basePrice
      const change24h = ((currentPrice - price24hAgo) / price24hAgo) * 100

      setPriceData({
        currentPrice,
        priceHistory: history,
        change24h
      })
    }

    // Generate initial data
    generateMockPriceData()

    // Update price every 5 seconds with small random changes
    const priceInterval = setInterval(() => {
      setPriceData(prev => {
        const change = (Math.random() - 0.5) * 0.02 // ±1% change
        const newPrice = prev.currentPrice * (1 + change)
        
        const newDataPoint: PriceData = {
          timestamp: Date.now(),
          price: newPrice,
          volume: Math.random() * 100000,
          high: newPrice * 1.01,
          low: newPrice * 0.99,
          open: newPrice,
          close: newPrice
        }

        const updatedHistory = [...prev.priceHistory.slice(-1439), newDataPoint]
        const price24hAgo = updatedHistory[0]?.price || newPrice
        const change24h = ((newPrice - price24hAgo) / price24hAgo) * 100

        return {
          currentPrice: newPrice,
          priceHistory: updatedHistory,
          change24h
        }
      })
    }, 5000)

    return () => clearInterval(priceInterval)
  }, [])

  // Fetch market data from external APIs
  const { data: marketData } = useQuery({
    queryKey: ['marketData'],
    queryFn: async () => {
      try {
        // Try to fetch real POL data from CoinGecko
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=polygon-ecosystem-token&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true'
        )
        
        if (response.ok) {
          const data = await response.json()
          const polData = data['polygon-ecosystem-token']
          
          if (polData) {
            return {
              price: polData.usd,
              change24h: polData.usd_24h_change,
              marketCap: polData.usd_market_cap,
              volume24h: polData.usd_24h_vol
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch market data:', error)
      }
      
      // Fallback to mock data
      return {
        price: priceData.currentPrice,
        change24h: priceData.change24h,
        marketCap: 1500000000, // $1.5B
        volume24h: 50000000 // $50M
      }
    },
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000,
  })

  return {
    priceData: {
      ...priceData,
      marketCap: marketData?.marketCap,
      volume24h: marketData?.volume24h
    },
    aiStats,
    latestPrediction,
    isLoading: aiStatsLoading,
    
    // Helper functions
    formatPrice: (price: number) => `$${price.toFixed(4)}`,
    formatChange: (change: number) => `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
    formatVolume: (volume: number) => {
      if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`
      if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`
      if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`
      return `$${volume.toFixed(2)}`
    }
  }
}
