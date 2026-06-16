import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getAppointments,
  createAppointment,
  updateAppointment,
} from '../api/appointments'
import { getPatients } from '../api/patients'
import { getDoctors } from '../api/doctors'
import Modal from '../components/common/Modal'
import Pagination from '../components/common/Pagination'

const STATUS_OPTIONS = ['Scheduled', 'Completed', 'Cancelled', 'No-Show']

const STATUS_COLORS = {
  Scheduled:  'bg-primary-100 text-primary-800',   /* Teal */
  Completed:  'bg-lime-400/20 text-lime-700',       /* Lime */
  Cancelled:  'bg-red-100 text-red-600',
  'No-Show':  'bg-yellow-100 text-yellow-700',
}

const EMPTY_FORM = {
  patient_id: '',
  doctor_id: '',
  appointment_date: '',
  appointment_time: '',
  reason: '',
  notes: '',
  status: 'Scheduled',
}

export default function Appointments() {
  const { user } = useAuth()
  const canBook = ['admin', 'receptionist', 'doctor', 'nurse'].includes(user?.role)

  const [appointments, setAppointments] = useState([])
  const [total, setTotal]               = useState(0)
  const [page, setPage]                 = useState(1)
  const limit = 50
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [statusFilter, setStatusFilter] = useState('All')
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getAppointments(page, limit),
      canBook ? getPatients(1, 100) : Promise.resolve({ data: { data: [] } }),
      canBook ? getDoctors() : Promise.resolve({ data: [] }),
    ])
      .then(([appts, pats, docs]) => {
        setAppointments(appts.data.data)
        setTotal(appts.data.total)
        setPatients(pats.data.data ?? pats.data)
        setDoctors(docs.data)
      })
      .catch(() => setError('Failed to load appointments.'))
      .finally(() => setLoading(false))
  }, [canBook, page])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setShowModal(true)
  }

  function openEdit(appt) {
    setEditing(appt)
    setForm({
      patient_id:       appt.patient_id,
      doctor_id:        appt.doctor_id,
      appointment_date: appt.appointment_datetime?.slice(0, 10) ?? '',
      appointment_time: appt.appointment_datetime?.slice(11, 16) ?? '',
      reason:           appt.reason ?? '',
      notes:            appt.notes ?? '',
      status:           appt.status ?? 'Scheduled',
    })
    setFormError('')
    setShowModal(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    const payload = {
      patient_id:           form.patient_id,
      doctor_id:            form.doctor_id,
      appointment_datetime: `${form.appointment_date}T${form.appointment_time}`,
      reason:               form.reason,
      status:               form.status,
    }
    try {
      if (editing) {
        const res = await updateAppointment(editing.appointment_id, payload)
        setAppointments((prev) => prev.map((a) => (a.appointment_id === editing.appointment_id ? res.data : a)))
      } else {
        const res = await createAppointment(payload)
        setAppointments((prev) => [res.data, ...prev])
      }
      setShowModal(false)
    } catch (err) {
      setFormError(err.response?.data?.message ?? 'Failed to save appointment.')
    } finally {
      setSaving(false)
    }
  }

  const filtered = appointments.filter((a) => {
    const matchStatus = statusFilter === 'All' || a.status === statusFilter
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      `${a.patient_first_name} ${a.patient_last_name}`.toLowerCase().includes(q) ||
      `${a.doctor_first_name} ${a.doctor_last_name}`.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  if (loading) return <p className="text-gray-500">Loading…</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
        {canBook && (
          <button onClick={openCreate} className="btn-primary">
            + Book appointment
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search patient or doctor…"
          className="form-input max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="form-select w-40"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Patient', 'Doctor', 'Date', 'Time', 'Reason', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No appointments found.
                </td>
              </tr>
            )}
            {filtered.map((a) => (
              <tr key={a.appointment_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">
                  {a.patient_first_name} {a.patient_last_name}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  Dr. {a.doctor_first_name} {a.doctor_last_name}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {a.appointment_datetime?.slice(0, 10)}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {a.appointment_datetime?.slice(11, 16)}
                </td>
                <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                  {a.reason ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {a.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {canBook && (
                    <button
                      onClick={() => openEdit(a)}
                      className="text-primary-600 hover:text-primary-800 text-xs font-medium"
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} total={total} limit={limit} onPageChange={setPage} />

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Appointment' : 'Book Appointment'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Patient</label>
              <select
                required
                className="form-select"
                value={form.patient_id}
                onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
              >
                <option value="">Select patient…</option>
                {patients.map((p) => (
                  <option key={p.patient_id} value={p.patient_id}>
                    {p.first_name} {p.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Doctor</label>
              <select
                required
                className="form-select"
                value={form.doctor_id}
                onChange={(e) => setForm({ ...form, doctor_id: e.target.value })}
              >
                <option value="">Select doctor…</option>
                {doctors.map((d) => (
                  <option key={d.doctor_id} value={d.doctor_id}>
                    Dr. {d.first_name} {d.last_name}
                    {d.specialty ? ` — ${d.specialty}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Date</label>
              <input
                type="date"
                required
                className="form-input"
                value={form.appointment_date}
                onChange={(e) => setForm({ ...form, appointment_date: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Time</label>
              <input
                type="time"
                required
                className="form-input"
                value={form.appointment_time}
                onChange={(e) => setForm({ ...form, appointment_time: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Reason for visit</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Annual check-up"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </div>

          {editing && (
            <div>
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="form-label">Notes</label>
            <textarea
              rows={3}
              className="form-input"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          {formError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Update' : 'Book'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
