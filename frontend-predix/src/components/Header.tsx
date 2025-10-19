'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { motion } from 'framer-motion'
import { Brain, Activity, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRoundStore } from '@/store/roundStore'

export function Header() {
  const { aiStatus } = useRoundStore()

  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="sticky top-0 z-50 glass border-b border-white/10"
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Brain className="w-8 h-8 text-purple-400" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">PREDIX AI</h1>
              <p className="text-xs text-slate-400">Polygon 2.0</p>
            </div>
          </div>

          {/* AI Status */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-slate-300">AI Status:</span>
              <Badge 
                variant={aiStatus === 'active' ? 'default' : 'secondary'}
                className={
                  aiStatus === 'active' 
                    ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                    : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                }
              >
                {aiStatus === 'active' ? 'Active' : 'Standby'}
              </Badge>
            </div>
          </div>

          {/* Connect Wallet */}
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="hidden md:flex">
              <Settings className="w-4 h-4" />
            </Button>
            <ConnectButton 
              chainStatus="icon"
              accountStatus={{
                smallScreen: 'avatar',
                largeScreen: 'full',
              }}
            />
          </div>
        </div>
      </div>
    </motion.header>
  )
}
