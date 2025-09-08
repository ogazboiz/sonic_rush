"use client"

import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { AppKit } from './appkit'
import { wagmiConfig } from './wagmi-config'
import { Toaster } from 'react-hot-toast'
import { RefreshProvider } from './refresh'

const queryClient = new QueryClient()

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RefreshProvider>
          <AppKit>
            {children}
            <Toaster 
              position="bottom-right"
              toastOptions={{
                style: {
                  background: '#363636',
                  color: '#fff',
                },
              }}
            />
          </AppKit>
        </RefreshProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}