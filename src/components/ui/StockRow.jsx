// StockRow — a single stock in the "featured stocks" sidebar list
// Shows ticker, name, price and daily change

import { useNavigate } from 'react-router-dom'

export default function StockRow({ ticker, name, quote, loading }) {
  const navigate = useNavigate()
  const isPositive = quote?.dp > 0
  const isNegative = quote?.dp < 0

  const changeColour = isPositive
    ? 'text-accent-green'
    : isNegative
    ? 'text-accent-red'
    : 'text-slate-400'

  return (
    // Navigate to the stock's detail page on click
    <button
      onClick={() => navigate(`/stocks/${ticker}`)}
      className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.04] transition-colors rounded-lg"
    >
      {/* Left: ticker + name */}
      <div className="flex flex-col items-start gap-0.5">
        <span className="text-sm font-semibold text-slate-100">{ticker}</span>
        <span className="text-xs text-slate-500 max-w-[120px] truncate">{name}</span>
      </div>

      {/* Right: price + change */}
      <div className="flex flex-col items-end gap-0.5">
        {loading ? (
          <>
            <div className="h-4 w-14 bg-elevated rounded animate-pulse" />
            <div className="h-3 w-10 bg-elevated rounded animate-pulse mt-1" />
          </>
        ) : (
          <>
            <span className="text-sm font-semibold font-mono text-slate-100">
              ${quote?.c?.toFixed(2) ?? '—'}
            </span>
            <span className={`text-xs font-medium ${changeColour}`}>
              {isPositive ? '+' : ''}{quote?.dp?.toFixed(2) ?? '—'}%
            </span>
          </>
        )}
      </div>
    </button>
  )
}
