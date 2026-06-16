import { createContext, useContext, useEffect, useState } from 'react'
import { login as apiLogin, logout as apiLogout, getMe, updateProfile as apiUpdateProfile } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Restore session via httpOnly cookie; no localStorage dependency
    getMe()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  async function login(email, password) {
    const res = await apiLogin(email, password)
    const { token, user } = res.data
    // Keep token in localStorage for non-cookie environments (e.g. mobile API clients)
    if (token) localStorage.setItem('hms_token', token)
    setUser(user)
    return user
  }

  async function updateProfile(data) {
    const res = await apiUpdateProfile(data)
    setUser((prev) => ({ ...prev, profile: res.data }))
    return res.data
  }

  async function logout() {
    try { await apiLogout() } catch { /* ignore network errors on logout */ }
    localStorage.removeItem('hms_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateProfile, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
