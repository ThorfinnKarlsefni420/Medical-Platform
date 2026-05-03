import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getMedicalRecords,
  createMedicalRecord,
  updateMedicalRecord,
} from '../api/medicalRecords'
import { getPatients } from '../api/patients'
import { getAppointments } from '../api/appointments'
import Modal from '../components/common/Modal'

const EMPTY_FORM = {
  patient_id: '',
  appointment_id: '',
  visit_date: new Date().toISOString().slice(0, 10),
  chief_complaint: '',
  diagnosis: '',
  treatment_plan: '',
  notes: '',
  follow_up_date: '',
}

export default function MedicalRecords() {
  const { user } = useAuth()
  const canCreate = ['admin', 'doctor'].includes(user?.role)

  const [records, setRecords] = useState([])
  const [patients, setPatients] = useState([])
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [showDetail, setShowDetail] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([
      getMedicalRecords(),
      canCreate ? getPatients() : Promise.resolve({ data: [] }),
      canCreate ? getAppointments() : Promise.resolve({ data: [] }),
    ])
      .then(([recs, pats, appts]) => {
        setRecords(recs.data)
        setPatients(pats.data)
        setAppointments(appts.data)
      })
      .catch(() => setError('Failed to load medical records.'))
      .finally(() => setLoading(false))
  }, [canCreate])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setShowModal(true)
  }

  function openEdit(rec) {
    setEditing(rec)
    setForm({
      patient_id: rec.patient_id,
      appointment_id: rec.appointment_id ?? '',
      visit_date: rec.visit_date?.slice(0, 10) ?? '',
      chief_complaint: rec.chief_complaint ?? '',
      diagnosis: rec.diagnosis ?? '',
      treatment_plan: rec.treatment_plan ?? '',
      notes: rec.notes ?? '',
      follow_up_date: rec.follow_up_date?.slice(0, 10) ?? '',
    })
    setFormError('')
    setShowModal(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    const payload = {
      ...form,
      appointment_id: form.appointment_id || null,
      follow_up_date: form.follow_up_date || null,
    }
    try {
      if (editing) {
        const res = await updateMedicalRecord(editing.id, payload)
        setRecords((prev) => prev.map((r) => (r.id === editing.id ? res.data : r)))
      } else {
        const res = await createMedicalRecord(payload)
        setRecords((prev) => [res.data, ...prev])
      }
      setShowModal(false)
    } catch (err) {
      setFormError(err.response?.data?.message ?? 'Failed to save record.')
    } finally {
      setSaving(false)
    }
  }

  const patientAppointments = form.patient_id
    ? appointments.filter((a) => String(a.patient_id) === String(form.patient_id))
    : appointments

  const filtered = records.filter((r) => {
    const q = search.toLowerCase()
    return (
      !q ||
      `${r.patient_first_name} ${r.patient_last_name}`.toLowerCase().includes(q) ||
      (r.diagnosis ?? '').toLowerCase().includes(q)
    )
  })

  if (loading) return <p className="text-gray-500">Loading…</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Medical Records</h1>
        {canCreate && (
          <button onClick={openCreate} className="btn-primary">
            + New record
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by patient or diagnosis…"
          className="form-input max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Patient', 'Doctor', 'Visit Date', 'Chief Complaint', 'Diagnosis', 'Follow-up', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No records found.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">
                  {r.patient_first_name} {r.patient_last_name}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {r.doctor_first_name ? `Dr. ${r.doctor_first_name} ${r.doctor_last_name}` : '—'}
                </td>
                <td className="px-4 py-3 text-gray-600">{r.visit_date?.slice(0, 10)}</td>
                <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                  {r.chief_complaint ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                  {r.diagnosis ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {r.follow_up_date?.slice(0, 10) ?? '—'}
                </td>
                <td className="px-4 py-3 flex gap-3">
                  <button
                    onClick={() => setShowDetail(r)}
                    className="text-gray-500 hover:text-gray-700 text-xs font-medium"
                  >
                    View
                  </button>
                  {canCreate && (
                    <button
                      onClick={() => openEdit(r)}
                      className="text-primary-600 hover:text-primary-800 text-xs font-medium"
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail view */}
      <Modal
        open={!!showDetail}
        onClose={() => setShowDetail(null)}
        title="Medical Record"
        size="lg"
      >
        {showDetail && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Patient"    value={`${showDetail.patient_first_name} ${showDetail.patient_last_name}`} />
              <Field label="Doctor"     value={showDetail.doctor_first_name ? `Dr. ${showDetail.doctor_first_name} ${showDetail.doctor_last_name}` : '—'} />
              <Field label="Visit date" value={showDetail.visit_date?.slice(0, 10)} />
              <Field label="Follow-up"  value={showDetail.follow_up_date?.slice(0, 10) ?? '—'} />
            </div>
            <Field label="Chief complaint" value={showDetail.chief_complaint ?? '—'} />
            <Field label="Diagnosis"       value={showDetail.diagnosis ?? '—'} />
            <Field label="Treatment plan"  value={showDetail.treatment_plan ?? '—'} />
            {showDetail.notes && <Field label="Notes" value={showDetail.notes} />}
          </div>
        )}
      </Modal>

      {/* Create / Edit form */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Medical Record' : 'New Medical Record'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Patient</label>
              <select
                required
                className="form-select"
                value={form.patient_id}
                onChange={(e) => setForm({ ...form, patient_id: e.target.value, appointment_id: '' })}
              >
                <option value="">Select patient…</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Linked appointment <span className="text-gray-400 font-normal">(optional)</span></label>
              <select
                className="form-select"
                value={form.appointment_id}
                onChange={(e) => setForm({ ...form, appointment_id: e.target.value })}
              >
                <option value="">None</option>
                {patientAppointments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.appointment_date?.slice(0, 10)} · {a.appointment_time?.slice(0, 5)} · {a.reason ?? 'No reason'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Visit date</label>
            <input
              type="date"
              required
              className="form-input"
              value={form.visit_date}
              onChange={(e) => setForm({ ...form, visit_date: e.target.value })}
            />
          </div>

          <div>
            <label className="form-label">Chief complaint</label>
            <input
              type="text"
              className="form-input"
              placeholder="Patient's main concern"
              value={form.chief_complaint}
              onChange={(e) => setForm({ ...form, chief_complaint: e.target.value })}
            />
          </div>

          <div>
            <label className="form-label">Diagnosis</label>
            <textarea
              rows={2}
              className="form-input"
              value={form.diagnosis}
              onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
            />
          </div>

          <div>
            <label className="form-label">Treatment plan</label>
            <textarea
              rows={3}
              className="form-input"
              value={form.treatment_plan}
              onChange={(e) => setForm({ ...form, treatment_plan: e.target.value })}
            />
          </div>

          <div>
            <label className="form-label">Notes</label>
            <textarea
              rows={2}
              className="form-input"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div>
            <label className="form-label">Follow-up date <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="date"
              className="form-input"
              value={form.follow_up_date}
              onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })}
            />
          </div>

          {formError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Update' : 'Create record'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-gray-900 whitespace-pre-wrap">{value}</p>
    </div>
  )
}
