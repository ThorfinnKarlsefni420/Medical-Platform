import client from './client'

export const getWards  = ()         => client.get('/wards')
export const createWard = (data)    => client.post('/wards', data)
export const updateWard = (id, data)=> client.put(`/wards/${id}`, data)
export const deleteWard = (id)      => client.delete(`/wards/${id}`)

export const getBeds   = ()         => client.get('/beds')
export const createBed = (data)     => client.post('/beds', data)
export const updateBed = (id, data) => client.put(`/beds/${id}`, data)
export const deleteBed = (id)       => client.delete(`/beds/${id}`)

export const getAdmissions   = ()          => client.get('/admissions')
export const getAdmission    = (id)        => client.get(`/admissions/${id}`)
export const createAdmission = (data)      => client.post('/admissions', data)
export const updateAdmission = (id, data)  => client.put(`/admissions/${id}`, data)
export const deleteAdmission = (id)        => client.delete(`/admissions/${id}`)

export const getDischarges   = ()     => client.get('/discharges')
export const createDischarge = (data) => client.post('/discharges', data)

export const getAdmissionPrescriptions = (admissionId) =>
  client.get(`/prescriptions/admission/${admissionId}`)
export const getAdmissionLabOrders = (admissionId) =>
  client.get(`/lab-orders/admission/${admissionId}`)
