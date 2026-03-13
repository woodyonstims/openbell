// ScreenerPage — filter and sort a curated universe of 40 popular stocks
// All filtering is client-side after fetching live quotes from Finnhub
import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpDown, ArrowUp, ArrowDown, SlidersHorizontal } from 'lucide-react'
import { getQuote } from '../lib/finnhub'

// ── Curated stock universe ──
// 40 well-known tickers with name, sector and market cap tier
const STOCK_UNIVERSE = [
  { ticker: 'AAPL',  name: 'Apple Inc.',             sector: 'Technology', cap: 'Large' },
  { ticker: 'MSFT',  name: 'Microsoft Corp.',         sector: 'Technology', cap: 'Large' },
  { ticker: 'NVDA',  name: 'NVIDIA Corp.',            sector: 'Technology', cap: 'Large' },
  { ticker: 'GOOGL', name: 'Alphabet Inc.',           sector: 'Technology', cap: 'Large' },
  { ticker: 'META',  name: 'Meta Platforms',          sector: 'Technology', cap: 'Large' },
  { ticker: 'AMZN',  name: 'Amazon.com Inc.',         sector: 'Technology', cap: 'Large' },
  { ticker: 'TSLA',  name: 'Tesla Inc.',              sector: 'Consumer',   cap: 'Large' },
  { ticker: 'JPM',   name: 'JPMorgan Chase',          sector: 'Finance',    cap: 'Large' },
  { ticker: 'BAC',   name: 'Bank of America',         sector: 'Finance',    cap: 'Large' },
  { ticker: 'GS',    name: 'Goldman Sachs',           sector: 'Finance',    cap: 'Large' },
  { ticker: 'XOM',   name: 'ExxonMobil Corp.',        sector: 'Energy',     cap: 'Large' },
  { ticker: 'CVX',   name: 'Chevron Corp.',           sector: 'Energy',     cap: 'Large' },
  { ticker: 'JNJ',   name: 'Johnson & Johnson',       sector: 'Healthcare', cap: 'Large' },
  { ticker: 'PFE',   name: 'Pfizer Inc.',             sector: 'Healthcare', cap: 'Large' },
  { ticker: 'UNH',   name: 'UnitedHealth Group',      sector: 'Healthcare', cap: 'Large' },
  { ticker: 'NFLX',  name: 'Netflix Inc.',            sector: 'Technology', cap: 'Large' },
  { ticker: 'AMD',   name: 'Advanced Micro Devices',  sector: 'Technology', cap: 'Large' },
  { ticker: 'INTC',  name: 'Intel Corp.',             sector: 'Technology', cap: 'Large' },
  { ticker: 'CRM',   name: 'Salesforce Inc.',         sector: 'Technology', cap: 'Large' },
  { ticker: 'ORCL',  name: 'Oracle Corp.',            sector: 'Technology', cap: 'Large' },
  { ticker: 'DIS',   name: 'Walt Disney Co.',         sector: 'Consumer',   cap: 'Large' },
  { ticker: 'NKE',   name: 'Nike Inc.',               sector: 'Consumer',   cap: 'Large' },
  { ticker: 'MCD',   name: "McDonald's Corp.",        sector: 'Consumer',   cap: 'Large' },
  { ticker: 'SBUX',  name: 'Starbucks Corp.',         sector: 'Consumer',   cap: 'Large' },
  { ticker: 'WMT',   name: 'Walmart Inc.',            sector: 'Consumer',   cap: 'Large' },
  { ticker: 'BA',    name: 'Boeing Co.',              sector: 'Industrial', cap: 'Large' },
  { ticker: 'CAT',   name: 'Caterpillar Inc.',        sector: 'Industrial', cap: 'Large' },
  { ticker: 'GE',    name: 'GE Aerospace',            sector: 'Industrial', cap: 'Large' },
  { ticker: 'LMT',   name: 'Lockheed Martin',         sector: 'Industrial', cap: 'Large' },
  { ticker: 'F',     name: 'Ford Motor Co.',          sector: 'Consumer',   cap: 'Mid'   },
  { ticker: 'GM',    name: 'General Motors',          sector: 'Consumer',   cap: 'Mid'   },
  { ticker: 'UBER',  name: 'Uber Technologies',       sector: 'Technology', cap: 'Mid'   },
  { ticker: 'LYFT',  name: 'Lyft Inc.',               sector: 'Technology', cap: 'Mid'   },
  { ticker: 'SNAP',  name: 'Snap Inc.',               sector: 'Technology', cap: 'Mid'   },
  { ticker: 'SHOP',  name: 'Shopify Inc.',            sector: 'Technology', cap: 'Mid'   },
  { ticker: 'COIN',  name: 'Coinbase Global',         sector: 'Finance',    cap: 'Mid'   },
  { ticker: 'RBLX',  name: 'Roblox Corp.',            sector: 'Technology', cap: 'Mid'   },
  { ticker: 'HOOD',  name: 'Robinhood Markets',       sector: 'Finance',    cap: 'Mid'   },
  { ticker: 'PLTR',  name: 'Palantir Technologies',   sector: 'Technology', cap: 'Mid'   },
  { ticker: 'SQ',    name: 'Block Inc.',              sector: 'Finance',    cap: 'Mid'   },
]

// Unique sector list derived from the universe (plus "All")
const SECTORS = ['All', ...new Set(STOCK_UNIVERSE.map(s => s.sector))]

// Skeleton placeholder
function Skeleton({ className }) {
  return <div className={`bg-elevated rounded animate-pulse ${className}`} />
}

// Sort icon component — shows up/down arrow based on current sort state
function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <ArrowUpDown size={12} className="text-slate-600" />
  return sortDir === 'asc'
    ? <ArrowUp size={12} className="text-accent-purple" />
    : <ArrowDown size={12} className="text-accent-purple" />
}

export default function ScreenerPage() {
  const navigate = useNavigate()

  // Live quotes keyed by ticker, fetched from Finnhub on mount
  const [quotes,  setQuotes]  = useState({})
  const [loading, setLoading] = useState(true)

  // Filter state
  const [filterSector,  setFilterSector]  = useState('All')
  const [filterCap,     setFilterCap]     = useState('All')
  const [filterMinPrice, setFilterMinPrice] = useState('')
  const [filterMaxPrice, setFilterMaxPrice] = useState('')
  const [filterChange,  setFilterChange]  = useState('All')  // All | Gainers | Losers | BigMovers

  // Sort state — column key + direction
  const [sortCol, setSortCol] = useState('ticker')
  const [sortDir, setSortDir] = useState('asc')

  // Fetch all 40 quotes in one parallel burst on mount
  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      const results = await Promise.allSettled(
        STOCK_UNIVERSE.map(s => getQuote(s.ticker))
      )
      const q = {}
      STOCK_UNIVERSE.forEach((stock, i) => {
        if (results[i].status === 'fulfilled') q[stock.ticker] = results[i].value
      })
      setQuotes(q)
      setLoading(false)
    }
    fetchAll()
  }, [])

  // Toggle sort column — flip direction if same col, else default asc
  function handleSort(col) {
    setSortCol(prev => {
      if (prev === col) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        return col
      }
      setSortDir('asc')
      return col
    })
  }

  // Apply all filters then sort — computed whenever quotes or filter state changes
  const filteredStocks = useMemo(() => {
    let results = STOCK_UNIVERSE.map(s => ({ ...s, quote: quotes[s.ticker] }))

    // Sector filter
    if (filterSector !== 'All') {
      results = results.filter(s => s.sector === filterSector)
    }

    // Market cap filter
    if (filterCap !== 'All') {
      results = results.filter(s => s.cap === filterCap)
    }

    // Price range filter
    const minP = parseFloat(filterMinPrice)
    const maxP = parseFloat(filterMaxPrice)
    if (!isNaN(minP)) results = results.filter(s => (s.quote?.c ?? 0) >= minP)
    if (!isNaN(maxP)) results = results.filter(s => (s.quote?.c ?? 0) <= maxP)

    // % Change filter
    if (filterChange === 'Gainers') {
      results = results.filter(s => (s.quote?.dp ?? 0) > 0)
    } else if (filterChange === 'Losers') {
      results = results.filter(s => (s.quote?.dp ?? 0) < 0)
    } else if (filterChange === 'BigMovers') {
      results = results.filter(s => Math.abs(s.quote?.dp ?? 0) > 3)
    }

    // Sorting — uses quote fields or metadata fields
    results.sort((a, b) => {
      let valA, valB
      switch (sortCol) {
        case 'ticker':  valA = a.ticker;           valB = b.ticker;           break
        case 'name':    valA = a.name;             valB = b.name;             break
        case 'sector':  valA = a.sector;           valB = b.sector;           break
        case 'price':   valA = a.quote?.c  ?? 0;  valB = b.quote?.c  ?? 0;  break
        case 'change':  valA = a.quote?.d  ?? 0;  valB = b.quote?.d  ?? 0;  break
        case 'pct':     valA = a.quote?.dp ?? 0;  valB = b.quote?.dp ?? 0;  break
        case 'high':    valA = a.quote?.h  ?? 0;  valB = b.quote?.h  ?? 0;  break
        case 'low':     valA = a.quote?.l  ?? 0;  valB = b.quote?.l  ?? 0;  break
        default:        valA = 0; valB = 0
      }
      if (typeof valA === 'string') {
        return sortDir === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA)
      }
      return sortDir === 'asc' ? valA - valB : valB - valA
    })

    return results
  }, [quotes, filterSector, filterCap, filterMinPrice, filterMaxPrice, filterChange, sortCol, sortDir])

  // Sortable column header button
  function ColHeader({ col, label, className = '' }) {
    return (
      <button
        onClick={() => handleSort(col)}
        className={`flex items-center gap-1 text-xs font-medium text-slate-500 uppercase tracking-wide hover:text-slate-300 transition-colors ${className}`}
      >
        {label}
        <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Screener</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Filter and discover stocks — click any row to view details
        </p>
      </div>

      {/* ── Filter bar ── */}
      <div className="bg-surface rounded-xl border border-white/[0.08] p-4">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal size={14} className="text-slate-500" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Filters</span>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Sector filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">Sector</label>
            <select
              value={filterSector}
              onChange={e => setFilterSector(e.target.value)}
              className="bg-elevated border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200
                         focus:outline-none focus:border-primary transition-colors min-w-[140px]"
            >
              {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Market cap filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">Market Cap</label>
            <select
              value={filterCap}
              onChange={e => setFilterCap(e.target.value)}
              className="bg-elevated border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200
                         focus:outline-none focus:border-primary transition-colors min-w-[120px]"
            >
              <option value="All">All</option>
              <option value="Large">Large Cap</option>
              <option value="Mid">Mid Cap</option>
            </select>
          </div>

          {/* Min price */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">Min Price ($)</label>
            <input
              type="number"
              placeholder="0"
              min="0"
              value={filterMinPrice}
              onChange={e => setFilterMinPrice(e.target.value)}
              className="bg-elevated border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200
                         placeholder-slate-600 focus:outline-none focus:border-primary transition-colors w-28"
            />
          </div>

          {/* Max price */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">Max Price ($)</label>
            <input
              type="number"
              placeholder="∞"
              min="0"
              value={filterMaxPrice}
              onChange={e => setFilterMaxPrice(e.target.value)}
              className="bg-elevated border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200
                         placeholder-slate-600 focus:outline-none focus:border-primary transition-colors w-28"
            />
          </div>

          {/* % Change filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">Movement</label>
            <select
              value={filterChange}
              onChange={e => setFilterChange(e.target.value)}
              className="bg-elevated border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200
                         focus:outline-none focus:border-primary transition-colors min-w-[140px]"
            >
              <option value="All">All</option>
              <option value="Gainers">Gainers (&gt;0%)</option>
              <option value="Losers">Losers (&lt;0%)</option>
              <option value="BigMovers">Big Movers (|%| &gt;3%)</option>
            </select>
          </div>

          {/* Reset filters */}
          <div className="flex flex-col justify-end gap-1">
            <label className="text-xs text-slate-500 invisible">Reset</label>
            <button
              onClick={() => {
                setFilterSector('All')
                setFilterCap('All')
                setFilterMinPrice('')
                setFilterMaxPrice('')
                setFilterChange('All')
              }}
              className="px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-elevated transition-colors border border-white/[0.06]"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* ── Results table ── */}
      <div className="bg-surface rounded-xl border border-white/[0.08] overflow-hidden">
        {/* Result count */}
        <div className="px-5 py-3 border-b border-white/[0.08] flex items-center justify-between">
          <span className="text-sm text-slate-400">
            {loading ? 'Loading…' : `${filteredStocks.length} result${filteredStocks.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[80px_1fr_110px_100px_90px_90px_90px_90px] px-5 py-3 border-b border-white/[0.06]">
          <ColHeader col="ticker"  label="Ticker" />
          <ColHeader col="name"    label="Name" />
          <ColHeader col="sector"  label="Sector" />
          <ColHeader col="price"   label="Price"    className="justify-end" />
          <ColHeader col="change"  label="Change"   className="justify-end" />
          <ColHeader col="pct"     label="% Chg"    className="justify-end" />
          <ColHeader col="high"    label="High"     className="justify-end" />
          <ColHeader col="low"     label="Low"      className="justify-end" />
        </div>

        {/* Loading skeleton rows */}
        {loading ? (
          [...Array(10)].map((_, i) => (
            <div key={i} className="grid grid-cols-[80px_1fr_110px_100px_90px_90px_90px_90px] px-5 py-3.5 border-b border-white/[0.04]">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16 ml-auto" />
              <Skeleton className="h-4 w-14 ml-auto" />
              <Skeleton className="h-4 w-14 ml-auto" />
              <Skeleton className="h-4 w-16 ml-auto" />
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>
          ))
        ) : filteredStocks.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500">
            No stocks match the current filters.
          </div>
        ) : (
          filteredStocks.map(({ ticker, name, sector, quote }) => {
            const isPos    = (quote?.dp ?? 0) >= 0
            const colour   = isPos ? 'text-accent-green' : 'text-accent-red'

            return (
              // Clicking a row navigates to the stock detail page
              <button
                key={ticker}
                onClick={() => navigate(`/stocks/${ticker}`)}
                className="w-full grid grid-cols-[80px_1fr_110px_100px_90px_90px_90px_90px] px-5 py-3.5
                           border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors text-left items-center"
              >
                {/* Ticker */}
                <span className="text-sm font-mono font-bold text-accent-purple">{ticker}</span>

                {/* Company name */}
                <span className="text-sm text-slate-300 truncate pr-4">{name}</span>

                {/* Sector badge */}
                <span className="text-xs text-slate-500 bg-elevated px-2 py-0.5 rounded-md border border-white/[0.05] w-fit">
                  {sector}
                </span>

                {/* Current price */}
                <span className="text-sm font-mono text-slate-100 text-right">
                  {quote?.c ? `$${quote.c.toFixed(2)}` : '—'}
                </span>

                {/* Dollar change */}
                <span className={`text-sm font-mono text-right ${colour}`}>
                  {quote?.d != null ? `${isPos ? '+' : ''}${quote.d.toFixed(2)}` : '—'}
                </span>

                {/* Percent change */}
                <span className={`text-sm font-mono font-semibold text-right ${colour}`}>
                  {quote?.dp != null ? `${isPos ? '+' : ''}${quote.dp.toFixed(2)}%` : '—'}
                </span>

                {/* Day high */}
                <span className="text-sm font-mono text-slate-400 text-right">
                  {quote?.h ? `$${quote.h.toFixed(2)}` : '—'}
                </span>

                {/* Day low */}
                <span className="text-sm font-mono text-slate-400 text-right">
                  {quote?.l ? `$${quote.l.toFixed(2)}` : '—'}
                </span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
