// AppLayout — wraps all authenticated pages with sidebar + topbar
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function AppLayout({ user }) {
  return (
    // Full screen flex row: sidebar on left, content on right
    <div className="flex h-screen bg-base overflow-hidden">

      <Sidebar />

      {/* Right side: topbar above, scrollable page content below */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Outlet renders whatever page is currently active */}
          <Outlet />
        </main>
      </div>

    </div>
  )
}
