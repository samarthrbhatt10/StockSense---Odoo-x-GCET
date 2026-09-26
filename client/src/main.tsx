import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider } from '@/app/AuthProvider'
import { router } from '@/app/router'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import '@/index.css'

const container = document.getElementById('root')
if (!container) throw new Error('Root element #root was not found in index.html')

createRoot(container).render(
  <StrictMode>
    <TooltipProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </QueryClientProvider>
    </TooltipProvider>
  </StrictMode>,
)
