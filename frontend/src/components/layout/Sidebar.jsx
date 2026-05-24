import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const ALL_ROLES = ['admin', 'doctor', 'nurse', 'pharmacist', 'lab_technician', 'patient']

const NAV = [
  { to: '/',                label: 'Dashboard',       icon: '⊞', roles: ALL_ROLES },
  { to: '/patients',        label: 'Patients',        icon: '👤', roles: ['admin', 'receptionist', 'doctor', 'nurse'] },
  { to: '/appointments',    label: 'Appointments',    icon: '📅', roles: ['admin', 'receptionist', 'doctor', 'nurse', 'patient'] },
  { to: '/medical-records', label: 'Medical Records', icon: '📋', roles: ['admin', 'receptionist', 'doctor', 'nurse', 'patient'] },
  { to: '/lab',             label: 'Laboratory',      icon: '🧪', roles: ['admin', 'doctor', 'lab_technician'] },
  { to: '/inpatient',      label: 'Inpatient',       icon: '🏥', roles: ['admin', 'doctor', 'nurse'] },
  { to: '/pharmacy',        label: 'Pharmacy',        icon: '💊', roles: ['admin', 'doctor', 'pharmacist'] },
  { to: '/drug-inventory',  label: 'Drug Inventory',  icon: '🗃️', roles: ['admin', 'pharmacist'] },
  { to: '/staff',           label: 'Staff',           icon: '👥', roles: ['admin'] },
  { to: '/profile',         label: 'My Profile',      icon: '🪪', roles: ['patient'] },
]

export default function Sidebar() {
  const { user, logout } = useAuth()

  const links = NAV.filter((n) => n.roles.includes(user?.role))
  const displayName = user?.profile
    ? `${user.profile.first_name} ${user.profile.last_name}`
    : user?.email

  return (
    <aside
      className="flex flex-col w-60 shrink-0 h-screen sticky top-0 text-white"
      style={{ backgroundColor: '#3b0764' }}   /* Dark Plum */
    >
      {/* Logo */}
      <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
        <span className="text-lg font-bold tracking-wide">HMS</span>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Busia Health Care</p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <span className="text-base">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
        <div className="text-xs mb-0.5 capitalize" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {user?.role?.replace('_', ' ')}
        </div>
        <div className="text-sm font-medium truncate mb-3">{displayName}</div>
        <button
          onClick={logout}
          className="w-full text-xs py-1.5 rounded-md font-medium transition-colors"
          style={{ background: 'rgba(255,255,255,0.12)', color: 'white' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
