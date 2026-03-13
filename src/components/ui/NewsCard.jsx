// NewsCard — a single news story row with headline, source and time
// Used in the dashboard news feed and newsroom page

export default function NewsCard({ article }) {
  // Convert Unix timestamp to a readable relative time (e.g. "2h ago")
  function timeAgo(timestamp) {
    const seconds = Math.floor(Date.now() / 1000 - timestamp)
    if (seconds < 60)   return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  return (
    // Opens the full article in a new tab on click
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-4 p-4 rounded-xl hover:bg-white/[0.03] transition-colors group"
    >
      {/* Thumbnail — only shown if the article has an image */}
      {article.image && (
        <img
          src={article.image}
          alt=""
          className="w-16 h-16 rounded-lg object-cover shrink-0 bg-elevated"
          onError={e => e.target.style.display = 'none'} // hide if image fails to load
        />
      )}

      {/* Text content */}
      <div className="flex flex-col gap-1 min-w-0">
        <p className="text-sm font-medium text-slate-200 leading-snug line-clamp-2 group-hover:text-white transition-colors">
          {article.headline}
        </p>
        <div className="flex items-center gap-2 mt-auto">
          <span className="text-xs text-slate-500">{article.source}</span>
          <span className="text-slate-700">·</span>
          <span className="text-xs text-slate-500">{timeAgo(article.datetime)}</span>
        </div>
      </div>

    </a>
  )
}
