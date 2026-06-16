import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  withCredentials: true, // send httpOnly cookie on every request
})

// Keep Authorization header support for environments without cookie support
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('hms_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('hms_token')
      // Don't redirect if already on login — avoids infinite reload when
      // the startup getMe() call returns 401 before the user has logged in.
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default client
