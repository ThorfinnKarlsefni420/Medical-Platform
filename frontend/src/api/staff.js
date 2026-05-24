import client from './client'

export const getStaff           = ()              => client.get('/staff')
export const sendInvite         = (data)          => client.post('/staff/invite', data)
export const validateInvite     = (token)         => client.get(`/staff/invite/${token}`)
export const acceptInvite       = (token, password) => client.post(`/staff/invite/${token}/accept`, { password })
export const updateStaffStatus  = (id, is_active) => client.patch(`/staff/${id}/status`, { is_active })
export const resendInvite       = (inviteId)      => client.post(`/staff/invites/${inviteId}/resend`)
