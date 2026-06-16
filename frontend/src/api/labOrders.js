import client from './client'

export const getLabOrders   = (page = 1, limit = 50) => client.get('/lab-orders', { params: { page, limit } })
export const getLabOrder    = (id)                   => client.get(`/lab-orders/${id}`)
export const createLabOrder = (data)                 => client.post('/lab-orders', data)
export const updateLabOrder = (id, data)             => client.put(`/lab-orders/${id}`, data)
export const deleteLabOrder = (id)                   => client.delete(`/lab-orders/${id}`)
