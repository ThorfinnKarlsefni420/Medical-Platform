import client from './client'

export const getMedicalRecords    = (page = 1, limit = 50) => client.get('/medical-records', { params: { page, limit } })
export const getMedicalRecord     = (id)                   => client.get(`/medical-records/${id}`)
export const createMedicalRecord  = (data)                 => client.post('/medical-records', data)
export const updateMedicalRecord  = (id, data)             => client.put(`/medical-records/${id}`, data)
export const deleteMedicalRecord  = (id)                   => client.delete(`/medical-records/${id}`)
