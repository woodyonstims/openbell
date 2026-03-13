// PortfolioPage — track stock positions, P&L, and allocation breakdown
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer, Legend
} from 'recharts'
import { Plus, Trash2, Briefcase } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getQuote } from '../lib/finnhub'
import Modal from '../components/ui/Modal'

// Accent colours to cycle through for the donut chart slices
const CHART_COLORS = [
  '#7c3aed', '#60a5fa', '#4ade80', '#facc15',
  '#f87171', '#c084fc', '#fb923c', '#34d399',
]

// Skeleton placeholder block
function Skeleton({ className }) {
  return <div className={`bg-elevated rounded animate-pulse ${className}`} />
}

// Custom tooltip for the pie chart
function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-elevated border border-white/[0.08] rounded-lg px-3 py-2 text-xs">
      <p className="text-slate-200 font-semibold">{payload[0].name}</p>
      <p className="text-slate-400">{payload[0].value?.toFixed(1)}%</p>
    </div>
  )
}

export default function PortfolioPage() {
  const navigate = useNavigate()

  // Portfolio rows from Supabase
  const [positions,     setPositions]     = useState([])
  // Live quotes keyed by ticker
  const [quotes,        setQuotes]        = useState({})
  // Loading states
  const [loadingList,   setLoadingList]   = useState(true)
  const [loadingQuotes, setLoadingQuotes] = useState(false)
  // Which row is being confirmed for deletion
  const [confirmRemove, setConfirmRemove] = useState(null)
  // Current user
  const [user, setUser] = useState(null)

  // "Add Position" modal state
  const [modalOpen,    setModalOpen]    = useState(false)
  const [formTicker,   setFormTicker]   = useState('')
  const [formShares,   setFormShares]   = useState('')
  const [formAvgPrice, setFormAvgPrice] = useState('')
  const [formError,    setFormError]    = useState('')
  const [formLoading,  setFormLoading]  = useState(false)

  // Get the current user session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
  }, [])

  // Fetch portfolio when user is known
  useEffect(() => {
    if (!user) return
    fetchPortfolio()
  }, [user])

  async function fetchPortfolio() {
    setLoadingList(true)
    const { data, error } = await supabase
      .from('portfolio')
      .select('*')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false })

    if (error) {
      console.error('Portfolio fetch error:', error)
      setLoadingList(false)
      return
    }

    setPositions(data ?? [])
    setLoadingList(false)

    // Fetch live quotes for every unique ticker in the portfolio
    if (data?.length) {
      const tickers = [...new Set(data.map(p => p.ticker))]
      fetchQuotes(tickers)
    }
  }

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

  // Submit the "Add Position" form
  async function handleAddPosition(e) {
    e.preventDefault()
    setFormError('')
    const ticker = formTicker.trim().toUpperCase()
    const shares = parseFloat(formShares)
    const avg    = parseFloat(formAvgPrice)

    // Basic validation
    if (!ticker) return setFormError('Please enter a ticker.')
    if (isNaN(shares) || shares <= 0) return setFormError('Shares must be a positive number.')
    if (isNaN(avg)    || avg    <= 0) return setFormError('Avg price must be a positive number.')

    setFormLoading(true)

    // Validate the ticker exists via Finnhub
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

    // Insert position into Supabase
    const { error } = await supabase.from('portfolio').insert({
      user_id:   user.id,
      ticker,
      shares,
      avg_price: avg,
    })

    if (error) {
      setFormError('Failed to add position. Please try again.')
    } else {
      // Reset form and refresh data
      setModalOpen(false)
      setFormTicker('')
      setFormShares('')
      setFormAvgPrice('')
      await fetchPortfolio()
    }
    setFormLoading(false)
  }

  // Delete a position
  async function removePosition(id) {
    await supabase.from('portfolio').delete().eq('id', id)
    setPositions(prev => prev.filter(p => p.id !== id))
    setConfirmRemove(null)
  }

  // ── Derived summary calculations ──

  // Total market value: sum of shares × current price
  const totalValue = positions.reduce((acc, p) => {
    const price = quotes[p.ticker]?.c ?? 0
    return acc + p.shares * price
  }, 0)

  // Total cost basis: sum of shares × average buy price
  const totalCost = positions.reduce((acc, p) => acc + p.shares * p.avg_price, 0)

  // Overall P&L
  const totalPnl    = totalValue - totalCost
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0
  const pnlColour   = totalPnl >= 0 ? 'text-accent-green' : 'text-accent-red'

  // Data for the allocation donut chart — each ticker as % of total value
  const pieData = positions
    .map(p => ({
      name:  p.ticker,
      value: totalValue > 0
        ? ((p.shares * (quotes[p.ticker]?.c ?? 0)) / totalValue) * 100
        : 0,
    }))
    .filter(d => d.value > 0)

  return (
    <div className="flex flex-col gap-6">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Portfolio</h1>
          <p className="text-sm text-slate-400 mt-0.5">Your positions and performance</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-light text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          Add Position
        </button>
      </div>

      {/* ── Summary row ── */}
      {!loadingList && positions.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Total Value',
              value: `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              colour: 'text-slate-100',
            },
            {
              label: 'Total Cost',
              value: `$${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              colour: 'text-slate-100',
            },
            {
              label: 'Total P&L',
              value: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              colour: pnlColour,
            },
            {
              label: 'P&L %',
              value: `${totalPnlPct >= 0 ? '+' : ''}${totalPnlPct.toFixed(2)}%`,
              colour: pnlColour,
            },
          ].map(({ label, value, colour }) => (
            <div key={label} className="bg-surface rounded-xl border border-white/[0.08] p-4">
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className={`text-xl font-mono font-bold ${colour}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Loading state ── */}
      {loadingList ? (
        <div className="bg-surface rounded-xl border border-white/[0.08] overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.05]">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20 ml-auto" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>

      ) : positions.length === 0 ? (
        /* ── Empty state ── */
        <div className="bg-surface rounded-xl border border-white/[0.08] p-16 flex flex-col items-center gap-4 text-center">
          <Briefcase size={48} className="text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-300">No positions yet</h2>
          <p className="text-sm text-slate-500 max-w-xs">
            Add your stock positions to track your portfolio value and P&L.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary-light text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors mt-2"
          >
            <Plus size={15} />
            Add First Position
          </button>
        </div>

      ) : (
        /* ── Positions table + allocation chart ── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Positions table — 2/3 width */}
          <div className="lg:col-span-2 bg-surface rounded-xl border border-white/[0.08] overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[80px_70px_90px_100px_100px_100px_80px_60px] px-5 py-3 border-b border-white/[0.08] text-xs font-medium text-slate-500 uppercase tracking-wide">
              <span>Ticker</span>
              <span className="text-right">Shares</span>
              <span className="text-right">Avg Price</span>
              <span className="text-right">Cur. Price</span>
              <span className="text-right">Mkt Value</span>
              <span className="text-right">P&amp;L</span>
              <span className="text-right">P&amp;L %</span>
              <span></span>
            </div>

            {/* Position rows */}
            {positions.map(pos => {
              const q          = quotes[pos.ticker]
              const curPrice   = q?.c ?? 0
              const mktValue   = pos.shares * curPrice
              const pnl        = mktValue - pos.shares * pos.avg_price
              const pnlPct     = pos.avg_price > 0 ? (pnl / (pos.shares * pos.avg_price)) * 100 : 0
              const isPos      = pnl >= 0
              const colour     = isPos ? 'text-accent-green' : 'text-accent-red'
              const isRemoving = confirmRemove === pos.id

              return (
                <div
                  key={pos.id}
                  className="grid grid-cols-[80px_70px_90px_100px_100px_100px_80px_60px] px-5 py-3.5
                             border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors items-center"
                >
                  {/* Ticker — navigates to stock detail page */}
                  <button
                    onClick={() => navigate(`/stocks/${pos.ticker}`)}
                    className="text-sm font-semibold font-mono text-accent-purple hover:text-accent-blue transition-colors text-left"
                  >
                    {pos.ticker}
                  </button>

                  {/* Shares */}
                  <span className="text-sm font-mono text-slate-300 text-right">
                    {pos.shares}
                  </span>

                  {/* Average buy price */}
                  <span className="text-sm font-mono text-slate-400 text-right">
                    ${pos.avg_price.toFixed(2)}
                  </span>

                  {/* Current price (live) */}
                  <span className="text-sm font-mono text-slate-200 text-right">
                    {loadingQuotes
                      ? <Skeleton className="h-4 w-16 ml-auto" />
                      : curPrice ? `$${curPrice.toFixed(2)}` : '—'}
                  </span>

                  {/* Market value */}
                  <span className="text-sm font-mono text-slate-200 text-right">
                    {loadingQuotes
                      ? <Skeleton className="h-4 w-16 ml-auto" />
                      : mktValue ? `$${mktValue.toFixed(2)}` : '—'}
                  </span>

                  {/* Dollar P&L */}
                  <span className={`text-sm font-mono text-right ${colour}`}>
                    {loadingQuotes
                      ? <Skeleton className="h-4 w-16 ml-auto" />
                      : `${isPos ? '+' : ''}$${pnl.toFixed(2)}`}
                  </span>

                  {/* Percent P&L */}
                  <span className={`text-sm font-mono font-semibold text-right ${colour}`}>
                    {loadingQuotes
                      ? <Skeleton className="h-4 w-12 ml-auto" />
                      : `${isPos ? '+' : ''}${pnlPct.toFixed(2)}%`}
                  </span>

                  {/* Delete with inline confirm */}
                  <div className="flex items-center justify-end gap-1">
                    {isRemoving ? (
                      <>
                        <button
                          onClick={() => removePosition(pos.id)}
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
                        onClick={() => setConfirmRemove(pos.id)}
                        className="text-slate-600 hover:text-accent-red transition-colors p-1 rounded"
                        title="Remove position"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Allocation donut chart — 1/3 width */}
          <div className="bg-surface rounded-xl border border-white/[0.08] p-5">
            <h2 className="text-sm font-semibold text-slate-200 mb-4">Allocation</h2>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}   // Donut hole
                    outerRadius={95}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {/* Each slice gets a cycling accent colour */}
                    {pieData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <ReTooltip content={<PieTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={val => (
                      <span className="text-xs text-slate-400">{val}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">
                No allocation data
              </p>
            )}
          </div>

        </div>
      )}

      {/* ── Add Position Modal ── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setFormError('') }}
        title="Add Position"
      >
        <form onSubmit={handleAddPosition} className="flex flex-col gap-4">

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

          {/* Shares input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Number of Shares</label>
            <input
              type="number"
              placeholder="e.g. 10"
              min="0.0001"
              step="any"
              value={formShares}
              onChange={e => setFormShares(e.target.value)}
              className="bg-elevated border border-white/[0.08] rounded-lg px-3 py-2 text-sm
                         text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary
                         focus:ring-1 focus:ring-primary transition-colors"
              required
            />
          </div>

          {/* Average buy price */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Average Buy Price ($)</label>
            <input
              type="number"
              placeholder="e.g. 150.00"
              min="0.01"
              step="any"
              value={formAvgPrice}
              onChange={e => setFormAvgPrice(e.target.value)}
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
            {formLoading ? 'Validating…' : 'Add Position'}
          </button>
        </form>
      </Modal>

    </div>
  )
}
