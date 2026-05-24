import client from './client'

export const getLabResults    = ()         => client.get('/lab-results')
export const getLabResult     = (id)       => client.get(`/lab-results/${id}`)
export const createLabResult  = (data)     => client.post('/lab-results', data)
export const updateLabResult  = (id, data) => client.put(`/lab-results/${id}`, data)
export const deleteLabResult  = (id)       => client.delete(`/lab-results/${id}`)
export const getMyLabResults  = ()         => client.get('/lab-results/my')
