// CalendarPage — upcoming earnings reports and key economic events
import { useEffect, useState } from 'react'
import { CalendarDays, Clock, TrendingUp } from 'lucide-react'
import { getEarningsCalendar } from '../lib/finnhub'

// ── Hardcoded economic events for 2025–2026 ──
// Colour-coded by category: Fed = purple, CPI = yellow, GDP = blue, NFP = green
const ECONOMIC_EVENTS = [
  // Federal Reserve FOMC meetings
  { date: '2025-03-19', label: 'FOMC Rate Decision', type: 'Fed',  desc: 'Federal Reserve interest rate decision and press conference.' },
  { date: '2025-05-07', label: 'FOMC Rate Decision', type: 'Fed',  desc: 'Federal Reserve interest rate decision and press conference.' },
  { date: '2025-06-18', label: 'FOMC Rate Decision', type: 'Fed',  desc: 'Federal Reserve interest rate decision. SEP projections released.' },
  { date: '2025-07-30', label: 'FOMC Rate Decision', type: 'Fed',  desc: 'Federal Reserve interest rate decision and press conference.' },
  { date: '2025-09-17', label: 'FOMC Rate Decision', type: 'Fed',  desc: 'Federal Reserve interest rate decision. SEP projections released.' },
  { date: '2025-11-05', label: 'FOMC Rate Decision', type: 'Fed',  desc: 'Federal Reserve interest rate decision and press conference.' },
  { date: '2025-12-17', label: 'FOMC Rate Decision', type: 'Fed',  desc: 'Federal Reserve interest rate decision. SEP projections released.' },
  { date: '2026-01-28', label: 'FOMC Rate Decision', type: 'Fed',  desc: 'Federal Reserve interest rate decision and press conference.' },
  { date: '2026-03-18', label: 'FOMC Rate Decision', type: 'Fed',  desc: 'Federal Reserve interest rate decision. SEP projections released.' },
  { date: '2026-05-06', label: 'FOMC Rate Decision', type: 'Fed',  desc: 'Federal Reserve interest rate decision and press conference.' },
  { date: '2026-06-17', label: 'FOMC Rate Decision', type: 'Fed',  desc: 'Federal Reserve interest rate decision. SEP projections released.' },

  // CPI (Consumer Price Index) releases
  { date: '2025-03-12', label: 'CPI Report (Feb)',   type: 'CPI',  desc: 'Bureau of Labor Statistics releases February inflation data.' },
  { date: '2025-04-10', label: 'CPI Report (Mar)',   type: 'CPI',  desc: 'Bureau of Labor Statistics releases March inflation data.' },
  { date: '2025-05-13', label: 'CPI Report (Apr)',   type: 'CPI',  desc: 'Bureau of Labor Statistics releases April inflation data.' },
  { date: '2025-06-11', label: 'CPI Report (May)',   type: 'CPI',  desc: 'Bureau of Labor Statistics releases May inflation data.' },
  { date: '2025-07-11', label: 'CPI Report (Jun)',   type: 'CPI',  desc: 'Bureau of Labor Statistics releases June inflation data.' },
  { date: '2025-08-12', label: 'CPI Report (Jul)',   type: 'CPI',  desc: 'Bureau of Labor Statistics releases July inflation data.' },
  { date: '2025-09-10', label: 'CPI Report (Aug)',   type: 'CPI',  desc: 'Bureau of Labor Statistics releases August inflation data.' },
  { date: '2025-10-15', label: 'CPI Report (Sep)',   type: 'CPI',  desc: 'Bureau of Labor Statistics releases September inflation data.' },
  { date: '2025-11-12', label: 'CPI Report (Oct)',   type: 'CPI',  desc: 'Bureau of Labor Statistics releases October inflation data.' },
  { date: '2025-12-10', label: 'CPI Report (Nov)',   type: 'CPI',  desc: 'Bureau of Labor Statistics releases November inflation data.' },
  { date: '2026-01-14', label: 'CPI Report (Dec)',   type: 'CPI',  desc: 'Bureau of Labor Statistics releases December inflation data.' },
  { date: '2026-02-11', label: 'CPI Report (Jan)',   type: 'CPI',  desc: 'Bureau of Labor Statistics releases January inflation data.' },
  { date: '2026-03-11', label: 'CPI Report (Feb)',   type: 'CPI',  desc: 'Bureau of Labor Statistics releases February inflation data.' },

  // GDP (Gross Domestic Product) — quarterly releases
  { date: '2025-03-27', label: 'GDP Q4 2024 (3rd)',  type: 'GDP',  desc: 'Third and final estimate of Q4 2024 GDP growth.' },
  { date: '2025-04-30', label: 'GDP Q1 2025 (Adv)',  type: 'GDP',  desc: 'Advance estimate of Q1 2025 GDP.' },
  { date: '2025-07-30', label: 'GDP Q2 2025 (Adv)',  type: 'GDP',  desc: 'Advance estimate of Q2 2025 GDP.' },
  { date: '2025-10-29', label: 'GDP Q3 2025 (Adv)',  type: 'GDP',  desc: 'Advance estimate of Q3 2025 GDP.' },
  { date: '2026-01-28', label: 'GDP Q4 2025 (Adv)',  type: 'GDP',  desc: 'Advance estimate of Q4 2025 GDP.' },

  // NFP (Non-Farm Payrolls) — first Friday of each month
  { date: '2025-03-07', label: 'Jobs Report (Feb)',  type: 'NFP',  desc: 'February non-farm payrolls and unemployment rate.' },
  { date: '2025-04-04', label: 'Jobs Report (Mar)',  type: 'NFP',  desc: 'March non-farm payrolls and unemployment rate.' },
  { date: '2025-05-02', label: 'Jobs Report (Apr)',  type: 'NFP',  desc: 'April non-farm payrolls and unemployment rate.' },
  { date: '2025-06-06', label: 'Jobs Report (May)',  type: 'NFP',  desc: 'May non-farm payrolls and unemployment rate.' },
  { date: '2025-07-03', label: 'Jobs Report (Jun)',  type: 'NFP',  desc: 'June non-farm payrolls and unemployment rate.' },
  { date: '2025-08-01', label: 'Jobs Report (Jul)',  type: 'NFP',  desc: 'July non-farm payrolls and unemployment rate.' },
  { date: '2025-09-05', label: 'Jobs Report (Aug)',  type: 'NFP',  desc: 'August non-farm payrolls and unemployment rate.' },
  { date: '2025-10-03', label: 'Jobs Report (Sep)',  type: 'NFP',  desc: 'September non-farm payrolls and unemployment rate.' },
  { date: '2025-11-07', label: 'Jobs Report (Oct)',  type: 'NFP',  desc: 'October non-farm payrolls and unemployment rate.' },
  { date: '2025-12-05', label: 'Jobs Report (Nov)',  type: 'NFP',  desc: 'November non-farm payrolls and unemployment rate.' },
  { date: '2026-01-09', label: 'Jobs Report (Dec)',  type: 'NFP',  desc: 'December non-farm payrolls and unemployment rate.' },
  { date: '2026-02-06', label: 'Jobs Report (Jan)',  type: 'NFP',  desc: 'January non-farm payrolls and unemployment rate.' },
  { date: '2026-03-06', label: 'Jobs Report (Feb)',  type: 'NFP',  desc: 'February non-farm payrolls and unemployment rate.' },
]

// Colour configuration per event type
const EVENT_CONFIG = {
  Fed: {
    bg:     'bg-accent-purple/10',
    border: 'border-accent-purple/20',
    badge:  'bg-accent-purple/20 text-accent-purple',
    dot:    'bg-accent-purple',
  },
  CPI: {
    bg:     'bg-accent-yellow/10',
    border: 'border-accent-yellow/20',
    badge:  'bg-accent-yellow/20 text-accent-yellow',
    dot:    'bg-accent-yellow',
  },
  GDP: {
    bg:     'bg-accent-blue/10',
    border: 'border-accent-blue/20',
    badge:  'bg-accent-blue/20 text-accent-blue',
    dot:    'bg-accent-blue',
  },
  NFP: {
    bg:     'bg-accent-green/10',
    border: 'border-accent-green/20',
    badge:  'bg-accent-green/20 text-accent-green',
    dot:    'bg-accent-green',
  },
}

// Format a date string "YYYY-MM-DD" into something readable like "Wed, Mar 19, 2025"
function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')  // Noon to avoid timezone off-by-one
  return d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  })
}

// Group an array of items by a key function (returns object: key → items[])
function groupBy(items, keyFn) {
  const groups = {}
  for (const item of items) {
    const key = keyFn(item)
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
  }
  return groups
}

// Map Finnhub hourKey to human-readable label
function earningsTimeLabel(hourKey) {
  switch (hourKey) {
    case 'bmo': return 'Before Market'
    case 'amc': return 'After Market'
    case 'dmh': return 'During Market'
    default:    return 'Time TBD'
  }
}

// Skeleton placeholder
function Skeleton({ className }) {
  return <div className={`bg-elevated rounded animate-pulse ${className}`} />
}

export default function CalendarPage() {
  // Which tab is active: 'earnings' or 'economic'
  const [activeTab, setActiveTab] = useState('earnings')

  // Earnings data from Finnhub
  const [earnings, setEarnings] = useState([])
  const [loading,  setLoading]  = useState(true)

  // Today's date string (YYYY-MM-DD) for filtering past events
  const todayStr = new Date().toISOString().split('T')[0]

  useEffect(() => {
    // Only fetch earnings when the earnings tab is selected (or first load)
    async function fetchEarnings() {
      setLoading(true)
      try {
        const data = await getEarningsCalendar()
        setEarnings(data.earningsCalendar ?? [])
      } catch (err) {
        console.error('Earnings calendar fetch failed:', err)
        setEarnings([])
      } finally {
        setLoading(false)
      }
    }
    fetchEarnings()
  }, [])

  // Group earnings by date string
  const earningsByDate = groupBy(earnings, e => e.date)
  // Sort dates ascending
  const sortedEarningsDates = Object.keys(earningsByDate).sort()

  // Filter economic events to only show upcoming ones, sorted by date
  const upcomingEconomic = ECONOMIC_EVENTS
    .filter(ev => ev.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="flex flex-col gap-6">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Calendar</h1>
        <p className="text-sm text-slate-400 mt-0.5">Upcoming earnings and economic events</p>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-elevated rounded-lg p-1 w-fit">
        {[
          { key: 'earnings', label: 'Earnings', icon: TrendingUp },
          { key: 'economic', label: 'Economic Events', icon: CalendarDays },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
              ${activeTab === key
                ? 'bg-primary text-white'
                : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Earnings Tab ── */}
      {activeTab === 'earnings' && (
        <>
          {loading ? (
            // Skeleton loader for earnings
            <div className="flex flex-col gap-6">
              {[...Array(3)].map((_, gi) => (
                <div key={gi} className="flex flex-col gap-3">
                  <Skeleton className="h-5 w-40" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[...Array(3)].map((_, ci) => (
                      <Skeleton key={ci} className="h-20 rounded-xl" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : sortedEarningsDates.length === 0 ? (
            <div className="bg-surface rounded-xl border border-white/[0.08] p-16 flex flex-col items-center gap-3 text-center">
              <CalendarDays size={48} className="text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-300">No upcoming earnings</h2>
              <p className="text-sm text-slate-500">Check back soon for the next earnings cycle.</p>
            </div>
          ) : (
            // Earnings grouped by date
            <div className="flex flex-col gap-8">
              {sortedEarningsDates.map(date => (
                <div key={date} className="flex flex-col gap-3">
                  {/* Date header */}
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-semibold text-slate-300">{formatDate(date)}</h2>
                    <span className="text-xs text-slate-600">
                      {earningsByDate[date].length} compan{earningsByDate[date].length === 1 ? 'y' : 'ies'}
                    </span>
                  </div>

                  {/* Earnings cards for this date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {earningsByDate[date].map((e, i) => {
                      const timeLabel = earningsTimeLabel(e.hour)
                      return (
                        <div
                          key={`${e.symbol}-${i}`}
                          className="bg-surface rounded-xl border border-white/[0.08] p-4 flex flex-col gap-2"
                        >
                          {/* Ticker + time label */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-mono font-bold text-slate-100">
                              {e.symbol}
                            </span>
                            {/* Market timing badge */}
                            <span className={`text-xs px-2 py-0.5 rounded-full
                              ${e.hour === 'bmo'
                                ? 'bg-accent-blue/10 text-accent-blue'
                                : e.hour === 'amc'
                                ? 'bg-accent-purple/10 text-accent-purple'
                                : 'bg-elevated text-slate-400'
                              }`}
                            >
                              {timeLabel}
                            </span>
                          </div>

                          {/* EPS estimate — shown if available */}
                          {e.epsEstimate != null ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs text-slate-500">EPS Estimate</span>
                              <span className="text-sm font-mono text-slate-300">
                                {e.epsEstimate >= 0 ? '+' : ''}${e.epsEstimate?.toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-600">EPS estimate TBD</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Economic Events Tab ── */}
      {activeTab === 'economic' && (
        <div className="flex flex-col gap-3">
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mb-2">
            {Object.entries(EVENT_CONFIG).map(([type, cfg]) => (
              <div key={type} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                <span className="text-xs text-slate-400">
                  {type === 'Fed' ? 'FOMC / Fed' :
                   type === 'CPI' ? 'Inflation (CPI)' :
                   type === 'GDP' ? 'GDP Release' :
                   'Jobs (NFP)'}
                </span>
              </div>
            ))}
          </div>

          {upcomingEconomic.length === 0 ? (
            <div className="bg-surface rounded-xl border border-white/[0.08] p-12 text-center">
              <p className="text-sm text-slate-500">No upcoming economic events found.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {upcomingEconomic.map((ev, i) => {
                const cfg = EVENT_CONFIG[ev.type] ?? EVENT_CONFIG.Fed
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-4 px-5 py-4 rounded-xl border ${cfg.bg} ${cfg.border}`}
                  >
                    {/* Date */}
                    <div className="flex flex-col gap-0.5 w-28 shrink-0">
                      <span className="text-xs font-semibold text-slate-200">
                        {formatDate(ev.date)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock size={10} />
                        All Day
                      </span>
                    </div>

                    {/* Event type badge */}
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${cfg.badge}`}>
                      {ev.type}
                    </span>

                    {/* Event name + description */}
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-semibold text-slate-100">{ev.label}</span>
                      <span className="text-xs text-slate-400 truncate">{ev.desc}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
