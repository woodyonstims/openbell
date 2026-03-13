// TopBar — top header with search and user profile
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, LogOut, User } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function TopBar({ user }) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  // Navigate to stock page when user submits a search
  function handleSearch(e) {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/stocks/${query.trim().toUpperCase()}`)
      setQuery('')
    }
  }

  // Sign the user out via Supabase and redirect to login
  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <header className="h-14 bg-surface border-b border-white/[0.08] flex items-center px-5 gap-4 shrink-0">

      {/* Stock search bar */}
      <form onSubmit={handleSearch} className="flex-1 max-w-sm relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search ticker or company..."
          className="w-full bg-elevated border border-white/[0.08] rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
        />
      </form>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User info and sign out */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <User size={16} className="text-slate-400" />
          <span>{user?.email}</span>
        </div>
        <button
          onClick={handleSignOut}
          title="Sign out"
          className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition-colors"
        >
          <LogOut size={15} className="text-slate-400" />
        </button>
      </div>

    </header>
  )
}
