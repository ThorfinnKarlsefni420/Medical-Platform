import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const GENDERS = ['Male', 'Female', 'Other']

export default function MyProfile() {
  const { user, updateProfile } = useAuth()
  const p = user?.profile

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function startEdit() {
    setForm({
      first_name:     p?.first_name     ?? '',
      last_name:      p?.last_name      ?? '',
      date_of_birth:  p?.date_of_birth?.slice(0, 10) ?? '',
      gender:         p?.gender         ?? '',
      blood_type:     p?.blood_type     ?? '',
      contact_number: p?.contact_number ?? '',
      address:        p?.address        ?? '',
    })
    setError('')
    setSuccess(false)
    setEditing(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await updateProfile({
        ...form,
        gender:     form.gender     || null,
        blood_type: form.blood_type || null,
      })
      setEditing(false)
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  const f = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }))

  if (!p) {
    return (
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">My Profile</h1>
        <div className="card p-6 text-gray-500 text-sm">
          No patient profile is linked to your account. Please contact reception.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        {!editing && (
          <button onClick={startEdit} className="btn-secondary">Edit details</button>
        )}
      </div>

      {success && !editing && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-4">
          Profile updated successfully.
        </p>
      )}

      {!editing ? (
        <div className="card divide-y divide-gray-100">
          <Section label="Full name"     value={`${p.first_name} ${p.last_name}`} />
          <Section label="Date of birth" value={p.date_of_birth?.slice(0, 10) ?? '—'} />
          <Section label="Gender"        value={p.gender ?? '—'} />
          <Section label="Blood type"    value={p.blood_type ?? '—'} />
          <Section label="Phone"         value={p.contact_number ?? '—'} />
          <Section label="Email"         value={user.email} />
          <Section label="Address"       value={p.address ?? '—'} />
        </div>
      ) : (
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">First name</label>
                <input required className="form-input" value={form.first_name} onChange={f('first_name')} />
              </div>
              <div>
                <label className="form-label">Last name</label>
                <input required className="form-input" value={form.last_name} onChange={f('last_name')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Date of birth</label>
                <input required type="date" className="form-input" value={form.date_of_birth} onChange={f('date_of_birth')} />
              </div>
              <div>
                <label className="form-label">Gender</label>
                <select className="form-select" value={form.gender} onChange={f('gender')}>
                  <option value="">Prefer not to say</option>
                  {GENDERS.map((g) => <option key={g}>{g}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Blood type</label>
                <select className="form-select" value={form.blood_type} onChange={f('blood_type')}>
                  <option value="">Unknown</option>
                  {BLOOD_TYPES.map((b) => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Phone number</label>
                <input type="tel" className="form-input" value={form.contact_number} onChange={f('contact_number')} />
              </div>
            </div>

            <div>
              <label className="form-label">Address</label>
              <input className="form-input" value={form.address} onChange={f('address')} />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function Section({ label, value }) {
  return (
    <div className="px-6 py-3 flex justify-between text-sm">
      <span className="text-gray-500 w-36 shrink-0">{label}</span>
      <span className="text-gray-900 text-right">{value}</span>
    </div>
  )
}
