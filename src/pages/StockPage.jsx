// StockPage — full detail view for a single stock ticker
// URL param: /stocks/:ticker
import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import { ExternalLink, Plus, Check, Building2, Users, TrendingUp } from 'lucide-react'
import { getQuote, getCompanyProfile, getCandles, getCompanyNews } from '../lib/finnhub'
import { supabase } from '../lib/supabase'
import NewsCard from '../components/ui/NewsCard'

// Time range tab definitions — each maps to a Finnhub resolution + day count
const RANGES = [
  { label: '1W', resolution: '60', days: 7   },
  { label: '1M', resolution: 'D',  days: 30  },
  { label: '3M', resolution: 'D',  days: 90  },
  { label: '6M', resolution: 'D',  days: 180 },
  { label: '1Y', resolution: 'D',  days: 365 },
]

// Format large numbers into readable strings (e.g. 2400000000 → "$2.40B")
function formatMarketCap(num) {
  if (!num) return '—'
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`
  if (num >= 1e9)  return `$${(num / 1e9).toFixed(2)}B`
  if (num >= 1e6)  return `$${(num / 1e6).toFixed(2)}M`
  return `$${num.toLocaleString()}`
}

// Custom tooltip shown when hovering the chart
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-elevated border border-white/[0.08] rounded-lg px-3 py-2 text-xs">
      <p className="text-slate-400 mb-0.5">{label}</p>
      <p className="text-slate-100 font-mono font-semibold">
        ${payload[0].value?.toFixed(2)}
      </p>
    </div>
  )
}

// Skeleton block — pulsing placeholder while content loads
function Skeleton({ className }) {
  return <div className={`bg-elevated rounded animate-pulse ${className}`} />
}

export default function StockPage() {
  const { ticker } = useParams()     // Pull ticker from URL (e.g. "AAPL")
  const navigate   = useNavigate()

  // Core data states
  const [quote,   setQuote]   = useState(null)
  const [profile, setProfile] = useState(null)
  const [news,    setNews]    = useState([])
  const [candles, setCandles] = useState([])

  // UI states
  const [loading,          setLoading]          = useState(true)
  const [chartLoading,     setChartLoading]     = useState(true)
  const [activeRange,      setActiveRange]      = useState('3M')
  const [inWatchlist,      setInWatchlist]      = useState(false)
  const [watchlistLoading, setWatchlistLoading] = useState(false)
  const [notFound,         setNotFound]         = useState(false)
  const [user,             setUser]             = useState(null)

  // Get the current user session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
  }, [])

  // Fetch quote + profile + news when ticker changes
  useEffect(() => {
    if (!ticker) return
    setLoading(true)
    setNotFound(false)

    async function fetchCoreData() {
      // Run all three in parallel — one failure won't block others
      const [quoteRes, profileRes, newsRes] = await Promise.allSettled([
        getQuote(ticker),
        getCompanyProfile(ticker),
        getCompanyNews(ticker),
      ])

      const q = quoteRes.status   === 'fulfilled' ? quoteRes.value   : null
      const p = profileRes.status === 'fulfilled' ? profileRes.value : null
      const n = newsRes.status    === 'fulfilled' ? newsRes.value     : []

      // A quote with c === 0 means the ticker wasn't found by Finnhub
      if (!q || q.c === 0) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setQuote(q)
      setProfile(p)
      setNews(n.slice(0, 8))   // Show last 8 articles
      setLoading(false)
    }

    fetchCoreData()
  }, [ticker])

  // Fetch candle (OHLCV) data when ticker or active range changes
  const fetchCandles = useCallback(async (range) => {
    if (!ticker) return
    setChartLoading(true)
    const r = RANGES.find(x => x.label === range) ?? RANGES[2]
    try {
      const data = await getCandles(ticker, r.resolution, r.days)
      if (data.s === 'ok' && data.c?.length) {
        // Zip timestamps + close prices into chart-friendly objects
        const points = data.t.map((ts, i) => ({
          date: new Date(ts * 1000).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric',
            ...(r.days > 90 ? { year: '2-digit' } : {})
          }),
          price: data.c[i],
        }))
        setCandles(points)
      } else {
        setCandles([])
      }
    } catch {
      setCandles([])
    } finally {
      setChartLoading(false)
    }
  }, [ticker])

  useEffect(() => {
    fetchCandles(activeRange)
  }, [activeRange, fetchCandles])

  // Check if this ticker is already in the user's watchlist
  useEffect(() => {
    if (!user || !ticker) return
    supabase
      .from('watchlist')
      .select('id')
      .eq('user_id', user.id)
      .eq('ticker', ticker.toUpperCase())
      .maybeSingle()
      .then(({ data }) => setInWatchlist(!!data))
  }, [user, ticker])

  // Toggle watchlist — add or remove from Supabase
  async function toggleWatchlist() {
    if (!user) return
    setWatchlistLoading(true)
    if (inWatchlist) {
      await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', user.id)
        .eq('ticker', ticker.toUpperCase())
      setInWatchlist(false)
    } else {
      await supabase
        .from('watchlist')
        .insert({ user_id: user.id, ticker: ticker.toUpperCase() })
      setInWatchlist(true)
    }
    setWatchlistLoading(false)
  }

  // Price change colour — green positive, red negative
  const isPositive   = (quote?.d ?? 0) >= 0
  const changeColour = isPositive ? 'text-accent-green' : 'text-accent-red'

  // Ticker not found state
  if (notFound) return (
    <div className="flex flex-col items-center justify-center gap-4 mt-24 text-center">
      <TrendingUp size={48} className="text-slate-600" />
      <h2 className="text-xl font-semibold text-slate-200">Ticker not found</h2>
      <p className="text-sm text-slate-500">
        &ldquo;{ticker}&rdquo; doesn&apos;t match any known stock symbol.
      </p>
      <button
        onClick={() => navigate('/screener')}
        className="bg-primary hover:bg-primary-light text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        Browse Screener
      </button>
    </div>
  )

  return (
    <div className="flex flex-col gap-6 max-w-5xl">

      {/* ── Header: logo + name + ticker + watchlist button ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">

          {/* Company logo — skeleton while loading */}
          {loading ? (
            <Skeleton className="w-14 h-14 rounded-xl" />
          ) : profile?.logo ? (
            <img
              src={profile.logo}
              alt={profile.name}
              className="w-14 h-14 rounded-xl bg-elevated object-contain p-1"
              onError={e => { e.target.style.display = 'none' }}
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-elevated flex items-center justify-center">
              <Building2 size={24} className="text-slate-500" />
            </div>
          )}

          <div className="flex flex-col gap-1">
            {loading ? (
              <>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32 mt-1" />
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-slate-100">
                  {profile?.name ?? ticker}
                </h1>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Ticker badge */}
                  <span className="text-xs font-mono font-semibold text-accent-purple bg-accent-purple/10 px-2 py-0.5 rounded-md">
                    {ticker?.toUpperCase()}
                  </span>
                  {/* Sector badge */}
                  {profile?.finnhubIndustry && (
                    <span className="text-xs text-slate-400 bg-elevated px-2 py-0.5 rounded-md border border-white/[0.06]">
                      {profile.finnhubIndustry}
                    </span>
                  )}
                  {/* Exchange */}
                  {profile?.exchange && (
                    <span className="text-xs text-slate-500">{profile.exchange}</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Add/remove watchlist button */}
        <button
          onClick={toggleWatchlist}
          disabled={watchlistLoading || loading}
          className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors
            ${inWatchlist
              ? 'bg-primary/20 text-accent-purple border border-primary/30 hover:bg-primary/30'
              : 'bg-primary hover:bg-primary-light text-white'
            } disabled:opacity-50`}
        >
          {inWatchlist ? <Check size={15} /> : <Plus size={15} />}
          {inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
        </button>
      </div>

      {/* ── Price block ── */}
      <div className="bg-surface rounded-xl border border-white/[0.08] p-5">
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-5 w-32" />
            <div className="flex gap-6 mt-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-4 w-24" />)}
            </div>
          </div>
        ) : (
          <>
            {/* Large current price */}
            <div className="flex items-end gap-3 flex-wrap">
              <span className="text-4xl font-mono font-bold text-slate-100">
                ${quote?.c?.toFixed(2) ?? '—'}
              </span>
              <div className={`flex items-center gap-1.5 text-lg font-semibold ${changeColour} mb-0.5`}>
                <span>{isPositive ? '+' : ''}{quote?.d?.toFixed(2)}</span>
                <span>({isPositive ? '+' : ''}{quote?.dp?.toFixed(2)}%)</span>
              </div>
            </div>

            {/* OHLC stats row */}
            <div className="flex flex-wrap gap-6 mt-4">
              {[
                { label: 'Prev Close', value: quote?.pc },
                { label: 'Open',       value: quote?.o  },
                { label: 'High',       value: quote?.h  },
                { label: 'Low',        value: quote?.l  },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className="text-sm font-mono font-semibold text-slate-200">
                    ${value?.toFixed(2) ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Price chart ── */}
      <div className="bg-surface rounded-xl border border-white/[0.08] p-5">
        {/* Time range tabs */}
        <div className="flex items-center gap-1 mb-5">
          {RANGES.map(r => (
            <button
              key={r.label}
              onClick={() => setActiveRange(r.label)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                ${activeRange === r.label
                  ? 'bg-primary text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Chart or loading skeleton */}
        {chartLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : candles.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-slate-500">
            No chart data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={candles} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              {/* Purple gradient fill under the area line */}
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}   />
                </linearGradient>
              </defs>

              {/* Subtle dark grid lines */}
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />

              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `$${v.toFixed(0)}`}
                width={55}
              />

              <Tooltip content={<ChartTooltip />} />

              <Area
                type="monotone"
                dataKey="price"
                stroke="#7c3aed"
                strokeWidth={2}
                fill="url(#priceGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#7c3aed', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Bottom row: company info + news ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Company info card (1/3 width) */}
        <div className="bg-surface rounded-xl border border-white/[0.08] p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-slate-200">About</h2>

          {loading ? (
            <div className="flex flex-col gap-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Website link */}
              {profile?.weburl && (
                <a
                  href={profile.weburl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-accent-blue hover:text-blue-300 transition-colors"
                >
                  <ExternalLink size={12} />
                  {profile.weburl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              )}

              {/* Employee count */}
              {profile?.employeeTotal && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Users size={12} className="text-slate-500" />
                  {Number(profile.employeeTotal).toLocaleString()} employees
                </div>
              )}

              {/* Market cap */}
              {profile?.marketCapitalization && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-slate-500">Market Cap</span>
                  {/* Finnhub returns marketCap in millions, so multiply by 1M */}
                  <span className="text-sm font-mono text-slate-200">
                    {formatMarketCap(profile.marketCapitalization * 1e6)}
                  </span>
                </div>
              )}

              {/* IPO date */}
              {profile?.ipo && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-slate-500">IPO Date</span>
                  <span className="text-sm text-slate-200">{profile.ipo}</span>
                </div>
              )}

              {/* Country */}
              {profile?.country && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-slate-500">Country</span>
                  <span className="text-sm text-slate-200">{profile.country}</span>
                </div>
              )}

              {/* Fallback if profile has no extra info */}
              {!profile?.weburl && !profile?.marketCapitalization && (
                <p className="text-xs text-slate-500">No company info available.</p>
              )}
            </div>
          )}
        </div>

        {/* Company news (2/3 width) */}
        <div className="lg:col-span-2 bg-surface rounded-xl border border-white/[0.08] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.08]">
            <h2 className="text-sm font-semibold text-slate-200">Latest News</h2>
          </div>

          {loading ? (
            // Skeleton news rows while fetching
            <div className="flex flex-col gap-1 p-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-4 p-4">
                  <Skeleton className="w-16 h-16 rounded-lg shrink-0" />
                  <div className="flex flex-col gap-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/4 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          ) : news.length > 0 ? (
            <div className="divide-y divide-white/[0.04]">
              {news.map((article, i) => (
                <NewsCard key={article.id ?? i} article={article} />
              ))}
            </div>
          ) : (
            <p className="p-8 text-center text-sm text-slate-500">
              No recent news for {ticker?.toUpperCase()}
            </p>
          )}
        </div>

      </div>
    </div>
  )
}
