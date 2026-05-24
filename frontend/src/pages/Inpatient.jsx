import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Modal from '../components/common/Modal'
import {
  getWards, createWard, updateWard, deleteWard,
  getBeds, createBed, deleteBed,
  getAdmissions, createAdmission, updateAdmission,
  getDischarges, createDischarge,
  getAdmissionPrescriptions, getAdmissionLabOrders,
} from '../api/inpatient'
import { createPrescription } from '../api/prescriptions'
import { createLabOrder } from '../api/labOrders'
import { getDoctors } from '../api/doctors'
import { getPatients } from '../api/patients'
import { getMedicalRecords } from '../api/medicalRecords'
import { createAppointment } from '../api/appointments'

const WARD_TYPES = ['General', 'ICU', 'Maternity', 'Pediatric', 'Surgical', 'Emergency']

const STATUS_BADGE = {
  Admitted:    'bg-green-100 text-green-700',
  Transferred: 'bg-blue-100 text-blue-700',
  Discharged:  'bg-gray-100 text-gray-500',
}

const RX_STATUS_BADGE = {
  'Created':          'bg-gray-100 text-gray-600',
  'Sent to Pharmacy': 'bg-amber-100 text-amber-700',
  'Dispensed':        'bg-green-100 text-green-700',
  'Cancelled':        'bg-red-100 text-red-600',
}

const LAB_STATUS_BADGE = {
  'Ordered':          'bg-gray-100 text-gray-600',
  'Sample Collected': 'bg-blue-100 text-blue-700',
  'Processing':       'bg-amber-100 text-amber-700',
  'Completed':        'bg-green-100 text-green-700',
  'Cancelled':        'bg-red-100 text-red-600',
}

const TABS = [
  { id: 'admissions', label: 'Active Admissions' },
  { id: 'wards',      label: 'Wards & Beds' },
  { id: 'discharged', label: 'Discharge History' },
]

export default function Inpatient() {
  const { user } = useAuth()
  const isAdmin   = user?.role === 'admin'
  const isDoctor  = user?.role === 'doctor'
  const canAdmit  = isAdmin || isDoctor
  const canManage = isAdmin
  const canOrder  = isAdmin || isDoctor

  const [tab, setTab]               = useState('admissions')
  const [wards, setWards]           = useState([])
  const [beds, setBeds]             = useState([])
  const [admissions, setAdmissions] = useState([])
  const [discharges, setDischarges] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')

  // Ward modal
  const [showWardForm, setShowWardForm] = useState(false)
  const [editingWard, setEditingWard]   = useState(null)
  const [wardForm, setWardForm]         = useState({ ward_name: '', ward_type: 'General' })
  const [wardSaving, setWardSaving]     = useState(false)
  const [wardError, setWardError]       = useState('')

  // Bed modal
  const [showBedForm, setShowBedForm] = useState(false)
  const [bedFormWard, setBedFormWard] = useState(null)
  const [bedNumber, setBedNumber]     = useState('')
  const [bedSaving, setBedSaving]     = useState(false)
  const [bedError, setBedError]       = useState('')

  // Admit modal
  const [showAdmit, setShowAdmit]             = useState(false)
  const [admitPatients, setAdmitPatients]     = useState([])
  const [admitRecords, setAdmitRecords]       = useState([])
  const [admitLoadingRec, setAdmitLoadingRec] = useState(false)
  const [admitForm, setAdmitForm]             = useState({
    patient_id: '', record_id: '', ward_id: '', bed_id: '', inpatient_monitoring_notes: '',
  })
  const [admitSaving, setAdmitSaving] = useState(false)
  const [admitError, setAdmitError]   = useState('')

  // Notes modal
  const [notesTarget, setNotesTarget] = useState(null)
  const [notesText, setNotesText]     = useState('')
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesError, setNotesError]   = useState('')

  // Discharge modal
  const [dischargeTarget, setDischargeTarget] = useState(null)
  const [dischargeForm, setDischargeForm]     = useState({ discharge_summary: '', follow_up_plan: '' })
  const [dischargeSaving, setDischargeSaving] = useState(false)
  const [dischargeError, setDischargeError]   = useState('')

  // Orders modal (per admission)
  const [ordersAdm, setOrdersAdm]             = useState(null)
  const [admRx, setAdmRx]                     = useState([])
  const [admLab, setAdmLab]                   = useState([])
  const [ordersLoading, setOrdersLoading]     = useState(false)
  // Add-prescription inline form
  const [showRxForm, setShowRxForm]           = useState(false)
  const [rxForm, setRxForm]                   = useState({ medication_name: '', dosage: '', instructions: '' })
  const [rxSaving, setRxSaving]               = useState(false)
  const [rxError, setRxError]                 = useState('')
  // Add-lab-order inline form
  const [showLabForm, setShowLabForm]         = useState(false)
  const [labTestName, setLabTestName]         = useState('')
  const [labSaving, setLabSaving]             = useState(false)
  const [labError, setLabError]               = useState('')

  // Follow-up booking modal (from Discharge History tab)
  const [followUpDisch, setFollowUpDisch]     = useState(null)
  const [doctors, setDoctors]                 = useState([])
  const [followUpForm, setFollowUpForm]       = useState({ doctor_id: '', appointment_datetime: '', reason: '' })
  const [followUpSaving, setFollowUpSaving]   = useState(false)
  const [followUpError, setFollowUpError]     = useState('')
  const [followUpDone, setFollowUpDone]       = useState(false)

  useEffect(() => {
    Promise.all([getWards(), getBeds(), getAdmissions(), getDischarges()])
      .then(([w, b, a, d]) => {
        setWards(w.data)
        setBeds(b.data)
        setAdmissions(a.data)
        setDischarges(d.data)
      })
      .catch(() => setError('Failed to load inpatient data.'))
      .finally(() => setLoading(false))
  }, [])

  // ── Ward handlers ──────────────────────────────────────────────────────────
  function openAddWard() {
    setEditingWard(null)
    setWardForm({ ward_name: '', ward_type: 'General' })
    setWardError('')
    setShowWardForm(true)
  }
  function openEditWard(ward) {
    setEditingWard(ward)
    setWardForm({ ward_name: ward.ward_name, ward_type: ward.ward_type })
    setWardError('')
    setShowWardForm(true)
  }
  async function handleWardSubmit(e) {
    e.preventDefault()
    setWardSaving(true); setWardError('')
    try {
      if (editingWard) {
        const res = await updateWard(editingWard.ward_id, wardForm)
        setWards(prev => prev.map(w => w.ward_id === editingWard.ward_id ? res.data : w))
      } else {
        const res = await createWard(wardForm)
        setWards(prev => [...prev, res.data])
      }
      setShowWardForm(false)
    } catch (err) {
      setWardError(err.response?.data?.message ?? 'Failed to save ward.')
    } finally { setWardSaving(false) }
  }
  async function handleDeleteWard(ward) {
    if (!window.confirm(`Delete ward "${ward.ward_name}"? Remove all its beds first.`)) return
    try {
      await deleteWard(ward.ward_id)
      setWards(prev => prev.filter(w => w.ward_id !== ward.ward_id))
    } catch (err) { setError(err.response?.data?.message ?? 'Failed to delete ward.') }
  }

  // ── Bed handlers ───────────────────────────────────────────────────────────
  function openAddBed(ward) {
    setBedFormWard(ward); setBedNumber(''); setBedError(''); setShowBedForm(true)
  }
  async function handleBedSubmit(e) {
    e.preventDefault()
    setBedSaving(true); setBedError('')
    try {
      const res = await createBed({ ward_id: bedFormWard.ward_id, bed_number: bedNumber })
      setBeds(prev => [...prev, { ...res.data, ward_name: bedFormWard.ward_name }])
      setShowBedForm(false)
    } catch (err) {
      setBedError(err.response?.data?.message ?? 'Failed to add bed.')
    } finally { setBedSaving(false) }
  }
  async function handleDeleteBed(bed) {
    if (bed.is_occupied) { setError('Cannot remove an occupied bed.'); return }
    if (!window.confirm(`Remove bed ${bed.bed_number}?`)) return
    try {
      await deleteBed(bed.bed_id)
      setBeds(prev => prev.filter(b => b.bed_id !== bed.bed_id))
    } catch (err) { setError(err.response?.data?.message ?? 'Failed to remove bed.') }
  }

  // ── Admit handlers ─────────────────────────────────────────────────────────
  async function openAdmit() {
    setAdmitForm({ patient_id: '', record_id: '', ward_id: '', bed_id: '', inpatient_monitoring_notes: '' })
    setAdmitRecords([]); setAdmitError('')
    try {
      const res = await getPatients()
      setAdmitPatients(res.data)
    } catch { setAdmitPatients([]) }
    setShowAdmit(true)
  }
  async function handleAdmitPatientChange(patient_id) {
    setAdmitForm(f => ({ ...f, patient_id, record_id: '' }))
    if (!patient_id) { setAdmitRecords([]); return }
    setAdmitLoadingRec(true)
    try {
      const res = await getMedicalRecords()
      setAdmitRecords(res.data.filter(r => String(r.patient_id) === String(patient_id)))
    } catch { setAdmitRecords([]) }
    finally { setAdmitLoadingRec(false) }
  }
  const admitAvailableBeds = beds.filter(b =>
    String(b.ward_id) === String(admitForm.ward_id) && !b.is_occupied
  )
  async function handleAdmit(e) {
    e.preventDefault()
    setAdmitSaving(true); setAdmitError('')
    try {
      await createAdmission({
        record_id:                  Number(admitForm.record_id),
        bed_id:                     Number(admitForm.bed_id),
        inpatient_monitoring_notes: admitForm.inpatient_monitoring_notes || null,
      })
      const [admRes, bedRes] = await Promise.all([getAdmissions(), getBeds()])
      setAdmissions(admRes.data); setBeds(bedRes.data)
      setShowAdmit(false)
    } catch (err) {
      setAdmitError(err.response?.data?.message ?? 'Failed to admit patient.')
    } finally { setAdmitSaving(false) }
  }

  // ── Notes handlers ─────────────────────────────────────────────────────────
  function openNotes(adm) {
    setNotesTarget(adm); setNotesText(adm.inpatient_monitoring_notes ?? ''); setNotesError('')
  }
  async function handleSaveNotes(e) {
    e.preventDefault()
    setNotesSaving(true); setNotesError('')
    try {
      await updateAdmission(notesTarget.admission_id, {
        bed_id: notesTarget.bed_id,
        inpatient_monitoring_notes: notesText,
        status: notesTarget.status,
      })
      setAdmissions(prev =>
        prev.map(a => a.admission_id === notesTarget.admission_id
          ? { ...a, inpatient_monitoring_notes: notesText } : a
        )
      )
      setNotesTarget(null)
    } catch (err) {
      setNotesError(err.response?.data?.message ?? 'Failed to save notes.')
    } finally { setNotesSaving(false) }
  }

  // ── Discharge handlers ─────────────────────────────────────────────────────
  function openDischarge(adm) {
    setDischargeTarget(adm)
    setDischargeForm({ discharge_summary: '', follow_up_plan: '' })
    setDischargeError('')
  }
  async function handleDischarge(e) {
    e.preventDefault()
    setDischargeSaving(true); setDischargeError('')
    try {
      const res = await createDischarge({
        admission_id:      dischargeTarget.admission_id,
        discharge_summary: dischargeForm.discharge_summary,
        follow_up_plan:    dischargeForm.follow_up_plan || null,
      })
      setAdmissions(prev => prev.filter(a => a.admission_id !== dischargeTarget.admission_id))
      setDischarges(prev => [res.data, ...prev])
      const bedRes = await getBeds()
      setBeds(bedRes.data)
      setDischargeTarget(null)
    } catch (err) {
      setDischargeError(err.response?.data?.message ?? 'Failed to discharge patient.')
    } finally { setDischargeSaving(false) }
  }

  // ── Orders modal handlers ──────────────────────────────────────────────────
  async function openOrders(adm) {
    setOrdersAdm(adm)
    setAdmRx([]); setAdmLab([])
    setShowRxForm(false); setShowLabForm(false)
    setRxForm({ medication_name: '', dosage: '', instructions: '' })
    setLabTestName('')
    setOrdersLoading(true)
    try {
      const [rxRes, labRes] = await Promise.all([
        getAdmissionPrescriptions(adm.admission_id),
        getAdmissionLabOrders(adm.admission_id),
      ])
      setAdmRx(rxRes.data)
      setAdmLab(labRes.data)
    } catch { /* show empty lists */ }
    finally { setOrdersLoading(false) }
  }

  async function handleAddRx(e) {
    e.preventDefault()
    setRxSaving(true); setRxError('')
    try {
      const res = await createPrescription({
        admission_id:    ordersAdm.admission_id,
        medication_name: rxForm.medication_name,
        dosage:          rxForm.dosage,
        instructions:    rxForm.instructions || null,
      })
      setAdmRx(prev => [...prev, res.data])
      setShowRxForm(false)
      setRxForm({ medication_name: '', dosage: '', instructions: '' })
    } catch (err) {
      setRxError(err.response?.data?.message ?? 'Failed to add prescription.')
    } finally { setRxSaving(false) }
  }

  async function handleAddLab(e) {
    e.preventDefault()
    setLabSaving(true); setLabError('')
    try {
      const res = await createLabOrder({ admission_id: ordersAdm.admission_id, test_name: labTestName })
      setAdmLab(prev => [...prev, res.data])
      setShowLabForm(false)
      setLabTestName('')
    } catch (err) {
      setLabError(err.response?.data?.message ?? 'Failed to add lab order.')
    } finally { setLabSaving(false) }
  }

  // ── Follow-up booking handlers ─────────────────────────────────────────────
  async function openFollowUp(disch) {
    setFollowUpDisch(disch)
    setFollowUpForm({
      doctor_id: '',
      appointment_datetime: '',
      reason: disch.follow_up_plan || '',
    })
    setFollowUpError(''); setFollowUpDone(false)
    if (!doctors.length) {
      try {
        const res = await getDoctors()
        setDoctors(res.data)
      } catch { setDoctors([]) }
    }
  }
  async function handleFollowUp(e) {
    e.preventDefault()
    setFollowUpSaving(true); setFollowUpError('')
    try {
      await createAppointment({
        patient_id:           followUpDisch.patient_id,
        doctor_id:            Number(followUpForm.doctor_id),
        appointment_datetime: followUpForm.appointment_datetime,
        reason:               followUpForm.reason || null,
      })
      setFollowUpDone(true)
    } catch (err) {
      setFollowUpError(err.response?.data?.message ?? 'Failed to book appointment.')
    } finally { setFollowUpSaving(false) }
  }

  // ── Computed ───────────────────────────────────────────────────────────────
  const activeAdmissions = admissions.filter(a => a.status !== 'Discharged')
  const totalBeds        = beds.length
  const occupiedBeds     = beds.filter(b => b.is_occupied).length

  if (loading) return <p className="text-gray-500">Loading…</p>

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inpatient</h1>
          <p className="text-sm text-gray-500 mt-0.5">{occupiedBeds} / {totalBeds} beds occupied</p>
        </div>
        {canAdmit && (
          <button onClick={openAdmit} className="btn-primary">+ Admit Patient</button>
        )}
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-purple-700 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.id === 'admissions' && activeAdmissions.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">
                {activeAdmissions.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Active Admissions ── */}
      {tab === 'admissions' && (
        <div className="card overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Patient', 'Ward / Bed', 'Admitted', 'Status', 'Monitoring Notes', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeAdmissions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No active admissions.{canAdmit && ' Use "Admit Patient" to admit someone.'}
                  </td>
                </tr>
              )}
              {activeAdmissions.map(adm => (
                <tr key={adm.admission_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {adm.patient_first_name} {adm.patient_last_name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{adm.ward_name} · Bed {adm.bed_number}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(adm.admission_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[adm.status]}`}>
                      {adm.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs">
                    <span className="block truncate">
                      {adm.inpatient_monitoring_notes || <span className="italic text-gray-300">None</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex gap-3">
                      <button
                        onClick={() => openOrders(adm)}
                        className="text-purple-600 hover:text-purple-800 text-xs font-medium"
                      >
                        Orders
                      </button>
                      <button
                        onClick={() => openNotes(adm)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        Notes
                      </button>
                      {canAdmit && (
                        <button
                          onClick={() => openDischarge(adm)}
                          className="text-red-500 hover:text-red-700 text-xs font-medium"
                        >
                          Discharge
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Tab: Wards & Beds ── */}
      {tab === 'wards' && (
        <div>
          {canManage && (
            <div className="mb-4 flex justify-end">
              <button onClick={openAddWard} className="btn-primary">+ Add Ward</button>
            </div>
          )}
          {wards.length === 0 && (
            <div className="card p-10 text-center text-gray-400">
              No wards configured yet.{canManage && ' Click "Add Ward" to create one.'}
            </div>
          )}
          <div className="space-y-4">
            {wards.map(ward => {
              const wardBeds = beds.filter(b => b.ward_id === ward.ward_id)
              const occ      = wardBeds.filter(b => b.is_occupied).length
              return (
                <div key={ward.ward_id} className="card">
                  <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">{ward.ward_name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                        {ward.ward_type}
                      </span>
                      <span className="text-sm text-gray-500">{occ} / {wardBeds.length} occupied</span>
                    </div>
                    {canManage && (
                      <div className="flex gap-3">
                        <button onClick={() => openAddBed(ward)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Add Bed</button>
                        <button onClick={() => openEditWard(ward)} className="text-xs text-gray-500 hover:text-gray-700 font-medium">Edit</button>
                        <button onClick={() => handleDeleteWard(ward)} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
                      </div>
                    )}
                  </div>
                  <div className="px-4 py-3">
                    {wardBeds.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No beds added yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {wardBeds.map(bed => (
                          <div key={bed.bed_id} className="flex items-center gap-1">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                              bed.is_occupied
                                ? 'bg-red-50 border-red-200 text-red-700'
                                : 'bg-green-50 border-green-200 text-green-700'
                            }`}>
                              Bed {bed.bed_number}
                              <span className="opacity-50">{bed.is_occupied ? '●' : '○'}</span>
                            </span>
                            {canManage && !bed.is_occupied && (
                              <button
                                onClick={() => handleDeleteBed(bed)}
                                className="text-gray-300 hover:text-red-500 text-sm leading-none font-medium"
                                title="Remove bed"
                              >×</button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Tab: Discharge History ── */}
      {tab === 'discharged' && (
        <div className="card overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Patient', 'Ward / Bed', 'Admitted', 'Discharged', 'Discharge Summary', 'Follow-up', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {discharges.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No discharge records yet.</td></tr>
              )}
              {discharges.map(d => (
                <tr key={d.discharge_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{d.patient_first_name} {d.patient_last_name}</td>
                  <td className="px-4 py-3 text-gray-600">{d.ward_name} · Bed {d.bed_number}</td>
                  <td className="px-4 py-3 text-gray-500">{d.admission_date ? new Date(d.admission_date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(d.discharge_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs"><span className="block truncate">{d.discharge_summary}</span></td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs">
                    <span className="block truncate">
                      {d.follow_up_plan || <span className="italic text-gray-300">None</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {canAdmit && d.patient_id && (
                      <button
                        onClick={() => openFollowUp(d)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        Book Follow-up
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Ward form modal ── */}
      <Modal open={showWardForm} onClose={() => setShowWardForm(false)} title={editingWard ? 'Edit Ward' : 'Add Ward'} size="sm">
        <form onSubmit={handleWardSubmit} className="space-y-4">
          <div>
            <label className="form-label">Ward name</label>
            <input type="text" required className="form-input" placeholder="e.g. Male General Ward"
              value={wardForm.ward_name} onChange={e => setWardForm({ ...wardForm, ward_name: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Ward type</label>
            <select className="form-select" value={wardForm.ward_type} onChange={e => setWardForm({ ...wardForm, ward_type: e.target.value })}>
              {WARD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {wardError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{wardError}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" className="btn-secondary" onClick={() => setShowWardForm(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={wardSaving}>{wardSaving ? 'Saving…' : editingWard ? 'Update' : 'Add Ward'}</button>
          </div>
        </form>
      </Modal>

      {/* ── Bed form modal ── */}
      <Modal open={showBedForm} onClose={() => setShowBedForm(false)} title={`Add Bed — ${bedFormWard?.ward_name ?? ''}`} size="sm">
        <form onSubmit={handleBedSubmit} className="space-y-4">
          <div>
            <label className="form-label">Bed number / label</label>
            <input type="text" required className="form-input" placeholder="e.g. A1, 12, ICU-3"
              value={bedNumber} onChange={e => setBedNumber(e.target.value)} />
          </div>
          {bedError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{bedError}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" className="btn-secondary" onClick={() => setShowBedForm(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={bedSaving}>{bedSaving ? 'Saving…' : 'Add Bed'}</button>
          </div>
        </form>
      </Modal>

      {/* ── Admit Patient modal ── */}
      <Modal open={showAdmit} onClose={() => setShowAdmit(false)} title="Admit Patient" size="md">
        <form onSubmit={handleAdmit} className="space-y-4">
          <div>
            <label className="form-label">Patient</label>
            <select required className="form-select" value={admitForm.patient_id}
              onChange={e => handleAdmitPatientChange(e.target.value)}>
              <option value="">Select patient…</option>
              {admitPatients.map(p => (
                <option key={p.patient_id} value={p.patient_id}>{p.first_name} {p.last_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Medical record</label>
            <select required className="form-select" value={admitForm.record_id}
              onChange={e => setAdmitForm(f => ({ ...f, record_id: e.target.value }))}
              disabled={!admitForm.patient_id || admitLoadingRec}>
              <option value="">
                {admitLoadingRec ? 'Loading…' : admitForm.patient_id
                  ? admitRecords.length ? 'Select record…' : 'No records found'
                  : 'Select a patient first'}
              </option>
              {admitRecords.map(r => (
                <option key={r.record_id} value={r.record_id}>
                  {new Date(r.appointment_datetime).toLocaleDateString()} — {r.diagnosis || r.consultation_notes?.slice(0, 50) || 'No notes'}
                </option>
              ))}
            </select>
            {admitForm.patient_id && !admitLoadingRec && admitRecords.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No medical records for this patient. A record must exist before admission.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Ward</label>
              <select required className="form-select" value={admitForm.ward_id}
                onChange={e => setAdmitForm(f => ({ ...f, ward_id: e.target.value, bed_id: '' }))}>
                <option value="">Select ward…</option>
                {wards.map(w => <option key={w.ward_id} value={w.ward_id}>{w.ward_name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Bed</label>
              <select required className="form-select" value={admitForm.bed_id}
                onChange={e => setAdmitForm(f => ({ ...f, bed_id: e.target.value }))}
                disabled={!admitForm.ward_id}>
                <option value="">{admitForm.ward_id ? 'Select bed…' : 'Select ward first'}</option>
                {admitAvailableBeds.map(b => (
                  <option key={b.bed_id} value={b.bed_id}>Bed {b.bed_number}</option>
                ))}
              </select>
              {admitForm.ward_id && admitAvailableBeds.length === 0 && (
                <p className="text-xs text-red-600 mt-1">No available beds in this ward.</p>
              )}
            </div>
          </div>
          <div>
            <label className="form-label">Initial monitoring notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea rows={3} className="form-input resize-none" placeholder="Vital signs, initial observations, reason for admission…"
              value={admitForm.inpatient_monitoring_notes}
              onChange={e => setAdmitForm(f => ({ ...f, inpatient_monitoring_notes: e.target.value }))} />
          </div>
          {admitError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{admitError}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" className="btn-secondary" onClick={() => setShowAdmit(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={admitSaving}>{admitSaving ? 'Admitting…' : 'Admit Patient'}</button>
          </div>
        </form>
      </Modal>

      {/* ── Monitoring Notes modal ── */}
      <Modal open={!!notesTarget} onClose={() => setNotesTarget(null)} title="Update Monitoring Notes" size="md">
        {notesTarget && (
          <form onSubmit={handleSaveNotes} className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="font-medium text-gray-900">{notesTarget.patient_first_name} {notesTarget.patient_last_name}</p>
              <p className="text-gray-500">{notesTarget.ward_name} · Bed {notesTarget.bed_number}</p>
            </div>
            <div>
              <label className="form-label">Monitoring notes</label>
              <textarea rows={6} className="form-input resize-none"
                placeholder="Vital signs, observations, medication given, treatment updates…"
                value={notesText} onChange={e => setNotesText(e.target.value)} />
            </div>
            {notesError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{notesError}</p>}
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" className="btn-secondary" onClick={() => setNotesTarget(null)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={notesSaving}>{notesSaving ? 'Saving…' : 'Save Notes'}</button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Discharge modal ── */}
      <Modal open={!!dischargeTarget} onClose={() => setDischargeTarget(null)} title="Discharge Patient" size="md">
        {dischargeTarget && (
          <form onSubmit={handleDischarge} className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="font-medium text-gray-900">{dischargeTarget.patient_first_name} {dischargeTarget.patient_last_name}</p>
              <p className="text-gray-500">{dischargeTarget.ward_name} · Bed {dischargeTarget.bed_number} · Admitted {new Date(dischargeTarget.admission_date).toLocaleDateString()}</p>
            </div>
            <div>
              <label className="form-label">Discharge summary <span className="text-red-500">*</span></label>
              <textarea rows={4} required className="form-input resize-none"
                placeholder="Final diagnosis, treatment given, clinical summary…"
                value={dischargeForm.discharge_summary}
                onChange={e => setDischargeForm(f => ({ ...f, discharge_summary: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Follow-up plan <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea rows={3} className="form-input resize-none"
                placeholder="Medications to continue, follow-up appointment, referrals…"
                value={dischargeForm.follow_up_plan}
                onChange={e => setDischargeForm(f => ({ ...f, follow_up_plan: e.target.value }))} />
            </div>
            {dischargeError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{dischargeError}</p>}
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" className="btn-secondary" onClick={() => setDischargeTarget(null)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={dischargeSaving}>{dischargeSaving ? 'Discharging…' : 'Discharge Patient'}</button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Admission Orders modal ── */}
      <Modal open={!!ordersAdm} onClose={() => setOrdersAdm(null)} title="Inpatient Orders" size="lg">
        {ordersAdm && (
          <div className="space-y-5">
            {/* Patient context */}
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="font-medium text-gray-900">{ordersAdm.patient_first_name} {ordersAdm.patient_last_name}</p>
              <p className="text-gray-500">{ordersAdm.ward_name} · Bed {ordersAdm.bed_number} · Admitted {new Date(ordersAdm.admission_date).toLocaleDateString()}</p>
            </div>

            {ordersLoading && <p className="text-sm text-gray-400">Loading orders…</p>}

            {!ordersLoading && (
              <>
                {/* ── Prescriptions ── */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700">Prescriptions</h3>
                    {canOrder && !showRxForm && (
                      <button onClick={() => { setShowRxForm(true); setRxError('') }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                        + Add
                      </button>
                    )}
                  </div>

                  {showRxForm && (
                    <form onSubmit={handleAddRx} className="mb-3 p-3 bg-blue-50 rounded-lg space-y-3 border border-blue-100">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="form-label text-xs">Medication name</label>
                          <input required className="form-input text-sm" placeholder="e.g. Amoxicillin 500mg"
                            value={rxForm.medication_name}
                            onChange={e => setRxForm(f => ({ ...f, medication_name: e.target.value }))} />
                        </div>
                        <div>
                          <label className="form-label text-xs">Dosage</label>
                          <input required className="form-input text-sm" placeholder="e.g. 1 tablet 3×/day"
                            value={rxForm.dosage}
                            onChange={e => setRxForm(f => ({ ...f, dosage: e.target.value }))} />
                        </div>
                      </div>
                      <div>
                        <label className="form-label text-xs">Instructions <span className="text-gray-400 font-normal">(optional)</span></label>
                        <input className="form-input text-sm" placeholder="After meals, with water…"
                          value={rxForm.instructions}
                          onChange={e => setRxForm(f => ({ ...f, instructions: e.target.value }))} />
                      </div>
                      {rxError && <p className="text-xs text-red-600">{rxError}</p>}
                      <div className="flex gap-2">
                        <button type="submit" className="btn-primary text-xs py-1.5 px-3" disabled={rxSaving}>
                          {rxSaving ? 'Adding…' : 'Add'}
                        </button>
                        <button type="button" className="btn-secondary text-xs py-1.5 px-3" onClick={() => setShowRxForm(false)}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {admRx.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No prescriptions yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {admRx.map(rx => (
                        <div key={rx.prescription_id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-gray-50">
                          <div>
                            <span className="font-medium text-gray-800">{rx.medication_name}</span>
                            <span className="text-gray-400 mx-1.5">·</span>
                            <span className="text-gray-600">{rx.dosage}</span>
                            {rx.instructions && <span className="text-gray-400 ml-2 text-xs">{rx.instructions}</span>}
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${RX_STATUS_BADGE[rx.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {rx.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100" />

                {/* ── Lab Orders ── */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700">Lab Orders</h3>
                    {canOrder && !showLabForm && (
                      <button onClick={() => { setShowLabForm(true); setLabError('') }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                        + Add
                      </button>
                    )}
                  </div>

                  {showLabForm && (
                    <form onSubmit={handleAddLab} className="mb-3 p-3 bg-blue-50 rounded-lg space-y-3 border border-blue-100">
                      <div>
                        <label className="form-label text-xs">Test name</label>
                        <input required className="form-input text-sm" placeholder="e.g. Full Blood Count, Malaria RDT"
                          value={labTestName} onChange={e => setLabTestName(e.target.value)} />
                      </div>
                      {labError && <p className="text-xs text-red-600">{labError}</p>}
                      <div className="flex gap-2">
                        <button type="submit" className="btn-primary text-xs py-1.5 px-3" disabled={labSaving}>
                          {labSaving ? 'Adding…' : 'Add'}
                        </button>
                        <button type="button" className="btn-secondary text-xs py-1.5 px-3" onClick={() => setShowLabForm(false)}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {admLab.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No lab orders yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {admLab.map(lo => (
                        <div key={lo.lab_order_id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-gray-50">
                          <span className="font-medium text-gray-800">{lo.test_name}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${LAB_STATUS_BADGE[lo.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {lo.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="flex justify-end pt-1">
              <button className="btn-secondary" onClick={() => setOrdersAdm(null)}>Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Follow-up Appointment modal ── */}
      <Modal open={!!followUpDisch} onClose={() => setFollowUpDisch(null)} title="Book Follow-up Appointment" size="md">
        {followUpDisch && (
          followUpDone ? (
            <div className="text-center py-6 space-y-3">
              <p className="text-3xl">✓</p>
              <p className="font-medium text-gray-900">Appointment booked</p>
              <p className="text-sm text-gray-500">
                Follow-up appointment for {followUpDisch.patient_first_name} {followUpDisch.patient_last_name} has been scheduled.
              </p>
              <button className="btn-primary mt-2" onClick={() => setFollowUpDisch(null)}>Done</button>
            </div>
          ) : (
            <form onSubmit={handleFollowUp} className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-gray-900">{followUpDisch.patient_first_name} {followUpDisch.patient_last_name}</p>
                <p className="text-gray-500">Discharged {new Date(followUpDisch.discharge_date).toLocaleDateString()}</p>
              </div>

              <div>
                <label className="form-label">Doctor</label>
                <select required className="form-select" value={followUpForm.doctor_id}
                  onChange={e => setFollowUpForm(f => ({ ...f, doctor_id: e.target.value }))}>
                  <option value="">Select doctor…</option>
                  {doctors.map(d => (
                    <option key={d.doctor_id} value={d.doctor_id}>
                      Dr. {d.first_name} {d.last_name}{d.specialty ? ` — ${d.specialty}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Appointment date & time</label>
                <input type="datetime-local" required className="form-input"
                  value={followUpForm.appointment_datetime}
                  onChange={e => setFollowUpForm(f => ({ ...f, appointment_datetime: e.target.value }))} />
              </div>

              <div>
                <label className="form-label">Reason / follow-up plan</label>
                <textarea rows={3} className="form-input resize-none"
                  placeholder="Reason for follow-up…"
                  value={followUpForm.reason}
                  onChange={e => setFollowUpForm(f => ({ ...f, reason: e.target.value }))} />
              </div>

              {followUpError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{followUpError}</p>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button type="button" className="btn-secondary" onClick={() => setFollowUpDisch(null)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={followUpSaving}>
                  {followUpSaving ? 'Booking…' : 'Book Appointment'}
                </button>
              </div>
            </form>
          )
        )}
      </Modal>
    </div>
  )
}
