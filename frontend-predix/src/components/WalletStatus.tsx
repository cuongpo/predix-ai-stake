'use client'

import { useAccount, useBalance, useNetwork } from 'wagmi'
import { motion } from 'framer-motion'
import { Wallet, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatEther } from 'viem'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export function WalletStatus() {
  const { address, isConnected } = useAccount()
  const { data: balance } = useBalance({ address })
  const { chain } = useNetwork()

  if (!isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center"
      >
        <Card className="glass border-yellow-500/30 max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-yellow-400">
              <Wallet className="w-5 h-5" />
              Connect Wallet
            </CardTitle>
            <CardDescription>
              Connect your wallet to start predicting and earning POL rewards
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <ConnectButton />
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  const isCorrectNetwork = chain?.id === 80002 || chain?.id === 137 // Amoy or Polygon
  const balanceAmount = balance ? parseFloat(formatEther(balance.value)) : 0
  const hasMinimumBalance = balanceAmount >= 0.01

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 md:grid-cols-3 gap-4"
    >
      {/* Wallet Connection Status */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-green-400" />
            Wallet Connected
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="font-mono text-xs text-slate-300">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-6 p-1"
            onClick={() => navigator.clipboard.writeText(address || '')}
          >
            Copy Address
          </Button>
        </CardContent>
      </Card>

      {/* Network Status */}
      <Card className={`glass ${isCorrectNetwork ? 'border-green-500/30' : 'border-red-500/30'}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            {isCorrectNetwork ? (
              <CheckCircle className="w-4 h-4 text-green-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}
            Network
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Badge 
            variant={isCorrectNetwork ? "default" : "destructive"}
            className={isCorrectNetwork ? "bg-green-500/20 text-green-400" : ""}
          >
            {chain?.name || 'Unknown'}
          </Badge>
          {!isCorrectNetwork && (
            <p className="text-xs text-red-400">
              Please switch to Polygon Amoy testnet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Balance Status */}
      <Card className={`glass ${hasMinimumBalance ? 'border-green-500/30' : 'border-yellow-500/30'}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            {hasMinimumBalance ? (
              <CheckCircle className="w-4 h-4 text-green-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-yellow-400" />
            )}
            POL Balance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="font-mono text-lg font-bold">
            {balanceAmount.toFixed(4)} POL
          </div>
          {!hasMinimumBalance && (
            <div className="space-y-1">
              <p className="text-xs text-yellow-400">
                Minimum 0.01 POL needed to participate
              </p>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-6 border-blue-500/50 text-blue-400"
                onClick={() => window.open('https://faucet.polygon.technology/', '_blank')}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Get Testnet POL
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
