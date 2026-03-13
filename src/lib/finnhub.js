// Finnhub API helper — all stock data requests go through here
const API_KEY = import.meta.env.VITE_FINNHUB_API_KEY
const BASE_URL = 'https://finnhub.io/api/v1'

// Generic fetch wrapper — adds the API key to every request
async function finnhubFetch(endpoint) {
  const url = `${BASE_URL}${endpoint}&token=${API_KEY}`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Finnhub error: ${response.status}`)
  return response.json()
}

// Get current quote for a stock ticker (e.g. AAPL)
export function getQuote(ticker) {
  return finnhubFetch(`/quote?symbol=${ticker}`)
}

// Get company profile (name, logo, industry, etc.)
export function getCompanyProfile(ticker) {
  return finnhubFetch(`/stock/profile2?symbol=${ticker}`)
}

// Get market news — category: 'general' | 'forex' | 'crypto' | 'merger'
export function getMarketNews(category = 'general') {
  return finnhubFetch(`/news?category=${category}`)
}

// Get news for a specific company ticker
export function getCompanyNews(ticker) {
  // Date range: last 7 days
  const to = new Date().toISOString().split('T')[0]
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  return finnhubFetch(`/company-news?symbol=${ticker}&from=${from}&to=${to}`)
}

// Get stock candle data for charts
// resolution: 1, 5, 15, 30, 60, D, W, M
export function getCandles(ticker, resolution = 'D', days = 90) {
  const to = Math.floor(Date.now() / 1000)
  const from = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000)
  return finnhubFetch(`/stock/candle?symbol=${ticker}&resolution=${resolution}&from=${from}&to=${to}`)
}

// Search for stocks by keyword
export function searchStocks(query) {
  return finnhubFetch(`/search?q=${query}`)
}

// Get upcoming earnings dates
export function getEarningsCalendar() {
  const from = new Date().toISOString().split('T')[0]
  const to = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  return finnhubFetch(`/calendar/earnings?from=${from}&to=${to}`)
}
