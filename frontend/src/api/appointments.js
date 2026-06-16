import client from './client'

export const getAppointments   = (page = 1, limit = 50) => client.get('/appointments', { params: { page, limit } })
export const getAppointment    = (id)                   => client.get(`/appointments/${id}`)
export const createAppointment = (data)                 => client.post('/appointments', data)
export const updateAppointment = (id, data)             => client.put(`/appointments/${id}`, data)
export const deleteAppointment = (id)                   => client.delete(`/appointments/${id}`)
