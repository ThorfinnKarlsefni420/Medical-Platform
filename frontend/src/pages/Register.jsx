import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api/auth'
import { useAuth } from '../contexts/AuthContext'

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const GENDERS = ['Male', 'Female', 'Other']

export default function Register() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [form, setForm] = useState({
    first_name: '', last_name: '', date_of_birth: '',
    gender: '', blood_type: '', contact_number: '', address: '',
    email: '', password: '', confirm_password: '',
  })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const f = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm_password) {
      return setError('Passwords do not match.')
    }
    if (form.password.length < 8) {
      return setError('Password must be at least 8 characters.')
    }

    setLoading(true)
    try {
      await register({
        role: 'patient',
        email:          form.email,
        password:       form.password,
        first_name:     form.first_name,
        last_name:      form.last_name,
        date_of_birth:  form.date_of_birth,
        gender:         form.gender   || undefined,
        blood_type:     form.blood_type || undefined,
        contact_number: form.contact_number || undefined,
        address:        form.address  || undefined,
      })
      // Log in immediately after registering
      await login(form.email, form.password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message ?? 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-10" style={{ backgroundColor: '#ecfeff' }}>
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Busia Health Care Services" className="h-16 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-sm text-gray-500 mt-1">Patient registration</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
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

            <hr className="border-gray-200" />

            <div>
              <label className="form-label">Email address</label>
              <input required type="email" autoComplete="email" className="form-input" value={form.email} onChange={f('email')} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Password</label>
                <input required type="password" autoComplete="new-password" className="form-input" value={form.password} onChange={f('password')} />
              </div>
              <div>
                <label className="form-label">Confirm password</label>
                <input required type="password" autoComplete="new-password" className="form-input" value={form.confirm_password} onChange={f('confirm_password')} />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
