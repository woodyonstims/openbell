// CommunityPage — community discussion feed with real-time updates
// Uses Supabase for posts + likes and real-time subscriptions
import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Send, TrendingUp, Hash } from 'lucide-react'
import { supabase } from '../lib/supabase'

// Top 10 trending tickers shown in the sidebar
const TRENDING_TICKERS = [
  { ticker: 'NVDA',  name: 'NVIDIA Corp.'       },
  { ticker: 'AAPL',  name: 'Apple Inc.'          },
  { ticker: 'TSLA',  name: 'Tesla Inc.'          },
  { ticker: 'META',  name: 'Meta Platforms'      },
  { ticker: 'MSFT',  name: 'Microsoft Corp.'     },
  { ticker: 'AMZN',  name: 'Amazon.com'          },
  { ticker: 'GOOGL', name: 'Alphabet Inc.'       },
  { ticker: 'PLTR',  name: 'Palantir Tech.'      },
  { ticker: 'AMD',   name: 'Advanced Micro'      },
  { ticker: 'COIN',  name: 'Coinbase Global'     },
]

// Format a timestamp to a relative time string (e.g. "2h ago")
function timeAgo(ts) {
  const seconds = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (seconds < 60)    return `${seconds}s ago`
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

// Extract the username portion from an email (part before @)
function usernameFromEmail(email) {
  return email?.split('@')[0] ?? 'user'
}

export default function CommunityPage() {
  const navigate = useNavigate()

  // Current logged-in user
  const [user, setUser] = useState(null)

  // Posts array — each post includes a nested likes array
  const [posts,   setPosts]   = useState([])
  const [loading, setLoading] = useState(true)

  // New post form state
  const [content,    setContent]    = useState('')
  const [tickerTag,  setTickerTag]  = useState('')
  const [posting,    setPosting]    = useState(false)
  const [postError,  setPostError]  = useState('')

  // Tracks which posts this user has liked (set of post_ids)
  const [myLikes, setMyLikes] = useState(new Set())

  // Ref used to auto-scroll to top of feed on new post
  const feedTopRef = useRef(null)

  // Get user session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
  }, [])

  // Load posts and subscribe to real-time updates
  useEffect(() => {
    fetchPosts()

    // Real-time subscription — any INSERT/DELETE on posts triggers a refresh
    const channel = supabase
      .channel('public:posts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        () => fetchPosts()   // Re-fetch on any change
      )
      .subscribe()

    // Clean up channel when component unmounts
    return () => { supabase.removeChannel(channel) }
  }, [])

  // Load user's own likes once user is known
  useEffect(() => {
    if (!user) return
    supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        setMyLikes(new Set((data ?? []).map(l => l.post_id)))
      })
  }, [user])

  // Fetch the 50 most recent posts with their like counts
  async function fetchPosts() {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id,
        content,
        ticker,
        created_at,
        user_id,
        post_likes (count)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Posts fetch error:', error)
      setLoading(false)
      return
    }

    // Also fetch user emails to display as usernames
    // We join against auth.users which isn't directly accessible,
    // so we use a Supabase edge function workaround — fall back to user_id prefix
    setPosts(data ?? [])
    setLoading(false)
  }

  // Submit a new post
  async function handlePost(e) {
    e.preventDefault()
    if (!user || !content.trim()) return
    setPostError('')
    setPosting(true)

    const { error } = await supabase.from('posts').insert({
      user_id:   user.id,
      content:   content.trim(),
      ticker:    tickerTag.trim().toUpperCase() || null,
    })

    if (error) {
      setPostError('Failed to post. Please try again.')
    } else {
      setContent('')
      setTickerTag('')
      // Refresh feed — real-time subscription will also pick this up
      await fetchPosts()
      // Scroll to top of feed
      feedTopRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    setPosting(false)
  }

  // Toggle like on a post — optimistic UI update
  async function toggleLike(postId) {
    if (!user) return
    const isLiked = myLikes.has(postId)

    // Optimistically update local state for instant feedback
    setMyLikes(prev => {
      const next = new Set(prev)
      isLiked ? next.delete(postId) : next.add(postId)
      return next
    })
    // Update local post like count immediately
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      const currentCount = p.post_likes?.[0]?.count ?? 0
      return {
        ...p,
        post_likes: [{ count: isLiked ? currentCount - 1 : currentCount + 1 }],
      }
    }))

    // Sync with Supabase
    if (isLiked) {
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)
    } else {
      await supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: user.id })
    }
  }

  // Delete own post
  async function deletePost(postId) {
    await supabase.from('posts').delete().eq('id', postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Community</h1>
        <p className="text-sm text-slate-400 mt-0.5">Discuss markets and share insights</p>
      </div>

      {/* ── Main layout: feed (left) + sidebar (right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Post feed — 2/3 width ── */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* New post composer */}
          <div className="bg-surface rounded-xl border border-white/[0.08] p-4">
            <form onSubmit={handlePost} className="flex flex-col gap-3">
              {/* Content textarea */}
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="What's on your mind? Share a market insight or analysis…"
                rows={3}
                maxLength={500}
                className="w-full bg-elevated border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm
                           text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary
                           focus:ring-1 focus:ring-primary transition-colors resize-none"
              />

              {/* Bottom row: ticker tag + char count + post button */}
              <div className="flex items-center gap-3">
                {/* Optional ticker tag input */}
                <div className="relative">
                  <Hash size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Ticker (optional)"
                    value={tickerTag}
                    onChange={e => setTickerTag(e.target.value.toUpperCase().slice(0, 5))}
                    className="bg-elevated border border-white/[0.08] rounded-lg pl-7 pr-3 py-2 text-sm
                               text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary
                               focus:ring-1 focus:ring-primary transition-colors w-36"
                  />
                </div>

                {/* Character count */}
                <span className="text-xs text-slate-600 ml-auto">{content.length}/500</span>

                {/* Post button */}
                <button
                  type="submit"
                  disabled={!content.trim() || posting}
                  className="flex items-center gap-2 bg-primary hover:bg-primary-light text-white text-sm
                             font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Send size={13} />
                  {posting ? 'Posting…' : 'Post'}
                </button>
              </div>

              {/* Error message */}
              {postError && <p className="text-xs text-accent-red">{postError}</p>}
            </form>
          </div>

          {/* Feed top ref — used for scroll-to-top after new post */}
          <div ref={feedTopRef} />

          {/* Posts */}
          {loading ? (
            // Skeleton loader
            [...Array(4)].map((_, i) => (
              <div key={i} className="bg-surface rounded-xl border border-white/[0.08] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-elevated animate-pulse" />
                  <div className="h-3 w-24 bg-elevated rounded animate-pulse" />
                </div>
                <div className="h-4 w-full bg-elevated rounded animate-pulse mb-2" />
                <div className="h-4 w-3/4 bg-elevated rounded animate-pulse" />
              </div>
            ))
          ) : posts.length === 0 ? (
            <div className="bg-surface rounded-xl border border-white/[0.08] p-12 text-center">
              <TrendingUp size={36} className="text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No posts yet. Be the first to share something!</p>
            </div>
          ) : (
            posts.map(post => {
              const isLiked    = myLikes.has(post.id)
              const likeCount  = post.post_likes?.[0]?.count ?? 0
              const isOwn      = user?.id === post.user_id
              // Show shortened user_id as username (first 8 chars) since we can't easily get email
              const username   = usernameFromEmail(post.user_id?.slice(0, 8))

              return (
                <div
                  key={post.id}
                  className="bg-surface rounded-xl border border-white/[0.08] p-4 flex flex-col gap-3"
                >
                  {/* Post header: avatar + username + time */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {/* Avatar placeholder — initials */}
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-accent-purple">
                        {username[0]?.toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-slate-300">{username}</span>
                      {/* Ticker tag badge */}
                      {post.ticker && (
                        <button
                          onClick={() => navigate(`/stocks/${post.ticker}`)}
                          className="text-xs font-semibold text-accent-purple bg-accent-purple/10 px-2 py-0.5 rounded-full hover:bg-accent-purple/20 transition-colors"
                        >
                          ${post.ticker}
                        </button>
                      )}
                    </div>
                    <span className="text-xs text-slate-600">{timeAgo(post.created_at)}</span>
                  </div>

                  {/* Post content */}
                  <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                    {post.content}
                  </p>

                  {/* Post footer: like button + delete (own posts only) */}
                  <div className="flex items-center gap-4 pt-1 border-t border-white/[0.04]">
                    {/* Like button — filled heart if liked */}
                    <button
                      onClick={() => toggleLike(post.id)}
                      className={`flex items-center gap-1.5 text-xs transition-colors
                        ${isLiked
                          ? 'text-accent-red hover:text-red-400'
                          : 'text-slate-500 hover:text-accent-red'
                        }`}
                    >
                      <Heart
                        size={14}
                        className={isLiked ? 'fill-current' : ''}
                      />
                      {likeCount > 0 && <span>{likeCount}</span>}
                    </button>

                    {/* Delete button — only shown on the user's own posts */}
                    {isOwn && (
                      <button
                        onClick={() => deletePost(post.id)}
                        className="text-xs text-slate-600 hover:text-accent-red transition-colors ml-auto"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* ── Trending Tickers sidebar — 1/3 width ── */}
        <div className="flex flex-col gap-4">
          <div className="bg-surface rounded-xl border border-white/[0.08] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.08]">
              <h2 className="text-sm font-semibold text-slate-200">Trending Tickers</h2>
            </div>

            <div className="flex flex-col p-2">
              {TRENDING_TICKERS.map(({ ticker, name }, i) => (
                <button
                  key={ticker}
                  onClick={() => navigate(`/stocks/${ticker}`)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors text-left"
                >
                  {/* Rank number */}
                  <span className="text-xs font-mono text-slate-600 w-4">{i + 1}</span>

                  {/* Ticker + name */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-slate-100">{ticker}</span>
                    <span className="text-xs text-slate-500">{name}</span>
                  </div>

                  {/* Trending icon */}
                  <TrendingUp size={13} className="text-accent-purple ml-auto" />
                </button>
              ))}
            </div>
          </div>

          {/* Community guidelines card */}
          <div className="bg-surface rounded-xl border border-white/[0.08] p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Community Guidelines
            </h3>
            <ul className="flex flex-col gap-1.5">
              {[
                'Be respectful and constructive',
                'No spam or self-promotion',
                'This is not financial advice',
                'Do your own research',
              ].map(rule => (
                <li key={rule} className="flex items-start gap-2 text-xs text-slate-500">
                  <span className="text-accent-purple mt-0.5">•</span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </div>
  )
}
