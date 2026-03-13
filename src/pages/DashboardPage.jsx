// DashboardPage — market overview with indices, news and featured stocks
import { useEffect, useState } from 'react'
import { getQuote, getMarketNews, getMarketStatus } from '../lib/finnhub'
import IndexCard from '../components/ui/IndexCard'
import NewsCard  from '../components/ui/NewsCard'
import StockRow  from '../components/ui/StockRow'

// The four main US market indices, represented by their ETF proxies
const INDICES = [
  { label: 'S&P 500',     ticker: 'SPY'  },
  { label: 'NASDAQ 100',  ticker: 'QQQ'  },
  { label: 'Dow Jones',   ticker: 'DIA'  },
  { label: 'Russell 2000', ticker: 'IWM' },
]

// Featured stocks shown in the sidebar — popular tickers traders watch
const FEATURED = [
  { ticker: 'AAPL',  name: 'Apple Inc.' },
  { ticker: 'NVDA',  name: 'NVIDIA Corp.' },
  { ticker: 'TSLA',  name: 'Tesla Inc.' },
  { ticker: 'MSFT',  name: 'Microsoft Corp.' },
  { ticker: 'META',  name: 'Meta Platforms' },
  { ticker: 'AMZN',  name: 'Amazon.com' },
  { ticker: 'GOOGL', name: 'Alphabet Inc.' },
]

export default function DashboardPage() {
  const [indexQuotes,   setIndexQuotes]   = useState({})
  const [featuredQuotes, setFeaturedQuotes] = useState({})
  const [news,          setNews]          = useState([])
  const [marketStatus,  setMarketStatus]  = useState(null)
  const [loadingIndex,  setLoadingIndex]  = useState(true)
  const [loadingStocks, setLoadingStocks] = useState(true)
  const [loadingNews,   setLoadingNews]   = useState(true)

  useEffect(() => {
    // Fetch all index quotes in parallel
    async function fetchIndices() {
      const results = await Promise.allSettled(
        INDICES.map(i => getQuote(i.ticker))
      )
      const quotes = {}
      INDICES.forEach((idx, i) => {
        // allSettled means one failure won't break the rest
        if (results[i].status === 'fulfilled') {
          quotes[idx.ticker] = results[i].value
        }
      })
      setIndexQuotes(quotes)
      setLoadingIndex(false)
    }

    // Fetch all featured stock quotes in parallel
    async function fetchFeatured() {
      const results = await Promise.allSettled(
        FEATURED.map(s => getQuote(s.ticker))
      )
      const quotes = {}
      FEATURED.forEach((stock, i) => {
        if (results[i].status === 'fulfilled') {
          quotes[stock.ticker] = results[i].value
        }
      })
      setFeaturedQuotes(quotes)
      setLoadingStocks(false)
    }

    // Fetch general market news — take first 10 stories
    async function fetchNews() {
      try {
        const data = await getMarketNews('general')
        setNews(data.slice(0, 10))
      } catch (err) {
        console.error('News fetch failed:', err)
      } finally {
        setLoadingNews(false)
      }
    }

    // Fetch US market open/closed status
    async function fetchMarketStatus() {
      try {
        const status = await getMarketStatus()
        setMarketStatus(status)
      } catch (err) {
        console.error('Market status fetch failed:', err)
      }
    }

    // Run all fetches at the same time — no need to wait for each other
    fetchIndices()
    fetchFeatured()
    fetchNews()
    fetchMarketStatus()
  }, []) // Empty array = run once when the page loads

  // Greeting based on time of day
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  // Format today's date nicely (e.g. "Friday, 13 March 2026")
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{greeting}</h1>
          <p className="text-sm text-slate-400 mt-0.5">{today}</p>
        </div>

        {/* Market open/closed badge */}
        {marketStatus && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border
            ${marketStatus.isOpen
              ? 'bg-green-500/10 border-green-500/20 text-accent-green'
              : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
            }`}
          >
            {/* Pulsing dot — green when open, grey when closed */}
            <span className={`w-1.5 h-1.5 rounded-full ${marketStatus.isOpen ? 'bg-accent-green animate-pulse' : 'bg-slate-500'}`} />
            {marketStatus.isOpen ? 'Market Open' : 'Market Closed'}
          </div>
        )}
      </div>

      {/* ── Indices row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {INDICES.map(idx => (
          <IndexCard
            key={idx.ticker}
            label={idx.label}
            ticker={idx.ticker}
            quote={indexQuotes[idx.ticker]}
            loading={loadingIndex}
          />
        ))}
      </div>

      {/* ── Main content: news + featured stocks ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* News feed — takes up 2/3 of the width on large screens */}
        <div className="lg:col-span-2 bg-surface rounded-xl border border-white/[0.08] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.08]">
            <h2 className="text-sm font-semibold text-slate-200">Market News</h2>
          </div>

          {loadingNews ? (
            // Skeleton loader — shows while news is fetching
            <div className="flex flex-col gap-1 p-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4 p-4">
                  <div className="w-16 h-16 rounded-lg bg-elevated animate-pulse shrink-0" />
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="h-4 bg-elevated rounded animate-pulse" />
                    <div className="h-4 bg-elevated rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-elevated rounded animate-pulse w-1/4 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          ) : news.length > 0 ? (
            <div className="divide-y divide-white/[0.04]">
              {news.map(article => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <p className="p-8 text-center text-sm text-slate-500">No news available</p>
          )}
        </div>

        {/* Featured stocks sidebar — 1/3 width */}
        <div className="bg-surface rounded-xl border border-white/[0.08] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.08]">
            <h2 className="text-sm font-semibold text-slate-200">Featured Stocks</h2>
          </div>
          <div className="flex flex-col p-2">
            {FEATURED.map(stock => (
              <StockRow
                key={stock.ticker}
                ticker={stock.ticker}
                name={stock.name}
                quote={featuredQuotes[stock.ticker]}
                loading={loadingStocks}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
