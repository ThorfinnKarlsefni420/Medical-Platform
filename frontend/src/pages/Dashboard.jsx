import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getAppointments } from '../api/appointments'
import { getPatients } from '../api/patients'

const STATUS_COLORS = {
  Scheduled:  'badge bg-primary-100 text-primary-800',
  Completed:  'badge bg-lime-400/20 text-lime-700',
  Cancelled:  'badge bg-red-100 text-red-600',
  'No-Show':  'badge bg-yellow-100 text-yellow-700',
}

const RECEPTIONIST_ROLES = ['admin']
const CLINICAL_ROLES     = ['doctor', 'nurse']

export default function Dashboard() {
  const { user }    = useAuth()
  const navigate    = useNavigate()
  const isReceptionist = RECEPTIONIST_ROLES.includes(user?.role)
  const isClinical     = CLINICAL_ROLES.includes(user?.role)

  const [appointments, setAppointments] = useState([])
  const [patients, setPatients]         = useState([])
  const [search, setSearch]             = useState('')
  const [loadingAppts, setLoadingAppts] = useState(true)

  useEffect(() => {
    getAppointments()
      .then((res) => setAppointments(res.data))
      .catch(() => {})
      .finally(() => setLoadingAppts(false))

    if (isReceptionist || isClinical) {
      getPatients().then((res) => setPatients(res.data)).catch(() => {})
    }
  }, [isReceptionist, isClinical])

  const today = new Date().toISOString().slice(0, 10)
  const todayAppts = appointments.filter(
    (a) => (a.appointment_date ?? a.appointment_datetime)?.slice(0, 10) === today
  )
  const scheduled = appointments.filter((a) => a.status === 'Scheduled')

  // Patient quick-search results
  const searchResults = search.trim().length > 0
    ? patients.filter((p) =>
        `${p.first_name} ${p.last_name} ${p.email ?? ''} ${p.contact_number ?? ''}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ).slice(0, 6)
    : []

  const greeting = user?.profile?.first_name
    ? `Welcome, ${user.profile.first_name}`
    : user?.role === 'admin'
    ? 'Welcome, Admin'
    : `Welcome back`

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#1c1c1e' }}>{greeting}</h1>
        <p className="text-gray-500 text-sm mt-1 capitalize">
          {user?.role?.replace('_', ' ')} · {new Date().toLocaleDateString('en-GB', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>
      </div>

      {/* Receptionist quick-search + actions */}
      {isReceptionist && (
        <div className="card p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Find a patient</h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, email or phone…"
              className="form-input pr-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
            />
            <span className="absolute right-3 top-2.5 text-gray-400 text-sm">🔍</span>

            {searchResults.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 card shadow-lg divide-y divide-gray-100 overflow-hidden">
                {searchResults.map((p) => (
                  <button
                    key={p.patient_id}
                    onClick={() => { navigate(`/patients/${p.patient_id}`); setSearch('') }}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-left text-sm"
                  >
                    <span className="font-medium text-gray-900">{p.first_name} {p.last_name}</span>
                    <span className="text-gray-400 text-xs">{p.contact_number ?? p.email ?? ''}</span>
                  </button>
                ))}
              </div>
            )}

            {search.trim().length > 0 && searchResults.length === 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 card shadow-lg px-4 py-3 text-sm text-gray-400">
                No patients found.
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="flex gap-3 mt-4">
            <Link to="/patients" className="btn-primary text-sm flex items-center gap-1.5">
              + Register patient
            </Link>
            <Link to="/appointments" className="btn-secondary text-sm flex items-center gap-1.5">
              + Book appointment
            </Link>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Today's appointments" value={todayAppts.length} icon="📅" to="/appointments" accent />
        <StatCard label="Scheduled (total)"    value={scheduled.length}  icon="⏳" to="/appointments" />
        {(isReceptionist || isClinical) && (
          <StatCard label="Registered patients" value={patients.length} icon="👥" to="/patients" />
        )}
        <StatCard label="Medical records" value={null} icon="📋" to="/medical-records" />
      </div>

      {/* Today's schedule */}
      {!loadingAppts && todayAppts.length > 0 && (
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Today's schedule</h2>
            <Link to="/appointments" className="text-xs text-primary-600 hover:text-primary-700 font-medium">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {todayAppts.map((a) => (
              <div key={a.appointment_id ?? a.id} className="px-6 py-3 flex items-center justify-between text-sm">
                <div>
                  {/* Patient name links to detail if receptionist */}
                  {isReceptionist ? (
                    <Link
                      to={`/patients/${a.patient_id}`}
                      className="font-medium text-primary-700 hover:underline"
                    >
                      {a.patient_first_name} {a.patient_last_name}
                    </Link>
                  ) : (
                    <span className="font-medium">{a.patient_first_name} {a.patient_last_name}</span>
                  )}
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-gray-500">Dr. {a.doctor_first_name} {a.doctor_last_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-500">
                    {(a.appointment_time ?? a.appointment_datetime)?.slice(11, 16) || a.appointment_time?.slice(0, 5)}
                  </span>
                  <span className={STATUS_COLORS[a.status] ?? 'badge bg-gray-100 text-gray-600'}>
                    {a.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loadingAppts && todayAppts.length === 0 && (
        <div className="card px-6 py-10 text-center text-gray-400 text-sm">
          No appointments scheduled for today.
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon, to, accent }) {
  return (
    <Link
      to={to}
      className={`card p-5 hover:shadow-md transition-shadow block border-l-4 ${
        accent ? 'border-l-primary-500' : 'border-l-gray-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-3xl font-bold mt-1" style={{ color: '#1c1c1e' }}>{value ?? '—'}</p>
        </div>
        <span className="text-2xl opacity-60">{icon}</span>
      </div>
    </Link>
  )
}
