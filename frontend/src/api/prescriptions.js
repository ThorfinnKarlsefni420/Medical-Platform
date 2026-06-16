import client from './client'

export const getPrescriptions   = (page = 1, limit = 50) => client.get('/prescriptions', { params: { page, limit } })
export const getPrescription    = (id)                   => client.get(`/prescriptions/${id}`)
export const createPrescription = (data)                 => client.post('/prescriptions', data)
export const updatePrescription = (id, data)             => client.put(`/prescriptions/${id}`, data)
export const deletePrescription = (id)                   => client.delete(`/prescriptions/${id}`)
