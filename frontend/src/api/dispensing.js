import client from './client'

export const getDispensings = () => client.get('/pharmacy-dispensing')
export const getDispensing = (id) => client.get(`/pharmacy-dispensing/${id}`)
export const createDispensing = (data) => client.post('/pharmacy-dispensing', data)
export const updateDispensing = (id, data) => client.put(`/pharmacy-dispensing/${id}`, data)
export const deleteDispensing = (id) => client.delete(`/pharmacy-dispensing/${id}`)
