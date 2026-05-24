import client from './client'

export const getLabOrders   = ()        => client.get('/lab-orders')
export const getLabOrder    = (id)      => client.get(`/lab-orders/${id}`)
export const createLabOrder = (data)    => client.post('/lab-orders', data)
export const updateLabOrder = (id, data) => client.put(`/lab-orders/${id}`, data)
export const deleteLabOrder = (id)      => client.delete(`/lab-orders/${id}`)
