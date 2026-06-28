import { useEffect, useState } from 'react'
import { getStaff, sendInvite, updateStaffStatus, resendInvite, resetPassword } from '../api/staff'
import Modal from '../components/common/Modal'

const ROLE_LABELS = {
  admin:          'Administrator',
  receptionist:   'Receptionist',
  doctor:         'Doctor',
  nurse:          'Nurse',
  pharmacist:     'Pharmacist',
  lab_technician: 'Lab Technician',
}

const STATUS_BADGE = {
  active:   'bg-green-100 text-green-700',
  inactive: 'bg-red-100 text-red-600',
  pending:  'bg-amber-100 text-amber-700',
  expired:  'bg-gray-100 text-gray-500',
}

const EMPTY_FORM = {
  first_name:     '',
  last_name:      '',
  email:          '',
  role:           'nurse',
  specialty:      '',
  license_number: '',
}

export default function StaffManagement() {
  const [staff, setStaff]               = useState([])
  const [pendingInvites, setPendingInvites] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')

  const [showModal, setShowModal]       = useState(false)
  const [form, setForm]                 = useState(EMPTY_FORM)
  const [saving, setSaving]             = useState(false)
  const [formError, setFormError]       = useState('')

  const [inviteUrl, setInviteUrl]       = useState(null)
  const [copied, setCopied]             = useState(false)

  const [resetTarget, setResetTarget]   = useState(null)  // user row for password reset
  const [resetPwd, setResetPwd]         = useState('')
  const [resetting, setResetting]       = useState(false)
  const [resetError, setResetError]     = useState('')
  const [resetSuccess, setResetSuccess] = useState(false)

  useEffect(() => {
    load()
  }, [])

  function load() {
    setLoading(true)
    getStaff()
      .then((res) => {
        setStaff(res.data.staff)
        setPendingInvites(res.data.pending_invites)
      })
      .catch(() => setError('Failed to load staff.'))
      .finally(() => setLoading(false))
  }

  function openInviteModal() {
    setForm(EMPTY_FORM)
    setFormError('')
    setInviteUrl(null)
    setShowModal(true)
  }

  async function handleInvite(e) {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      const res = await sendInvite(form)
      setInviteUrl(res.data.invite_url)
      load()
    } catch (err) {
      setFormError(err.response?.data?.message ?? 'Failed to send invite.')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusToggle(member) {
    try {
      const res = await updateStaffStatus(member.user_id, !member.is_active)
      setStaff((prev) => prev.map((s) => s.user_id === member.user_id ? { ...s, ...res.data, status: res.data.is_active ? 'active' : 'inactive' } : s))
    } catch {
      setError('Failed to update status.')
    }
  }

  async function handleResend(invite) {
    try {
      const res = await resendInvite(invite.invite_id)
      setInviteUrl(res.data.invite_url)
      setShowModal(true)
      load()
    } catch {
      setError('Failed to resend invite.')
    }
  }

  function openReset(row) {
    setResetTarget(row)
    setResetPwd('')
    setResetError('')
    setResetSuccess(false)
  }

  function closeReset() {
    if (resetting) return
    setResetTarget(null)
    setResetPwd('')
    setResetError('')
    setResetSuccess(false)
  }

  async function handleReset(e) {
    e.preventDefault()
    if (resetPwd.length < 8) {
      return setResetError('Password must be at least 8 characters.')
    }
    setResetting(true)
    setResetError('')
    try {
      await resetPassword(resetTarget.raw.user_id, resetPwd)
      setResetSuccess(true)
    } catch (err) {
      setResetError(err.response?.data?.message ?? 'Failed to reset password.')
    } finally {
      setResetting(false)
    }
  }

  function copyUrl() {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const counts = {
    active:   staff.filter((s) => s.status === 'active').length,
    inactive: staff.filter((s) => s.status === 'inactive').length,
    pending:  pendingInvites.filter((i) => i.status === 'pending').length,
  }

  const allRows = [
    ...staff.map((s) => ({
      key:     `user-${s.user_id}`,
      name:    s.first_name ? `${s.first_name} ${s.last_name}` : '—',
      email:   s.email,
      role:    s.role,
      status:  s.status,
      date:    s.created_at,
      source:  'user',
      raw:     s,
    })),
    ...pendingInvites.map((i) => ({
      key:     `invite-${i.invite_id}`,
      name:    `${i.first_name} ${i.last_name}`,
      email:   i.email,
      role:    i.role,
      status:  i.status,
      date:    i.created_at,
      source:  'invite',
      raw:     i,
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date))

  if (loading) return <p className="text-gray-500">Loading…</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
        <button onClick={openInviteModal} className="btn-primary">+ Invite staff</button>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Active',  value: counts.active,   color: 'text-green-700' },
          { label: 'Pending', value: counts.pending,  color: 'text-amber-700' },
          { label: 'Inactive',value: counts.inactive, color: 'text-red-600'   },
        ].map(({ label, value, color }) => (
          <div key={label} className="card px-5 py-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Name', 'Email', 'Role', 'Status', 'Date', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {allRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No staff found.</td>
              </tr>
            )}
            {allRows.map((row) => (
              <tr key={row.key} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                <td className="px-4 py-3 text-gray-600">{row.email}</td>
                <td className="px-4 py-3 text-gray-600">{ROLE_LABELS[row.role] ?? row.role}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[row.status]}`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(row.date).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    {row.source === 'user' && (
                      <>
                        <button
                          onClick={() => handleStatusToggle(row.raw)}
                          className={`text-xs font-medium ${row.status === 'active' ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}
                        >
                          {row.status === 'active' ? 'Deactivate' : 'Reactivate'}
                        </button>
                        <button
                          onClick={() => openReset(row)}
                          className="text-xs font-medium text-primary-600 hover:text-primary-800"
                        >
                          Reset password
                        </button>
                      </>
                    )}
                    {row.source === 'invite' && (
                      <button
                        onClick={() => handleResend(row.raw)}
                        className="text-xs font-medium text-amber-600 hover:text-amber-800"
                      >
                        Resend invite
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite modal */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setInviteUrl(null) }}
        title="Invite Staff Member"
        size="md"
      >
        {inviteUrl ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800">
              Invite created. Share the link below with the staff member — it expires in 48 hours.
            </div>
            <div>
              <label className="form-label">Invite link</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  className="form-input flex-1 bg-gray-50 text-xs"
                  value={inviteUrl}
                />
                <button onClick={copyUrl} className="btn-secondary shrink-0 text-xs">
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button className="btn-primary" onClick={() => { setShowModal(false); setInviteUrl(null) }}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">First name</label>
                <input required className="form-input" value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Last name</label>
                <input required className="form-input" value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="form-label">Email</label>
              <input required type="email" className="form-input" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>

            <div>
              <label className="form-label">Role</label>
              <select className="form-select" value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value, specialty: '', license_number: '' })}>
                {Object.entries(ROLE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            {form.role === 'doctor' && (
              <>
                <div>
                  <label className="form-label">Specialty</label>
                  <input className="form-input" placeholder="e.g. General Practice"
                    value={form.specialty}
                    onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">License number</label>
                  <input required className="form-input" placeholder="e.g. KE-MED-12345"
                    value={form.license_number}
                    onChange={(e) => setForm({ ...form, license_number: e.target.value })} />
                </div>
              </>
            )}

            {formError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {formError}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Sending…' : 'Send invite'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Reset password modal */}
      <Modal open={!!resetTarget} onClose={closeReset} title="Reset Password">
        {resetSuccess ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800">
              Password has been reset for <span className="font-semibold">{resetTarget?.name}</span>.
            </div>
            <div className="flex justify-end">
              <button className="btn-primary" onClick={closeReset}>Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <p className="text-sm text-gray-600">
              Set a new password for <span className="font-semibold">{resetTarget?.name}</span> ({resetTarget?.email}).
            </p>
            <div>
              <label className="form-label">New password</label>
              <input
                type="password"
                required
                className="form-input"
                placeholder="Min. 8 characters"
                value={resetPwd}
                onChange={(e) => setResetPwd(e.target.value)}
              />
            </div>
            {resetError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{resetError}</p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="btn-secondary" onClick={closeReset} disabled={resetting}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={resetting}>
                {resetting ? 'Saving…' : 'Reset password'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
