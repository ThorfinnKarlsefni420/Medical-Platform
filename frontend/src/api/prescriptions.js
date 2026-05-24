import client from './client'

export const getPrescriptions = () => client.get('/prescriptions')
export const getPrescription = (id) => client.get(`/prescriptions/${id}`)
export const createPrescription = (data) => client.post('/prescriptions', data)
export const updatePrescription = (id, data) => client.put(`/prescriptions/${id}`, data)
export const deletePrescription = (id) => client.delete(`/prescriptions/${id}`)
