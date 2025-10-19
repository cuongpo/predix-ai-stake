import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PREDIX AI - POL Prediction dApp',
  description: 'AI-powered prediction platform on Polygon 2.0 using POL tokens',
  keywords: ['polygon', 'pol', 'prediction', 'ai', 'defi', 'dapp'],
  authors: [{ name: 'PREDIX AI Team' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#8B5CF6',
  openGraph: {
    title: 'PREDIX AI - POL Prediction dApp',
    description: 'AI-powered prediction platform on Polygon 2.0',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PREDIX AI - POL Prediction dApp',
    description: 'AI-powered prediction platform on Polygon 2.0',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900`}>
        <Providers>
          <div className="relative min-h-screen">
            {/* Background Effects */}
            <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
            <div className="fixed inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-blue-500/10" />
            
            {/* Main Content */}
            <div className="relative z-10">
              {children}
            </div>
            
            {/* Toast Notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1e293b',
                  color: '#f1f5f9',
                  border: '1px solid #475569',
                },
                success: {
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#f1f5f9',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#f1f5f9',
                  },
                },
              }}
            />
          </div>
        </Providers>
      </body>
    </html>
  )
}
