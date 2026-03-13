// StockPage — chart, price, company info and news for a single ticker
import { useParams } from 'react-router-dom'

export default function StockPage() {
  // Get the ticker symbol from the URL (e.g. /stocks/AAPL → ticker = "AAPL")
  const { ticker } = useParams()

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-100 mb-1">{ticker}</h1>
      <p className="text-sm text-slate-400 mb-6">Stock detail</p>
      <div className="bg-surface rounded-xl border border-white/[0.08] p-8 text-center text-slate-400">
        Coming soon — chart, price, company info
      </div>
    </div>
  )
}
