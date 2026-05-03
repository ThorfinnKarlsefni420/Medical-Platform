import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/common/ProtectedRoute'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Appointments from './pages/Appointments'
import MedicalRecords from './pages/MedicalRecords'
import Patients from './pages/Patients'
import PatientDetail from './pages/PatientDetail'
import MyProfile from './pages/MyProfile'

function AppRoutes() {
  const { isAuthenticated } = useAuth()
  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Register />}
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route index                  element={<Dashboard />} />
                <Route path="appointments"    element={<Appointments />} />
                <Route path="medical-records" element={<MedicalRecords />} />
                <Route path="patients"        element={
                  <ProtectedRoute roles={['admin', 'doctor', 'nurse']}>
                    <Patients />
                  </ProtectedRoute>
                } />
                <Route path="patients/:id"   element={
                  <ProtectedRoute roles={['admin', 'doctor', 'nurse']}>
                    <PatientDetail />
                  </ProtectedRoute>
                } />
                <Route path="profile"         element={
                  <ProtectedRoute roles={['patient']}>
                    <MyProfile />
                  </ProtectedRoute>
                } />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default AppRoutes
