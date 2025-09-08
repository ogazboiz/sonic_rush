'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface RefreshContextType {
  refreshTrigger: number
  triggerDelayedRefresh: () => void
}

const RefreshContext = createContext<RefreshContextType | undefined>(undefined)

export function RefreshProvider({ children }: { children: ReactNode }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const triggerDelayedRefresh = () => {
    setTimeout(() => {
      setRefreshTrigger(prev => prev + 1)
    }, 1000) // Delay for blockchain settlement
  }

  return (
    <RefreshContext.Provider value={{ refreshTrigger, triggerDelayedRefresh }}>
      {children}
    </RefreshContext.Provider>
  )
}

export function useRefresh(): RefreshContextType {
  const context = useContext(RefreshContext)
  if (context === undefined) {
    throw new Error('useRefresh must be used within a RefreshProvider')
  }
  return context
}