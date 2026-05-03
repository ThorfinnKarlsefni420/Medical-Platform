import client from './client'

export const getAppointments = () => client.get('/appointments')
export const getAppointment = (id) => client.get(`/appointments/${id}`)
export const createAppointment = (data) => client.post('/appointments', data)
export const updateAppointment = (id, data) => client.put(`/appointments/${id}`, data)
export const deleteAppointment = (id) => client.delete(`/appointments/${id}`)
