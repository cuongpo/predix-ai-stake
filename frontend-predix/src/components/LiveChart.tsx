'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Activity, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface PricePoint {
  timestamp: number
  price: number
  volume?: number
}

interface LiveChartProps {
  data?: PricePoint[]
}

export function LiveChart({ data }: LiveChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [currentPrice, setCurrentPrice] = useState(1.5000)
  const [priceChange, setPriceChange] = useState(0.0025)
  const [isPositive, setIsPositive] = useState(true)
  const [chartData, setChartData] = useState<PricePoint[]>([])

  // Generate mock data if no real data provided
  useEffect(() => {
    if (data && data.length > 0) {
      setChartData(data)
      return
    }

    // Generate mock price data
    const generateMockData = () => {
      const now = Date.now()
      const points: PricePoint[] = []
      let basePrice = 1.5000

      for (let i = 60; i >= 0; i--) {
        const timestamp = now - (i * 60000) // 1 minute intervals
        const volatility = 0.02 * Math.random() - 0.01 // ±1% volatility
        basePrice = Math.max(0.1, basePrice * (1 + volatility))
        
        points.push({
          timestamp,
          price: basePrice,
          volume: Math.random() * 1000000
        })
      }

      return points
    }

    const initialData = generateMockData()
    setChartData(initialData)
    setCurrentPrice(initialData[initialData.length - 1]?.price || 1.5000)

    // Simulate real-time updates
    const interval = setInterval(() => {
      const lastPrice = chartData[chartData.length - 1]?.price || 1.5000
      const volatility = 0.005 * Math.random() - 0.0025 // ±0.25% volatility
      const newPrice = Math.max(0.1, lastPrice * (1 + volatility))
      const change = newPrice - lastPrice
      
      setCurrentPrice(newPrice)
      setPriceChange(change)
      setIsPositive(change >= 0)

      setChartData(prev => {
        const newPoint: PricePoint = {
          timestamp: Date.now(),
          price: newPrice,
          volume: Math.random() * 1000000
        }
        
        // Keep only last 60 points
        const updated = [...prev, newPoint].slice(-60)
        return updated
      })
    }, 2000) // Update every 2 seconds

    return () => clearInterval(interval)
  }, [data])

  // Draw chart on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || chartData.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)

    // Calculate price range
    const prices = chartData.map(point => point.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice || 0.01

    // Draw grid lines
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)'
    ctx.lineWidth = 1

    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = (height / 5) * i
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = (width / 10) * i
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    // Draw price line
    ctx.strokeStyle = isPositive ? '#10b981' : '#ef4444'
    ctx.lineWidth = 2
    ctx.beginPath()

    chartData.forEach((point, index) => {
      const x = (index / (chartData.length - 1)) * width
      const y = height - ((point.price - minPrice) / priceRange) * height

      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()

    // Draw gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, isPositive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)')
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0)')

    ctx.fillStyle = gradient
    ctx.beginPath()
    
    chartData.forEach((point, index) => {
      const x = (index / (chartData.length - 1)) * width
      const y = height - ((point.price - minPrice) / priceRange) * height

      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.lineTo(width, height)
    ctx.lineTo(0, height)
    ctx.closePath()
    ctx.fill()

  }, [chartData, isPositive])

  return (
    <div className="space-y-4">
      {/* Price Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h3 className="text-2xl font-bold text-white font-mono">
              ${currentPrice.toFixed(4)}
            </h3>
            <p className="text-sm text-slate-400">POL/USD</p>
          </div>
          
          <motion.div
            key={priceChange}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className={`flex items-center space-x-1 px-2 py-1 rounded-full ${
              isPositive ? 'bg-green-500/20' : 'bg-red-500/20'
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-sm font-mono ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? '+' : ''}{(priceChange * 100).toFixed(3)}%
            </span>
          </motion.div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="border-green-500/50 text-green-400">
            <Activity className="w-3 h-3 mr-1" />
            Live
          </Badge>
          <Badge variant="outline" className="border-purple-500/50 text-purple-400">
            <Zap className="w-3 h-3 mr-1" />
            1m
          </Badge>
        </div>
      </div>

      {/* Chart Canvas */}
      <Card className="glass-dark">
        <CardContent className="p-0">
          <canvas
            ref={canvasRef}
            width={800}
            height={400}
            className="w-full h-[400px] rounded-lg"
            style={{ background: 'transparent' }}
          />
        </CardContent>
      </Card>

      {/* Chart Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-dark rounded-lg p-3 text-center">
          <p className="text-xs text-slate-400">24h High</p>
          <p className="text-sm font-mono text-white">${(currentPrice * 1.05).toFixed(4)}</p>
        </div>
        <div className="glass-dark rounded-lg p-3 text-center">
          <p className="text-xs text-slate-400">24h Low</p>
          <p className="text-sm font-mono text-white">${(currentPrice * 0.95).toFixed(4)}</p>
        </div>
        <div className="glass-dark rounded-lg p-3 text-center">
          <p className="text-xs text-slate-400">Volume</p>
          <p className="text-sm font-mono text-white">
            {chartData[chartData.length - 1]?.volume?.toLocaleString().slice(0, 6) || '0'}
          </p>
        </div>
        <div className="glass-dark rounded-lg p-3 text-center">
          <p className="text-xs text-slate-400">Market Cap</p>
          <p className="text-sm font-mono text-white">$2.1B</p>
        </div>
      </div>
    </div>
  )
}
