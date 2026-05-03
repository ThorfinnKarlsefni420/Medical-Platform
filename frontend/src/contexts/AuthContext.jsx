import { createContext, useContext, useEffect, useState } from 'react'
import { login as apiLogin, getMe, updateProfile as apiUpdateProfile } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('hms_token')
    if (!token) { setLoading(false); return }

    getMe()
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem('hms_token'))
      .finally(() => setLoading(false))
  }, [])

  async function login(email, password) {
    const res = await apiLogin(email, password)
    const { token, user } = res.data
    localStorage.setItem('hms_token', token)
    setUser(user)
    return user
  }

  async function updateProfile(data) {
    const res = await apiUpdateProfile(data)
    // Merge updated profile back into user state
    setUser((prev) => ({ ...prev, profile: res.data }))
    return res.data
  }

  function logout() {
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
