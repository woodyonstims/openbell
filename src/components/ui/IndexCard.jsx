// IndexCard — displays a single market index with price and % change
// Used in the dashboard indices row

export default function IndexCard({ label, ticker, quote, loading }) {
  // Determine if the day's change is positive, negative, or flat
  const isPositive = quote?.dp > 0
  const isNegative = quote?.dp < 0

  const changeColour = isPositive
    ? 'text-accent-green'
    : isNegative
    ? 'text-accent-red'
    : 'text-slate-400'

  const bgColour = isPositive
    ? 'bg-green-500/10'
    : isNegative
    ? 'bg-red-500/10'
    : 'bg-white/[0.04]'

  return (
    <div className="bg-surface rounded-xl border border-white/[0.08] p-4 flex flex-col gap-2">

      {/* Label and ticker */}
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-[11px] text-slate-600 mt-0.5">{ticker}</p>
      </div>

      {/* Price — skeleton while loading */}
      {loading ? (
        <div className="h-8 w-24 bg-elevated rounded animate-pulse" />
      ) : (
        <p className="text-2xl font-extrabold text-slate-100 font-mono">
          ${quote?.c?.toFixed(2) ?? '—'}
        </p>
      )}

      {/* Change badge */}
      {loading ? (
        <div className="h-5 w-16 bg-elevated rounded-full animate-pulse" />
      ) : (
        <span className={`inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-full text-xs font-medium ${bgColour} ${changeColour}`}>
          {/* Arrow indicator */}
          {isPositive ? '▲' : isNegative ? '▼' : '—'}
          {quote?.dp != null ? `${Math.abs(quote.dp).toFixed(2)}%` : '—'}
        </span>
      )}

    </div>
  )
}
