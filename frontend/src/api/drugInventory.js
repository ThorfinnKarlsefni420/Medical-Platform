import client from './client'

export const getDrugs    = (page = 1, limit = 50) => client.get('/drug-inventory', { params: { page, limit } })
export const getDrug     = (id)                   => client.get(`/drug-inventory/${id}`)
export const createDrug  = (data)                 => client.post('/drug-inventory', data)
export const updateDrug  = (id, data)             => client.put(`/drug-inventory/${id}`, data)
export const adjustStock = (id, delta)            => client.patch(`/drug-inventory/${id}/stock`, { delta })
export const deleteDrug  = (id)                   => client.delete(`/drug-inventory/${id}`)
export const importDrugs = (file) => {
  const form = new FormData()
  form.append('file', file)
  return client.post('/drug-inventory/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
