// Sidebar — fixed left navigation with icons only
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Newspaper, TrendingUp, Star,
  BriefcaseBusiness, CalendarDays, SlidersHorizontal,
  Users, Bell
} from 'lucide-react'

// Navigation items — icon, label, and route path
const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',  path: '/' },
  { icon: Newspaper,       label: 'Newsroom',   path: '/news' },
  { icon: TrendingUp,      label: 'Markets',    path: '/stocks' },
  { icon: Star,            label: 'Watchlist',  path: '/watchlist' },
  { icon: BriefcaseBusiness, label: 'Portfolio', path: '/portfolio' },
  { icon: CalendarDays,    label: 'Calendar',   path: '/calendar' },
  { icon: SlidersHorizontal, label: 'Screener', path: '/screener' },
  { icon: Users,           label: 'Community',  path: '/community' },
  { icon: Bell,            label: 'Alerts',     path: '/alerts' },
]

export default function Sidebar() {
  return (
    <aside className="w-16 bg-primary flex flex-col items-center py-5 gap-1 shrink-0">

      {/* OpenBell logo mark */}
      <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-4">
        <span className="text-white font-bold text-sm">OB</span>
      </div>

      {/* Nav icons */}
      <nav className="flex flex-col items-center gap-1 w-full px-2">
        {NAV_ITEMS.map(({ icon: Icon, label, path }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}  /* Only mark "/" as active on exact match */
            title={label}       /* Tooltip on hover since there's no label text */
            className={({ isActive }) =>
              `w-full flex items-center justify-center p-2 rounded-lg transition-colors duration-150
               ${isActive
                 ? 'bg-white/20 text-white'
                 : 'text-white/50 hover:bg-white/10 hover:text-white'
               }`
            }
          >
            <Icon size={20} />
          </NavLink>
        ))}
      </nav>

    </aside>
  )
}
