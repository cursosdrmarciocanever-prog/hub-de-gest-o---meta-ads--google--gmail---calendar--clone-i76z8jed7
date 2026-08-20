import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthGate } from '@/components/AuthGate'
import { FreshnessGate } from '@/components/FreshnessGate'
import { CommandPalette } from '@/components/CommandPalette'
import Today from './pages/Today'
import Dashboard from './pages/Dashboard'
import Connect from './pages/Connect'
import Campaigns from './pages/Campaigns'
import CalendarPage from './pages/Calendar'
import CampaignDetail from './pages/CampaignDetail'
import Emails from './pages/Emails'
import NotFound from './pages/NotFound'

const App = () => (
  <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
    <AuthGate>
      <FreshnessGate>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <CommandPalette />
          <Routes>
            <Route path="/" element={<Today />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/connect" element={<Connect />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/accounts" element={<Navigate to="/campaigns" replace />} />
            <Route path="/campaign/:id" element={<CampaignDetail />} />
            <Route path="/emails" element={<Emails />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </FreshnessGate>
    </AuthGate>
  </BrowserRouter>
)

export default App
