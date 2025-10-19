'use client'

import { WagmiConfig, createConfig, configureChains } from 'wagmi'
import { polygon, polygonMumbai } from 'wagmi/chains'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'
import { RainbowKitProvider, getDefaultWallets, connectorsForWallets } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'
import '@rainbow-me/rainbowkit/styles.css'

// Polygon Amoy testnet configuration
const polygonAmoy = {
  id: 80002,
  name: 'Polygon Amoy',
  network: 'polygon-amoy',
  nativeCurrency: {
    decimals: 18,
    name: 'POL',
    symbol: 'POL',
  },
  rpcUrls: {
    public: { http: ['https://rpc-amoy.polygon.technology/'] },
    default: { http: ['https://rpc-amoy.polygon.technology/'] },
  },
  blockExplorers: {
    default: { name: 'PolygonScan', url: 'https://amoy.polygonscan.com' },
  },
  testnet: true,
}

// Configure chains and providers
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [
    polygonAmoy,
    polygon,
    ...(process.env.NODE_ENV === 'development' ? [polygonMumbai] : []),
  ],
  [
    alchemyProvider({ apiKey: process.env.NEXT_PUBLIC_ALCHEMY_ID || '' }),
    publicProvider(),
  ]
)

// Configure wallets
const { wallets } = getDefaultWallets({
  appName: 'PREDIX AI',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
  chains,
})

const connectors = connectorsForWallets([
  ...wallets,
])

// Create wagmi config
const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
})

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        cacheTime: 1000 * 60 * 10, // 10 minutes
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={wagmiConfig}>
        <RainbowKitProvider 
          chains={chains}
          theme={{
            blurs: {
              modalOverlay: 'blur(4px)',
            },
            colors: {
              accentColor: '#8B5CF6',
              accentColorForeground: 'white',
              actionButtonBorder: 'rgba(255, 255, 255, 0.04)',
              actionButtonBorderMobile: 'rgba(255, 255, 255, 0.08)',
              actionButtonSecondaryBackground: 'rgba(255, 255, 255, 0.08)',
              closeButton: 'rgba(224, 232, 255, 0.6)',
              closeButtonBackground: 'rgba(255, 255, 255, 0.08)',
              connectButtonBackground: '#8B5CF6',
              connectButtonBackgroundError: '#FF494A',
              connectButtonInnerBackground: 'linear-gradient(0deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.15))',
              connectButtonText: '#FFF',
              connectButtonTextError: '#FFF',
              connectionIndicator: '#30E000',
              downloadBottomCardBackground: 'linear-gradient(126deg, rgba(255, 255, 255, 0) 9.44%, rgba(171, 171, 171, 0.04) 71.267%), #1E293B',
              downloadTopCardBackground: 'linear-gradient(126deg, rgba(171, 171, 171, 0.2) 9.44%, rgba(255, 255, 255, 0) 71.267%), #1E293B',
              error: '#FF494A',
              generalBorder: 'rgba(255, 255, 255, 0.08)',
              generalBorderDim: 'rgba(255, 255, 255, 0.04)',
              menuItemBackground: 'rgba(224, 232, 255, 0.1)',
              modalBackdrop: 'rgba(0, 0, 0, 0.5)',
              modalBackground: '#1E293B',
              modalBorder: 'rgba(255, 255, 255, 0.08)',
              modalText: '#FFF',
              modalTextDim: 'rgba(224, 232, 255, 0.3)',
              modalTextSecondary: 'rgba(255, 255, 255, 0.6)',
              profileAction: 'rgba(224, 232, 255, 0.1)',
              profileActionHover: 'rgba(224, 232, 255, 0.2)',
              profileForeground: '#1E293B',
              selectedOptionBorder: 'rgba(224, 232, 255, 0.1)',
              standby: '#FFD641',
            },
            fonts: {
              body: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
            },
            radii: {
              actionButton: '12px',
              connectButton: '12px',
              menuButton: '12px',
              modal: '16px',
              modalMobile: '16px',
            },
            shadows: {
              connectButton: '0px 4px 12px rgba(0, 0, 0, 0.1)',
              dialog: '0px 8px 32px rgba(0, 0, 0, 0.32)',
              profileDetailsAction: '0px 2px 6px rgba(37, 41, 46, 0.04)',
              selectedOption: '0px 2px 6px rgba(0, 0, 0, 0.24)',
              selectedWallet: '0px 2px 6px rgba(0, 0, 0, 0.12)',
              walletLogo: '0px 2px 16px rgba(0, 0, 0, 0.16)',
            },
          }}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </WagmiConfig>
    </QueryClientProvider>
  )
}
