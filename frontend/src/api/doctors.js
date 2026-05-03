import client from './client'

export const getDoctors = () => client.get('/doctors')
export const getDoctor = (id) => client.get(`/doctors/${id}`)
