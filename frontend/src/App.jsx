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
import Pharmacy from './pages/Pharmacy'
import DrugInventory from './pages/DrugInventory'
import StaffManagement from './pages/StaffManagement'
import AcceptInvite from './pages/AcceptInvite'
import Lab from './pages/Lab'
import Inpatient from './pages/Inpatient'

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
      <Route path="/invite/:token" element={<AcceptInvite />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route index                  element={<Dashboard />} />
                <Route path="appointments"    element={<Appointments />} />
                <Route path="medical-records" element={
                  <ProtectedRoute roles={['admin', 'receptionist', 'doctor', 'nurse', 'patient']}>
                    <MedicalRecords />
                  </ProtectedRoute>
                } />
                <Route path="patients"        element={
                  <ProtectedRoute roles={['admin', 'receptionist', 'doctor', 'nurse']}>
                    <Patients />
                  </ProtectedRoute>
                } />
                <Route path="patients/:id"   element={
                  <ProtectedRoute roles={['admin', 'receptionist', 'doctor', 'nurse']}>
                    <PatientDetail />
                  </ProtectedRoute>
                } />
                <Route path="profile"         element={
                  <ProtectedRoute roles={['patient']}>
                    <MyProfile />
                  </ProtectedRoute>
                } />
                <Route path="pharmacy" element={
                  <ProtectedRoute roles={['admin', 'doctor', 'pharmacist']}>
                    <Pharmacy />
                  </ProtectedRoute>
                } />
                <Route path="drug-inventory" element={
                  <ProtectedRoute roles={['admin', 'pharmacist']}>
                    <DrugInventory />
                  </ProtectedRoute>
                } />
                <Route path="staff" element={
                  <ProtectedRoute roles={['admin']}>
                    <StaffManagement />
                  </ProtectedRoute>
                } />
                <Route path="lab" element={
                  <ProtectedRoute roles={['admin', 'doctor', 'lab_technician']}>
                    <Lab />
                  </ProtectedRoute>
                } />
                <Route path="inpatient" element={
                  <ProtectedRoute roles={['admin', 'doctor', 'nurse']}>
                    <Inpatient />
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
