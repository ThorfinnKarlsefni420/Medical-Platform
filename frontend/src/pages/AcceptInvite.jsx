import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { validateInvite, acceptInvite } from '../api/staff'

const ROLE_LABELS = {
  admin:          'Administrator',
  doctor:         'Doctor',
  nurse:          'Nurse',
  pharmacist:     'Pharmacist',
  lab_technician: 'Lab Technician',
}

export default function AcceptInvite() {
  const { token }    = useParams()
  const navigate     = useNavigate()
  const { login: setUserFromAccept } = useAuth()

  const [invite, setInvite]       = useState(null)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading]     = useState(true)

  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [saving, setSaving]           = useState(false)
  const [formError, setFormError]     = useState('')

  useEffect(() => {
    validateInvite(token)
      .then((res) => setInvite(res.data))
      .catch((err) => setLoadError(err.response?.data?.message ?? 'Invalid invite link.'))
      .finally(() => setLoading(false))
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) {
      setFormError('Passwords do not match.')
      return
    }
    setFormError('')
    setSaving(true)
    try {
      const res = await acceptInvite(token, password)
      // Store token and set user — same as login flow
      localStorage.setItem('hms_token', res.data.token)
      // Re-use the AuthContext login path by calling getMe via a full page reload
      // so the context re-hydrates from the stored token
      window.location.href = '/'
    } catch (err) {
      setFormError(err.response?.data?.message ?? 'Failed to activate account.')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Verifying invite…</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-4xl">🔒</div>
          <h1 className="text-xl font-bold text-gray-900">Invite unavailable</h1>
          <p className="text-gray-500">{loadError}</p>
          <a href="/login" className="inline-block btn-primary mt-2">Go to login</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-100 mb-4">
            <span className="text-2xl">🏥</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">You're invited</h1>
          <p className="text-gray-500 mt-1">
            Join Busia Health Care Services HMS
          </p>
        </div>

        {/* Invite details */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-4 space-y-2 text-sm">
          <Row label="Name" value={`${invite.first_name} ${invite.last_name}`} />
          <Row label="Email" value={invite.email} />
          <Row label="Role"  value={ROLE_LABELS[invite.role] ?? invite.role} />
        </div>

        {/* Password form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 px-6 py-6 space-y-4">
          <p className="text-sm text-gray-600">Set a password to activate your account.</p>

          <div>
            <label className="form-label">Password</label>
            <input
              type="password"
              required
              minLength={8}
              className="form-input"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label">Confirm password</label>
            <input
              type="password"
              required
              className="form-input"
              placeholder="Repeat your password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          {formError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {formError}
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? 'Activating…' : 'Set password & activate account'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-500 w-12 shrink-0">{label}:</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  )
}
