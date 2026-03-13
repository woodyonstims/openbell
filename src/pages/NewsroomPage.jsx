// NewsroomPage — sector-specific and general market news feed
import { useEffect, useState } from 'react'
import { getMarketNews, getCompanyNews } from '../lib/finnhub'
import { ExternalLink } from 'lucide-react'

// Tab definitions — each tab either fetches a Finnhub news category
// or company news for a sector ETF (used as a proxy for sector news)
const CATEGORIES = [
  { label: 'All Markets', type: 'market',  value: 'general' },
  { label: 'Technology',  type: 'sector',  value: 'XLK'     },
  { label: 'Finance',     type: 'sector',  value: 'XLF'     },
  { label: 'Energy',      type: 'sector',  value: 'XLE'     },
  { label: 'Healthcare',  type: 'sector',  value: 'XLV'     },
  { label: 'Crypto',      type: 'market',  value: 'crypto'  },
  { label: 'M&A',         type: 'market',  value: 'merger'  },
]

// Convert Unix timestamp to readable relative time (e.g. "2h ago")
function timeAgo(timestamp) {
  const seconds = Math.floor(Date.now() / 1000 - timestamp)
  if (seconds < 60)    return `${seconds}s ago`
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export default function NewsroomPage() {
  const [activeTab, setActiveTab] = useState(CATEGORIES[0])
  const [articles,  setArticles]  = useState([])
  const [loading,   setLoading]   = useState(true)

  // Refetch news whenever the user switches tabs
  useEffect(() => {
    async function fetchNews() {
      setLoading(true)
      setArticles([])
      try {
        let data
        if (activeTab.type === 'market') {
          // General Finnhub news categories (general, crypto, merger)
          data = await getMarketNews(activeTab.value)
        } else {
          // Sector ETF company news — used as a proxy for sector headlines
          data = await getCompanyNews(activeTab.value)
        }
        // Filter out articles with no headline, deduplicate by id
        const seen = new Set()
        const clean = data.filter(a => {
          if (!a.headline || seen.has(a.id)) return false
          seen.add(a.id)
          return true
        })
        setArticles(clean.slice(0, 20)) // cap at 20 articles
      } catch (err) {
        console.error('News fetch failed:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchNews()
  }, [activeTab]) // re-run whenever activeTab changes

  // First article becomes the hero — the rest go in the grid
  const hero = articles[0] ?? null
  const rest  = articles.slice(1)

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Newsroom</h1>
        <p className="text-sm text-slate-400 mt-0.5">Stay informed across markets and sectors</p>
      </div>

      {/* ── Category tabs ── */}
      <div className="flex gap-1 border-b border-white/[0.08] overflow-x-auto pb-px">
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setActiveTab(cat)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px
              ${activeTab.value === cat.value
                ? 'text-slate-100 border-primary'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:border-white/20'
              }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="flex flex-col gap-4">
          {/* Hero skeleton */}
          <div className="w-full h-64 bg-surface rounded-2xl animate-pulse" />
          {/* Grid skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-surface rounded-xl p-4 flex flex-col gap-3 animate-pulse">
                <div className="w-full h-36 bg-elevated rounded-lg" />
                <div className="h-4 bg-elevated rounded w-full" />
                <div className="h-4 bg-elevated rounded w-3/4" />
                <div className="h-3 bg-elevated rounded w-1/3" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Content ── */}
      {!loading && articles.length === 0 && (
        <div className="bg-surface rounded-xl border border-white/[0.08] p-12 text-center text-slate-500">
          No articles found for this category.
        </div>
      )}

      {!loading && hero && (
        <div className="flex flex-col gap-6">

          {/* ── Hero article — full-width featured story ── */}
          <a
            href={hero.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative bg-surface rounded-2xl border border-white/[0.08] overflow-hidden flex flex-col lg:flex-row hover:border-white/20 transition-colors"
          >
            {/* Hero image */}
            {hero.image && (
              <div className="lg:w-1/2 h-56 lg:h-auto overflow-hidden bg-elevated shrink-0">
                <img
                  src={hero.image}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                  onError={e => e.target.parentElement.style.display = 'none'}
                />
              </div>
            )}

            {/* Hero text */}
            <div className="flex flex-col justify-between p-6 lg:p-8 gap-4">
              {/* Top label */}
              <span className="inline-flex self-start px-2.5 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary-light border border-primary/20">
                Top Story
              </span>

              {/* Headline */}
              <h2 className="text-xl lg:text-2xl font-bold text-slate-100 leading-snug group-hover:text-white transition-colors">
                {hero.headline}
              </h2>

              {/* Summary — truncated to 3 lines */}
              {hero.summary && (
                <p className="text-sm text-slate-400 line-clamp-3 leading-relaxed">
                  {hero.summary}
                </p>
              )}

              {/* Meta row */}
              <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-400">{hero.source}</span>
                  <span>·</span>
                  <span>{timeAgo(hero.datetime)}</span>
                </div>
                <ExternalLink size={14} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
              </div>
            </div>
          </a>

          {/* ── Article grid — remaining stories ── */}
          {rest.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rest.map(article => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  )
}

// ── ArticleCard — individual story card in the grid ──
// Kept in this file as it's only used here
function ArticleCard({ article }) {
  function timeAgo(timestamp) {
    const seconds = Math.floor(Date.now() / 1000 - timestamp)
    if (seconds < 60)    return `${seconds}s ago`
    if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-surface rounded-xl border border-white/[0.08] overflow-hidden flex flex-col hover:border-white/20 transition-colors"
    >
      {/* Article image */}
      {article.image && (
        <div className="h-40 overflow-hidden bg-elevated">
          <img
            src={article.image}
            alt=""
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            onError={e => e.target.parentElement.style.display = 'none'}
          />
        </div>
      )}

      {/* Article text */}
      <div className="flex flex-col gap-2 p-4 flex-1">
        <p className="text-sm font-semibold text-slate-200 leading-snug line-clamp-3 group-hover:text-white transition-colors">
          {article.headline}
        </p>
        <div className="flex items-center gap-2 mt-auto pt-2 text-xs text-slate-500">
          <span className="font-medium text-slate-400">{article.source}</span>
          <span>·</span>
          <span>{timeAgo(article.datetime)}</span>
        </div>
      </div>
    </a>
  )
}
