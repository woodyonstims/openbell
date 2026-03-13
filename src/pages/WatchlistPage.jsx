// WatchlistPage — manage and view the user's saved stocks with live prices
import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, BookmarkX, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getQuote, searchStocks } from '../lib/finnhub'
import Modal from '../components/ui/Modal'

// Skeleton block — used while data is loading
function Skeleton({ className }) {
  return <div className={`bg-elevated rounded animate-pulse ${className}`} />
}

export default function WatchlistPage() {
  const navigate = useNavigate()

  // List of watchlist items from Supabase {id, ticker, added_at}
  const [watchlist,     setWatchlist]     = useState([])
  // Live quotes keyed by ticker
  const [quotes,        setQuotes]        = useState({})
  // Loading states
  const [loadingList,   setLoadingList]   = useState(true)
  const [loadingQuotes, setLoadingQuotes] = useState(false)
  // Which row is in "confirm remove" state (stores ticker string)
  const [confirmRemove, setConfirmRemove] = useState(null)
  // Current logged-in user
  const [user, setUser] = useState(null)

  // "Add Stock" modal state
  const [modalOpen,      setModalOpen]      = useState(false)
  const [searchQuery,    setSearchQuery]    = useState('')
  const [searchResults,  setSearchResults]  = useState([])
  const [searchLoading,  setSearchLoading]  = useState(false)
  const [addingTicker,   setAddingTicker]   = useState(null)  // ticker being added

  // Debounce timer ref for search input
  const searchTimer = useRef(null)

  // Get the current user on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
  }, [])

  // Fetch the user's watchlist from Supabase whenever user changes
  useEffect(() => {
    if (!user) return
    fetchWatchlist()
  }, [user])

  async function fetchWatchlist() {
    setLoadingList(true)
    const { data, error } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false })

    if (error) {
      console.error('Watchlist fetch error:', error)
      setLoadingList(false)
      return
    }

    setWatchlist(data ?? [])
    setLoadingList(false)

    // Once we have the list, fetch live quotes for all tickers
    if (data?.length) {
      fetchQuotes(data.map(w => w.ticker))
    }
  }

  // Fetch Finnhub quotes for a list of tickers in parallel
  async function fetchQuotes(tickers) {
    setLoadingQuotes(true)
    const results = await Promise.allSettled(tickers.map(t => getQuote(t)))
    const q = {}
    tickers.forEach((ticker, i) => {
      if (results[i].status === 'fulfilled') q[ticker] = results[i].value
    })
    setQuotes(q)
    setLoadingQuotes(false)
  }

  // Debounced Finnhub search as user types in the modal
  function handleSearchChange(value) {
    setSearchQuery(value)
    clearTimeout(searchTimer.current)
    if (!value.trim()) {
      setSearchResults([])
      return
    }
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const data = await searchStocks(value)
        // Only show US common stocks to keep results relevant
        const filtered = (data.result ?? [])
          .filter(r => r.type === 'Common Stock')
          .slice(0, 8)
        setSearchResults(filtered)
      } catch {
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }, 400)  // Wait 400ms after last keystroke before searching
  }

  // Add a ticker to the user's watchlist
  async function addToWatchlist(ticker) {
    if (!user) return
    setAddingTicker(ticker)
    const { error } = await supabase
      .from('watchlist')
      .insert({ user_id: user.id, ticker: ticker.toUpperCase() })

    if (!error) {
      // Re-fetch the full list to reflect the new addition
      await fetchWatchlist()
      setModalOpen(false)
      setSearchQuery('')
      setSearchResults([])
    }
    setAddingTicker(null)
  }

  // Remove a ticker from the watchlist
  async function removeFromWatchlist(id, ticker) {
    await supabase
      .from('watchlist')
      .delete()
      .eq('id', id)
    // Update local state without re-fetching for instant feedback
    setWatchlist(prev => prev.filter(w => w.id !== id))
    setQuotes(prev => {
      const next = { ...prev }
      delete next[ticker]
      return next
    })
    setConfirmRemove(null)
  }

  // Format price change with colour
  function ChangeCell({ quote }) {
    if (!quote) return <span className="text-slate-500">—</span>
    const isPos = (quote.d ?? 0) >= 0
    const colour = isPos ? 'text-accent-green' : 'text-accent-red'
    return (
      <span className={`font-mono text-sm ${colour}`}>
        {isPos ? '+' : ''}{quote.d?.toFixed(2) ?? '—'}
      </span>
    )
  }

  function PctChangeCell({ quote }) {
    if (!quote) return <span className="text-slate-500">—</span>
    const isPos = (quote.dp ?? 0) >= 0
    const colour = isPos ? 'text-accent-green' : 'text-accent-red'
    return (
      <span className={`font-mono text-sm font-semibold ${colour}`}>
        {isPos ? '+' : ''}{quote.dp?.toFixed(2) ?? '—'}%
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Watchlist</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {watchlist.length > 0
              ? `${watchlist.length} stock${watchlist.length !== 1 ? 's' : ''} tracked`
              : 'Your saved stocks with live prices'}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-light text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          Add Stock
        </button>
      </div>

      {/* ── Loading state ── */}
      {loadingList ? (
        <div className="bg-surface rounded-xl border border-white/[0.08] overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.05]">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-20 ml-auto" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>

      ) : watchlist.length === 0 ? (
        /* ── Empty state ── */
        <div className="bg-surface rounded-xl border border-white/[0.08] p-16 flex flex-col items-center gap-4 text-center">
          <BookmarkX size={48} className="text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-300">Your watchlist is empty</h2>
          <p className="text-sm text-slate-500 max-w-xs">
            Add stocks to track their prices and changes in one place.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary-light text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors mt-2"
          >
            <Plus size={15} />
            Add Your First Stock
          </button>
        </div>

      ) : (
        /* ── Watchlist table ── */
        <div className="bg-surface rounded-xl border border-white/[0.08] overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[80px_1fr_110px_90px_90px_90px_90px_80px] px-5 py-3 border-b border-white/[0.08] text-xs font-medium text-slate-500 uppercase tracking-wide">
            <span>Ticker</span>
            <span>Company</span>
            <span className="text-right">Price</span>
            <span className="text-right">Change</span>
            <span className="text-right">% Change</span>
            <span className="text-right">52W High</span>
            <span className="text-right">52W Low</span>
            <span></span>
          </div>

          {/* Rows */}
          {watchlist.map(item => {
            const q = quotes[item.ticker]
            const isRemoving = confirmRemove === item.id

            return (
              <div
                key={item.id}
                className="grid grid-cols-[80px_1fr_110px_90px_90px_90px_90px_80px] px-5 py-3.5
                           border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors items-center"
              >
                {/* Ticker — clickable, navigates to stock page */}
                <button
                  onClick={() => navigate(`/stocks/${item.ticker}`)}
                  className="text-sm font-semibold font-mono text-accent-purple hover:text-accent-blue transition-colors text-left"
                >
                  {item.ticker}
                </button>

                {/* Company name from Finnhub (not stored in watchlist) — show ticker if unavailable */}
                <span className="text-sm text-slate-300 truncate pr-4">
                  {item.ticker}
                </span>

                {/* Current price */}
                <span className="text-sm font-mono text-slate-100 text-right">
                  {loadingQuotes
                    ? <Skeleton className="h-4 w-20 ml-auto" />
                    : q ? `$${q.c?.toFixed(2)}` : '—'}
                </span>

                {/* Dollar change */}
                <div className="text-right">
                  {loadingQuotes
                    ? <Skeleton className="h-4 w-14 ml-auto" />
                    : <ChangeCell quote={q} />}
                </div>

                {/* Percent change */}
                <div className="text-right">
                  {loadingQuotes
                    ? <Skeleton className="h-4 w-14 ml-auto" />
                    : <PctChangeCell quote={q} />}
                </div>

                {/* 52-week high */}
                <span className="text-sm font-mono text-slate-400 text-right">
                  {loadingQuotes
                    ? <Skeleton className="h-4 w-16 ml-auto" />
                    : q?.h ? `$${q.h.toFixed(2)}` : '—'}
                </span>

                {/* 52-week low */}
                <span className="text-sm font-mono text-slate-400 text-right">
                  {loadingQuotes
                    ? <Skeleton className="h-4 w-16 ml-auto" />
                    : q?.l ? `$${q.l.toFixed(2)}` : '—'}
                </span>

                {/* Remove button — shows confirm/cancel inline on first click */}
                <div className="flex items-center justify-end gap-1">
                  {isRemoving ? (
                    <>
                      <button
                        onClick={() => removeFromWatchlist(item.id, item.ticker)}
                        className="text-xs text-accent-red hover:text-red-400 font-medium transition-colors"
                      >
                        Remove
                      </button>
                      <span className="text-slate-600">/</span>
                      <button
                        onClick={() => setConfirmRemove(null)}
                        className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmRemove(item.id)}
                      className="text-slate-600 hover:text-accent-red transition-colors p-1 rounded"
                      title="Remove from watchlist"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Add Stock Modal ── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setSearchQuery(''); setSearchResults([]) }}
        title="Add Stock to Watchlist"
      >
        <div className="flex flex-col gap-4">
          {/* Search input */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by ticker or company name…"
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              className="w-full bg-elevated border border-white/[0.08] rounded-lg pl-9 pr-3 py-2 text-sm
                         text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary
                         focus:ring-1 focus:ring-primary transition-colors"
              autoFocus
            />
          </div>

          {/* Search results list */}
          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
            {searchLoading ? (
              // Skeleton while searching
              [...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))
            ) : searchResults.length > 0 ? (
              searchResults.map(result => {
                // Check if already in watchlist
                const alreadyAdded = watchlist.some(w => w.ticker === result.symbol)
                return (
                  <button
                    key={result.symbol}
                    onClick={() => !alreadyAdded && addToWatchlist(result.symbol)}
                    disabled={alreadyAdded || addingTicker === result.symbol}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg
                               hover:bg-elevated transition-colors text-left disabled:opacity-50"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-slate-100">{result.symbol}</span>
                      <span className="text-xs text-slate-500 truncate max-w-[260px]">{result.description}</span>
                    </div>
                    {alreadyAdded ? (
                      <span className="text-xs text-slate-500 shrink-0 ml-2">Added</span>
                    ) : addingTicker === result.symbol ? (
                      <span className="text-xs text-slate-500 shrink-0 ml-2">Adding…</span>
                    ) : (
                      <Plus size={14} className="text-slate-500 shrink-0 ml-2" />
                    )}
                  </button>
                )
              })
            ) : searchQuery.trim() ? (
              <p className="text-sm text-slate-500 text-center py-4">No results found</p>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">
                Type a ticker or company name to search
              </p>
            )}
          </div>
        </div>
      </Modal>

    </div>
  )
}
