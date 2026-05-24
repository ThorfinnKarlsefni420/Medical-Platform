import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getPrescriptions, updatePrescription } from '../api/prescriptions'
import { getDispensings, createDispensing } from '../api/dispensing'
import { getDrugs } from '../api/drugInventory'
import Modal from '../components/common/Modal'

const STATUS_BADGE = {
  'Created':           'bg-gray-100 text-gray-600',
  'Sent to Pharmacy':  'bg-amber-100 text-amber-700',
  'Dispensed':         'bg-green-100 text-green-700',
  'Cancelled':         'bg-red-100 text-red-600',
}

const DISPENSE_STATUS_BADGE = {
  'Stock Verified':       'bg-blue-100 text-blue-700',
  'Medication Dispensed': 'bg-green-100 text-green-700',
  'Partially Dispensed':  'bg-amber-100 text-amber-700',
}

const EMPTY_DISPENSE = { quantity_dispensed: '', status: 'Medication Dispensed' }

export default function Pharmacy() {
  const { user } = useAuth()
  const isPharmacist = user?.role === 'pharmacist'
  const isDoctor     = user?.role === 'doctor'
  const isAdmin      = user?.role === 'admin'

  const [tab, setTab]                   = useState('queue')
  const [prescriptions, setPrescriptions] = useState([])
  const [dispensings, setDispensings]     = useState([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState('')

  const [drugs, setDrugs] = useState([])

  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch]             = useState('')

  const [dispenseTarget, setDispenseTarget] = useState(null)
  const [dispenseForm, setDispenseForm]     = useState(EMPTY_DISPENSE)
  const [dispenseSaving, setDispenseSaving] = useState(false)
  const [dispenseError, setDispenseError]   = useState('')

  useEffect(() => {
    const canAccessDispensing = isPharmacist || isAdmin
    const extras = canAccessDispensing
      ? [getDispensings(), getDrugs()]
      : [Promise.resolve({ data: [] }), Promise.resolve({ data: [] })]

    Promise.all([getPrescriptions(), ...extras])
      .then(([pRes, dRes, drugRes]) => {
        setPrescriptions(pRes.data)
        setDispensings(dRes.data)
        setDrugs(drugRes.data)
      })
      .catch(() => setError('Failed to load pharmacy data.'))
      .finally(() => setLoading(false))
  }, [isPharmacist, isAdmin])

  async function handleSendToPharmacy(rx) {
    try {
      const res = await updatePrescription(rx.prescription_id, {
        medication_name: rx.medication_name,
        dosage:          rx.dosage,
        instructions:    rx.instructions,
        status:          'Sent to Pharmacy',
      })
      setPrescriptions((prev) => prev.map((p) => p.prescription_id === rx.prescription_id ? res.data : p))
    } catch {
      setError('Failed to update prescription status.')
    }
  }

  function openDispenseModal(rx) {
    setDispenseTarget(rx)
    setDispenseForm(EMPTY_DISPENSE)
    setDispenseError('')
  }

  function stockForRx(rx) {
    return drugs.find(
      (d) => d.medication_name.toLowerCase() === rx?.medication_name?.toLowerCase()
    ) ?? null
  }

  async function handleDispense(e) {
    e.preventDefault()
    setDispenseError('')
    setDispenseSaving(true)
    try {
      await createDispensing({
        prescription_id:    dispenseTarget.prescription_id,
        quantity_dispensed: Number(dispenseForm.quantity_dispensed),
        status:             dispenseForm.status,
      })
      const updatedRx = await updatePrescription(dispenseTarget.prescription_id, {
        medication_name: dispenseTarget.medication_name,
        dosage:          dispenseTarget.dosage,
        instructions:    dispenseTarget.instructions,
        status:          'Dispensed',
      })
      setPrescriptions((prev) =>
        prev.map((p) => p.prescription_id === dispenseTarget.prescription_id ? updatedRx.data : p)
      )
      const [dRes, drugRes] = await Promise.all([getDispensings(), getDrugs()])
      setDispensings(dRes.data)
      setDrugs(drugRes.data)
      setDispenseTarget(null)
    } catch (err) {
      setDispenseError(err.response?.data?.message ?? 'Failed to record dispensing.')
    } finally {
      setDispenseSaving(false)
    }
  }

  const filteredRx = prescriptions.filter((rx) => {
    const matchesStatus = statusFilter === 'all' || rx.status === statusFilter
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      `${rx.patient_first_name} ${rx.patient_last_name}`.toLowerCase().includes(q) ||
      rx.medication_name.toLowerCase().includes(q)
    return matchesStatus && matchesSearch
  })

  if (loading) return <p className="text-gray-500">Loading…</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pharmacy</h1>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {[
          { key: 'queue',   label: 'Prescription Queue' },
          ...(isPharmacist || isAdmin ? [{ key: 'history', label: 'Dispense History' }] : []),
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key
                ? 'border-purple-700 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'queue' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <input
              type="text"
              placeholder="Search patient or medication…"
              className="form-input max-w-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="form-select w-48"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="Created">Created</option>
              <option value="Sent to Pharmacy">Sent to Pharmacy</option>
              <option value="Dispensed">Dispensed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="card overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Patient', 'Doctor', 'Medication', 'Dosage', 'Instructions', 'Status', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRx.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      No prescriptions found.
                    </td>
                  </tr>
                )}
                {filteredRx.map((rx) => (
                  <tr key={rx.prescription_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      {rx.patient_first_name} {rx.patient_last_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      Dr. {rx.doctor_first_name} {rx.doctor_last_name}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{rx.medication_name}</td>
                    <td className="px-4 py-3 text-gray-600">{rx.dosage}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{rx.instructions ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[rx.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {rx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {(isDoctor || isAdmin) && rx.status === 'Created' && (
                        <button
                          onClick={() => handleSendToPharmacy(rx)}
                          className="text-amber-600 hover:text-amber-800 text-xs font-medium"
                        >
                          Send to Pharmacy
                        </button>
                      )}
                      {(isPharmacist || isAdmin) && rx.status === 'Sent to Pharmacy' && (
                        <button
                          onClick={() => openDispenseModal(rx)}
                          className="text-green-600 hover:text-green-800 text-xs font-medium"
                        >
                          Dispense
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'history' && (
        <div className="card overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Patient', 'Medication', 'Dosage', 'Qty Dispensed', 'Date', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dispensings.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No dispensing records yet.
                  </td>
                </tr>
              )}
              {dispensings.map((d) => (
                <tr key={d.dispense_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    {d.patient_first_name} {d.patient_last_name}
                  </td>
                  <td className="px-4 py-3 text-gray-800">{d.medication_name}</td>
                  <td className="px-4 py-3 text-gray-600">{d.dosage}</td>
                  <td className="px-4 py-3 text-gray-600">{d.quantity_dispensed}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(d.dispensed_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${DISPENSE_STATUS_BADGE[d.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {d.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dispense modal */}
      <Modal
        open={!!dispenseTarget}
        onClose={() => setDispenseTarget(null)}
        title="Record Dispensing"
        size="md"
      >
        {dispenseTarget && (() => {
          const drug = stockForRx(dispenseTarget)
          return (
          <form onSubmit={handleDispense} className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <Row label="Patient"    value={`${dispenseTarget.patient_first_name} ${dispenseTarget.patient_last_name}`} />
              <Row label="Medication" value={dispenseTarget.medication_name} />
              <Row label="Dosage"     value={dispenseTarget.dosage} />
              {dispenseTarget.instructions && (
                <Row label="Instructions" value={dispenseTarget.instructions} />
              )}
              {drug ? (
                <Row
                  label="In stock"
                  value={
                    <span className={drug.quantity_in_stock === 0 ? 'text-red-600 font-semibold' : drug.quantity_in_stock <= drug.reorder_threshold ? 'text-amber-600 font-semibold' : 'text-green-700 font-semibold'}>
                      {drug.quantity_in_stock} {drug.unit}
                      {drug.quantity_in_stock === 0 ? ' — Out of stock' : drug.quantity_in_stock <= drug.reorder_threshold ? ' — Low stock' : ''}
                    </span>
                  }
                />
              ) : (
                <Row label="In stock" value={<span className="text-gray-400 italic">Not in formulary</span>} />
              )}
            </div>

            <div>
              <label className="form-label">Quantity dispensed</label>
              <input
                type="number"
                required
                min="1"
                className="form-input"
                placeholder="e.g. 30"
                value={dispenseForm.quantity_dispensed}
                onChange={(e) => setDispenseForm({ ...dispenseForm, quantity_dispensed: e.target.value })}
              />
            </div>

            <div>
              <label className="form-label">Dispense status</label>
              <select
                className="form-select"
                value={dispenseForm.status}
                onChange={(e) => setDispenseForm({ ...dispenseForm, status: e.target.value })}
              >
                <option value="Medication Dispensed">Medication Dispensed</option>
                <option value="Partially Dispensed">Partially Dispensed</option>
                <option value="Stock Verified">Stock Verified</option>
              </select>
            </div>

            {dispenseError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {dispenseError}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setDispenseTarget(null)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={dispenseSaving}>
                {dispenseSaving ? 'Saving…' : 'Confirm dispense'}
              </button>
            </div>
          </form>
          )
        })()}
      </Modal>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-500 w-24 shrink-0">{label}:</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  )
}

