// AlertsPage — create and manage price alerts for stocks
// Alerts are stored in Supabase and checked against live Finnhub quotes on load
import { useEffect, useState } from 'react'
import { Bell, BellOff, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getQuote } from '../lib/finnhub'
import Modal from '../components/ui/Modal'

// Skeleton placeholder block
function Skeleton({ className }) {
  return <div className={`bg-elevated rounded animate-pulse ${className}`} />
}

export default function AlertsPage() {
  // Current logged-in user
  const [user, setUser] = useState(null)

  // Alerts from Supabase
  const [alerts,  setAlerts]  = useState([])
  // Live quotes keyed by ticker
  const [quotes,  setQuotes]  = useState({})
  // Loading states
  const [loading, setLoading] = useState(true)

  // "Add Alert" modal state
  const [modalOpen,     setModalOpen]     = useState(false)
  const [formTicker,    setFormTicker]    = useState('')
  const [formTarget,    setFormTarget]    = useState('')
  const [formDirection, setFormDirection] = useState('above')  // 'above' | 'below'
  const [formError,     setFormError]     = useState('')
  const [formLoading,   setFormLoading]   = useState(false)

  // Get user session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
  }, [])

  // Fetch alerts when user is known
  useEffect(() => {
    if (!user) return
    fetchAlerts()
  }, [user])

  async function fetchAlerts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Alerts fetch error:', error)
      setLoading(false)
      return
    }

    const alertList = data ?? []
    setAlerts(alertList)

    // Fetch live quotes for all unique tickers in the alert list
    if (alertList.length > 0) {
      const tickers = [...new Set(alertList.map(a => a.ticker))]
      await fetchAndCheckQuotes(alertList, tickers)
    } else {
      setLoading(false)
    }
  }

  // Fetch quotes and auto-trigger any alerts that have crossed their target
  async function fetchAndCheckQuotes(alertList, tickers) {
    const results = await Promise.allSettled(tickers.map(t => getQuote(t)))
    const q = {}
    tickers.forEach((ticker, i) => {
      if (results[i].status === 'fulfilled') q[ticker] = results[i].value
    })
    setQuotes(q)

    // Check each alert — if crossed, mark as triggered in Supabase
    const triggerUpdates = []
    for (const alert of alertList) {
      if (alert.is_triggered) continue   // Already triggered, skip
      const curPrice = q[alert.ticker]?.c
      if (curPrice == null) continue

      const crossed = alert.direction === 'above'
        ? curPrice >= alert.target_price
        : curPrice <= alert.target_price

      if (crossed) {
        triggerUpdates.push(alert.id)
      }
    }

    // Batch-update triggered alerts in Supabase
    if (triggerUpdates.length > 0) {
      await supabase
        .from('alerts')
        .update({ is_triggered: true })
        .in('id', triggerUpdates)

      // Update local state to reflect the triggers immediately
      setAlerts(prev => prev.map(a =>
        triggerUpdates.includes(a.id) ? { ...a, is_triggered: true } : a
      ))
    }

    setLoading(false)
  }

  // Submit the "Add Alert" form
  async function handleAddAlert(e) {
    e.preventDefault()
    setFormError('')

    const ticker = formTicker.trim().toUpperCase()
    const target = parseFloat(formTarget)

    if (!ticker) return setFormError('Please enter a ticker.')
    if (isNaN(target) || target <= 0) return setFormError('Target price must be a positive number.')

    setFormLoading(true)

    // Validate the ticker exists via Finnhub before saving
    try {
      const quote = await getQuote(ticker)
      if (!quote || quote.c === 0) {
        setFormError(`Ticker "${ticker}" not found.`)
        setFormLoading(false)
        return
      }
    } catch {
      setFormError('Could not validate ticker. Try again.')
      setFormLoading(false)
      return
    }

    // Insert alert into Supabase
    const { error } = await supabase.from('alerts').insert({
      user_id:      user.id,
      ticker,
      target_price: target,
      direction:    formDirection,
    })

    if (error) {
      setFormError('Failed to create alert. Please try again.')
    } else {
      setModalOpen(false)
      setFormTicker('')
      setFormTarget('')
      setFormDirection('above')
      await fetchAlerts()
    }
    setFormLoading(false)
  }

  // Delete an alert (no confirmation needed per spec)
  async function deleteAlert(id) {
    await supabase.from('alerts').delete().eq('id', id)
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  // Format a date string for the Created column
  function formatDate(ts) {
    return new Date(ts).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    })
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Alerts</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {alerts.length > 0
              ? `${alerts.length} alert${alerts.length !== 1 ? 's' : ''} — checked against live prices on load`
              : 'Get notified when stocks hit your target prices'}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-light text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          Add Alert
        </button>
      </div>

      {/* ── Loading skeleton ── */}
      {loading ? (
        <div className="bg-surface rounded-xl border border-white/[0.08] overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.05]">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20 ml-auto" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>

      ) : alerts.length === 0 ? (
        /* ── Empty state ── */
        <div className="bg-surface rounded-xl border border-white/[0.08] p-16 flex flex-col items-center gap-4 text-center">
          <BellOff size={48} className="text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-300">No alerts set</h2>
          <p className="text-sm text-slate-500 max-w-xs">
            Create a price alert and we&apos;ll check it against live prices every time you visit.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary-light text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors mt-2"
          >
            <Plus size={15} />
            Create First Alert
          </button>
        </div>

      ) : (
        /* ── Alerts table ── */
        <div className="bg-surface rounded-xl border border-white/[0.08] overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[80px_100px_110px_90px_100px_120px_50px] px-5 py-3 border-b border-white/[0.08] text-xs font-medium text-slate-500 uppercase tracking-wide">
            <span>Ticker</span>
            <span className="text-right">Cur. Price</span>
            <span className="text-right">Target Price</span>
            <span className="text-center">Direction</span>
            <span className="text-center">Status</span>
            <span>Created</span>
            <span></span>
          </div>

          {/* Alert rows */}
          {alerts.map(alert => {
            const q         = quotes[alert.ticker]
            const curPrice  = q?.c
            const triggered = alert.is_triggered

            return (
              <div
                key={alert.id}
                className="grid grid-cols-[80px_100px_110px_90px_100px_120px_50px] px-5 py-3.5
                           border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors items-center"
              >
                {/* Ticker */}
                <span className="text-sm font-mono font-bold text-accent-purple">
                  {alert.ticker}
                </span>

                {/* Current live price */}
                <span className="text-sm font-mono text-slate-200 text-right">
                  {curPrice != null ? `$${curPrice.toFixed(2)}` : '—'}
                </span>

                {/* Target price */}
                <span className="text-sm font-mono text-slate-300 text-right">
                  ${alert.target_price.toFixed(2)}
                </span>

                {/* Direction badge */}
                <div className="flex justify-center">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                    ${alert.direction === 'above'
                      ? 'bg-accent-green/10 text-accent-green'
                      : 'bg-accent-red/10 text-accent-red'
                    }`}
                  >
                    {alert.direction === 'above' ? 'Above' : 'Below'}
                  </span>
                </div>

                {/* Status badge — Triggered (yellow) or Active (green) */}
                <div className="flex justify-center">
                  {triggered ? (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/20">
                      Triggered
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent-green/10 text-accent-green border border-accent-green/20">
                      Active
                    </span>
                  )}
                </div>

                {/* Created date */}
                <span className="text-xs text-slate-500">
                  {formatDate(alert.created_at)}
                </span>

                {/* Delete button — no confirmation for alerts */}
                <button
                  onClick={() => deleteAlert(alert.id)}
                  className="text-slate-600 hover:text-accent-red transition-colors p-1 rounded justify-self-end"
                  title="Delete alert"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Info note about how alerts work ── */}
      {alerts.length > 0 && (
        <div className="flex items-start gap-2 bg-elevated rounded-xl border border-white/[0.06] px-4 py-3">
          <Bell size={14} className="text-slate-500 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500">
            Alerts are checked against live prices each time you load this page.
            Triggered alerts remain visible until you delete them.
          </p>
        </div>
      )}

      {/* ── Add Alert Modal ── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setFormError('') }}
        title="Create Price Alert"
      >
        <form onSubmit={handleAddAlert} className="flex flex-col gap-4">

          {/* Ticker input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Ticker Symbol</label>
            <input
              type="text"
              placeholder="e.g. AAPL"
              value={formTicker}
              onChange={e => setFormTicker(e.target.value.toUpperCase())}
              className="bg-elevated border border-white/[0.08] rounded-lg px-3 py-2 text-sm
                         text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary
                         focus:ring-1 focus:ring-primary transition-colors"
              required
            />
          </div>

          {/* Direction select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Alert Direction</label>
            <select
              value={formDirection}
              onChange={e => setFormDirection(e.target.value)}
              className="bg-elevated border border-white/[0.08] rounded-lg px-3 py-2 text-sm
                         text-slate-200 focus:outline-none focus:border-primary
                         focus:ring-1 focus:ring-primary transition-colors"
            >
              <option value="above">Above — alert when price rises above target</option>
              <option value="below">Below — alert when price falls below target</option>
            </select>
          </div>

          {/* Target price input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Target Price ($)</label>
            <input
              type="number"
              placeholder="e.g. 200.00"
              min="0.01"
              step="any"
              value={formTarget}
              onChange={e => setFormTarget(e.target.value)}
              className="bg-elevated border border-white/[0.08] rounded-lg px-3 py-2 text-sm
                         text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary
                         focus:ring-1 focus:ring-primary transition-colors"
              required
            />
          </div>

          {/* Error message */}
          {formError && (
            <p className="text-xs text-accent-red">{formError}</p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={formLoading}
            className="bg-primary hover:bg-primary-light text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {formLoading ? 'Validating…' : 'Create Alert'}
          </button>
        </form>
      </Modal>

    </div>
  )
}
