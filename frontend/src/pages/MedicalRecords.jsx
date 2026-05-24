import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getMedicalRecords,
  createMedicalRecord,
  updateMedicalRecord,
} from '../api/medicalRecords'
import { getPatients }    from '../api/patients'
import { getAppointments } from '../api/appointments'
import { getLabOrders, createLabOrder }       from '../api/labOrders'
import { getPrescriptions, createPrescription } from '../api/prescriptions'
import Modal from '../components/common/Modal'

const EMPTY_FORM = {
  patient_id:         '',
  appointment_id:     '',
  consultation_notes: '',
  diagnosis:          '',
}

const EMPTY_ORDER_FORM = { test_name: '' }
const EMPTY_RX_FORM    = { medication_name: '', dosage: '', instructions: '', status: 'Created' }

const ORDER_STATUS_BADGE = {
  'Ordered':          'bg-gray-100 text-gray-600',
  'Sample Collected': 'bg-blue-100 text-blue-700',
  'Processing':       'bg-amber-100 text-amber-700',
  'Completed':        'bg-green-100 text-green-700',
  'Cancelled':        'bg-red-100 text-red-600',
}
const RX_STATUS_BADGE = {
  'Created':          'bg-gray-100 text-gray-600',
  'Sent to Pharmacy': 'bg-amber-100 text-amber-700',
  'Dispensed':        'bg-green-100 text-green-700',
  'Cancelled':        'bg-red-100 text-red-600',
}

export default function MedicalRecords() {
  const { user }   = useAuth()
  const canCreate  = ['admin', 'doctor'].includes(user?.role)

  const [records,      setRecords]      = useState([])
  const [patients,     setPatients]     = useState([])
  const [appointments, setAppointments] = useState([])
  const [labOrders,    setLabOrders]    = useState([])
  const [prescriptions,setPrescriptions]= useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')

  const [showModal,  setShowModal]  = useState(false)
  const [editing,    setEditing]    = useState(null)
  const [showDetail, setShowDetail] = useState(null)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [saving,     setSaving]     = useState(false)
  const [formError,  setFormError]  = useState('')
  const [search,     setSearch]     = useState('')

  // Inline order form inside detail modal
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [orderForm,     setOrderForm]     = useState(EMPTY_ORDER_FORM)
  const [orderSaving,   setOrderSaving]   = useState(false)
  const [orderError,    setOrderError]    = useState('')

  // Inline prescription form inside detail modal
  const [showRxForm, setShowRxForm] = useState(false)
  const [rxForm,     setRxForm]     = useState(EMPTY_RX_FORM)
  const [rxSaving,   setRxSaving]   = useState(false)
  const [rxError,    setRxError]    = useState('')

  useEffect(() => {
    const base = [getMedicalRecords(), getLabOrders(), getPrescriptions()]
    const extra = canCreate
      ? [getPatients(), getAppointments()]
      : [Promise.resolve({ data: [] }), Promise.resolve({ data: [] })]

    Promise.all([...base, ...extra])
      .then(([recs, orders, rxs, pats, appts]) => {
        setRecords(recs.data)
        setLabOrders(orders.data)
        setPrescriptions(rxs.data)
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
      patient_id:         rec.patient_id ?? '',
      appointment_id:     rec.appointment_id ?? '',
      consultation_notes: rec.consultation_notes ?? '',
      diagnosis:          rec.diagnosis ?? '',
    })
    setFormError('')
    setShowModal(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      if (editing) {
        const payload = {
          consultation_notes: form.consultation_notes,
          diagnosis:          form.diagnosis,
        }
        const res = await updateMedicalRecord(editing.record_id, payload)
        setRecords((prev) => prev.map((r) => r.record_id === editing.record_id ? res.data : r))
        setShowModal(false)
      } else {
        const payload = {
          appointment_id:     form.appointment_id,
          consultation_notes: form.consultation_notes,
          diagnosis:          form.diagnosis,
        }
        const res = await createMedicalRecord(payload)
        setRecords((prev) => [res.data, ...prev])
        setShowModal(false)
        // Auto-open detail view so doctor can immediately order tests / prescriptions
        setShowDetail(res.data)
        setShowOrderForm(false)
        setShowRxForm(false)
      }
    } catch (err) {
      setFormError(err.response?.data?.message ?? 'Failed to save record.')
    } finally {
      setSaving(false)
    }
  }

  function openDetail(rec) {
    setShowDetail(rec)
    setShowOrderForm(false)
    setShowRxForm(false)
  }

  async function handleCreateOrder(e) {
    e.preventDefault()
    setOrderError('')
    setOrderSaving(true)
    try {
      const res = await createLabOrder({ record_id: showDetail.record_id, test_name: orderForm.test_name })
      setLabOrders((prev) => [res.data, ...prev])
      setOrderForm(EMPTY_ORDER_FORM)
      setShowOrderForm(false)
    } catch (err) {
      setOrderError(err.response?.data?.message ?? 'Failed to create lab order.')
    } finally {
      setOrderSaving(false)
    }
  }

  async function handleCreateRx(e) {
    e.preventDefault()
    setRxError('')
    setRxSaving(true)
    try {
      const res = await createPrescription({
        record_id:       showDetail.record_id,
        medication_name: rxForm.medication_name,
        dosage:          rxForm.dosage,
        instructions:    rxForm.instructions || null,
        status:          rxForm.status,
      })
      setPrescriptions((prev) => [res.data, ...prev])
      setRxForm(EMPTY_RX_FORM)
      setShowRxForm(false)
    } catch (err) {
      setRxError(err.response?.data?.message ?? 'Failed to add prescription.')
    } finally {
      setRxSaving(false)
    }
  }

  const usedAppointmentIds = new Set(records.map((r) => r.appointment_id))
  const patientAppointments = appointments.filter((a) => {
    if (form.patient_id && String(a.patient_id) !== String(form.patient_id)) return false
    if (editing && a.appointment_id === editing.appointment_id) return true
    return !usedAppointmentIds.has(a.appointment_id)
  })

  const filtered = records.filter((r) => {
    const q = search.toLowerCase()
    return (
      !q ||
      `${r.patient_first_name} ${r.patient_last_name}`.toLowerCase().includes(q) ||
      (r.diagnosis ?? '').toLowerCase().includes(q)
    )
  })

  // Orders and prescriptions scoped to the open detail record
  const detailOrders = showDetail
    ? labOrders.filter((o) => o.record_id === showDetail.record_id)
    : []
  const detailRxs = showDetail
    ? prescriptions.filter((p) => p.record_id === showDetail.record_id)
    : []

  if (loading) return <p className="text-gray-500">Loading…</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Medical Records</h1>
        {canCreate && (
          <button onClick={openCreate} className="btn-primary">+ New record</button>
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
              {['Patient', 'Doctor', 'Appointment', 'Diagnosis', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No records found.</td></tr>
            )}
            {filtered.map((r) => (
              <tr key={r.record_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{r.patient_first_name} {r.patient_last_name}</td>
                <td className="px-4 py-3 text-gray-600">
                  {r.doctor_first_name ? `Dr. ${r.doctor_first_name} ${r.doctor_last_name}` : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {r.appointment_datetime?.slice(0, 10)} {r.appointment_datetime?.slice(11, 16)}
                </td>
                <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{r.diagnosis ?? '—'}</td>
                <td className="px-4 py-3 flex gap-3">
                  <button onClick={() => openDetail(r)} className="text-gray-500 hover:text-gray-700 text-xs font-medium">View</button>
                  {canCreate && (
                    <button onClick={() => openEdit(r)} className="text-primary-600 hover:text-primary-800 text-xs font-medium">Edit</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Detail modal ─────────────────────────────────────────── */}
      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title="Medical Record" size="lg">
        {showDetail && (
          <div className="space-y-5 text-sm">

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Patient"     value={`${showDetail.patient_first_name} ${showDetail.patient_last_name}`} />
              <Field label="Doctor"      value={showDetail.doctor_first_name ? `Dr. ${showDetail.doctor_first_name} ${showDetail.doctor_last_name}` : '—'} />
              <Field label="Appointment" value={showDetail.appointment_datetime ? `${showDetail.appointment_datetime.slice(0, 10)} at ${showDetail.appointment_datetime.slice(11, 16)}` : '—'} />
              <Field label="Created"     value={showDetail.created_at?.slice(0, 10) ?? '—'} />
            </div>
            <Field label="Consultation notes" value={showDetail.consultation_notes ?? '—'} />
            <Field label="Diagnosis"          value={showDetail.diagnosis ?? '—'} />

            {/* ── Lab Orders ───────────────────────────────────────── */}
            {canCreate && (
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Lab Orders</h3>
                  {!showOrderForm && (
                    <button
                      onClick={() => { setShowOrderForm(true); setOrderForm(EMPTY_ORDER_FORM); setOrderError('') }}
                      className="text-xs font-medium text-primary-600 hover:text-primary-800"
                    >
                      + Order Lab Test
                    </button>
                  )}
                </div>

                {showOrderForm && (
                  <form onSubmit={handleCreateOrder} className="flex gap-2 mb-3 items-end">
                    <div className="flex-1">
                      <input
                        required
                        autoFocus
                        className="form-input text-sm"
                        placeholder="e.g. Full Blood Count, Chest X-Ray…"
                        value={orderForm.test_name}
                        onChange={(e) => setOrderForm({ test_name: e.target.value })}
                      />
                      {orderError && <p className="text-xs text-red-600 mt-1">{orderError}</p>}
                    </div>
                    <button type="submit" className="btn-primary text-sm" disabled={orderSaving}>
                      {orderSaving ? 'Ordering…' : 'Order'}
                    </button>
                    <button type="button" className="btn-secondary text-sm" onClick={() => setShowOrderForm(false)}>Cancel</button>
                  </form>
                )}

                {detailOrders.length === 0 && !showOrderForm && (
                  <p className="text-xs text-gray-400">No lab orders for this record.</p>
                )}
                {detailOrders.map((o) => (
                  <div key={o.lab_order_id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-gray-800">{o.test_name}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ORDER_STATUS_BADGE[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {o.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* ── Prescriptions ─────────────────────────────────────── */}
            {canCreate && (
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Prescriptions</h3>
                  {!showRxForm && (
                    <button
                      onClick={() => { setShowRxForm(true); setRxForm(EMPTY_RX_FORM); setRxError('') }}
                      className="text-xs font-medium text-primary-600 hover:text-primary-800"
                    >
                      + Add Prescription
                    </button>
                  )}
                </div>

                {showRxForm && (
                  <form onSubmit={handleCreateRx} className="space-y-2 mb-3">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        required
                        autoFocus
                        className="form-input text-sm"
                        placeholder="Medication name"
                        value={rxForm.medication_name}
                        onChange={(e) => setRxForm({ ...rxForm, medication_name: e.target.value })}
                      />
                      <input
                        required
                        className="form-input text-sm"
                        placeholder="Dosage (e.g. 500mg TDS)"
                        value={rxForm.dosage}
                        onChange={(e) => setRxForm({ ...rxForm, dosage: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        className="form-input text-sm"
                        placeholder="Instructions (optional)"
                        value={rxForm.instructions}
                        onChange={(e) => setRxForm({ ...rxForm, instructions: e.target.value })}
                      />
                      <select
                        className="form-select text-sm"
                        value={rxForm.status}
                        onChange={(e) => setRxForm({ ...rxForm, status: e.target.value })}
                      >
                        <option value="Created">Created</option>
                        <option value="Sent to Pharmacy">Sent to Pharmacy</option>
                      </select>
                    </div>
                    {rxError && <p className="text-xs text-red-600">{rxError}</p>}
                    <div className="flex gap-2">
                      <button type="submit" className="btn-primary text-sm" disabled={rxSaving}>
                        {rxSaving ? 'Adding…' : 'Add'}
                      </button>
                      <button type="button" className="btn-secondary text-sm" onClick={() => setShowRxForm(false)}>Cancel</button>
                    </div>
                  </form>
                )}

                {detailRxs.length === 0 && !showRxForm && (
                  <p className="text-xs text-gray-400">No prescriptions for this record.</p>
                )}
                {detailRxs.map((rx) => (
                  <div key={rx.prescription_id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <div>
                      <span className="font-medium text-gray-800">{rx.medication_name}</span>
                      <span className="text-gray-400 mx-1">·</span>
                      <span className="text-gray-500">{rx.dosage}</span>
                      {rx.instructions && <span className="text-gray-400 text-xs ml-2">— {rx.instructions}</span>}
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${RX_STATUS_BADGE[rx.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {rx.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Create / Edit form ───────────────────────────────────── */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Medical Record' : 'New Medical Record'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editing && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Patient</label>
                <select
                  className="form-select"
                  value={form.patient_id}
                  onChange={(e) => setForm({ ...form, patient_id: e.target.value, appointment_id: '' })}
                >
                  <option value="">All patients</option>
                  {patients.map((p) => (
                    <option key={p.patient_id} value={p.patient_id}>
                      {p.first_name} {p.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Appointment <span className="text-red-500">*</span></label>
                <select
                  required
                  className="form-select"
                  value={form.appointment_id}
                  onChange={(e) => setForm({ ...form, appointment_id: e.target.value })}
                >
                  <option value="">Select appointment…</option>
                  {patientAppointments.map((a) => (
                    <option key={a.appointment_id} value={a.appointment_id}>
                      {a.appointment_datetime?.slice(0, 10)} {a.appointment_datetime?.slice(11, 16)} · {a.patient_first_name} {a.patient_last_name} · {a.reason ?? 'No reason'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="form-label">Consultation notes</label>
            <textarea
              rows={4}
              className="form-input"
              placeholder="Clinical observations, examination findings…"
              value={form.consultation_notes}
              onChange={(e) => setForm({ ...form, consultation_notes: e.target.value })}
            />
          </div>

          <div>
            <label className="form-label">Diagnosis</label>
            <textarea
              rows={3}
              className="form-input"
              placeholder="Diagnosis or working diagnosis…"
              value={form.diagnosis}
              onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
            />
          </div>

          {formError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{formError}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
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
