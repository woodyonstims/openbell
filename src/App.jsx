// App.jsx — sets up routing and handles auth state for the whole app
import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'

// Layout
import AppLayout from './components/layout/AppLayout'

// Pages
import DashboardPage  from './pages/DashboardPage'
import NewsroomPage   from './pages/NewsroomPage'
import StockPage      from './pages/StockPage'
import WatchlistPage  from './pages/WatchlistPage'
import PortfolioPage  from './pages/PortfolioPage'
import CalendarPage   from './pages/CalendarPage'
import ScreenerPage   from './pages/ScreenerPage'
import CommunityPage  from './pages/CommunityPage'
import AlertsPage     from './pages/AlertsPage'
import LoginPage      from './pages/LoginPage'
import SignupPage     from './pages/SignupPage'

export default function App() {
  const [user, setUser] = useState(null)        // The logged-in user (or null)
  const [loading, setLoading] = useState(true)  // True while we check auth status

  useEffect(() => {
    // Check if there's already a logged-in session when the app loads
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for login/logout events and update user state accordingly
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    // Clean up the listener when the component unmounts
    return () => subscription.unsubscribe()
  }, [])

  // Show nothing while we check auth — prevents flash of wrong page
  if (loading) return null

  return (
    <BrowserRouter>
      <Routes>

        {/* Public routes — no login required */}
        <Route path="/login"  element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected routes — redirect to login if not logged in */}
        <Route
          element={user ? <AppLayout user={user} /> : <Navigate to="/login" replace />}
        >
          <Route path="/"               element={<DashboardPage />} />
          <Route path="/news"           element={<NewsroomPage />} />
          <Route path="/stocks"         element={<StockPage />} />
          <Route path="/stocks/:ticker" element={<StockPage />} />
          <Route path="/watchlist"      element={<WatchlistPage />} />
          <Route path="/portfolio"      element={<PortfolioPage />} />
          <Route path="/calendar"       element={<CalendarPage />} />
          <Route path="/screener"       element={<ScreenerPage />} />
          <Route path="/community"      element={<CommunityPage />} />
          <Route path="/alerts"         element={<AlertsPage />} />
        </Route>

        {/* Catch-all — redirect unknown URLs to home */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  )
}
