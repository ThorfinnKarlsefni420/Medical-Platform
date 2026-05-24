import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getDrugs, createDrug, updateDrug, adjustStock, deleteDrug, importDrugs } from '../api/drugInventory'
import Modal from '../components/common/Modal'

const EMPTY_DRUG = { medication_name: '', unit: 'tablets', quantity_in_stock: '', reorder_threshold: '10' }
const UNITS = ['tablets', 'capsules', 'vials', 'ampoules', 'bottles', 'sachets', 'tubes', 'patches']

function stockStatus(drug) {
  if (drug.quantity_in_stock === 0)                              return 'out'
  if (drug.quantity_in_stock <= drug.reorder_threshold)         return 'low'
  return 'ok'
}

const STATUS_STYLES = {
  out: { badge: 'bg-red-100 text-red-700',    label: 'Out of Stock' },
  low: { badge: 'bg-amber-100 text-amber-700', label: 'Low Stock' },
  ok:  { badge: 'bg-green-100 text-green-700', label: 'In Stock' },
}

export default function DrugInventory() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const canEdit = isAdmin || user?.role === 'pharmacist'

  const [drugs, setDrugs]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [search, setSearch]     = useState('')

  const [showForm, setShowForm]     = useState(false)
  const [editing, setEditing]       = useState(null)
  const [form, setForm]             = useState(EMPTY_DRUG)
  const [saving, setSaving]         = useState(false)
  const [formError, setFormError]   = useState('')

  const [importing, setImporting]       = useState(false)
  const [importResult, setImportResult] = useState(null)

  const [adjustTarget, setAdjustTarget] = useState(null)
  const [adjustDelta, setAdjustDelta]   = useState('')
  const [adjustNote, setAdjustNote]     = useState('add')
  const [adjustSaving, setAdjustSaving] = useState(false)
  const [adjustError, setAdjustError]   = useState('')

  useEffect(() => {
    getDrugs()
      .then((res) => setDrugs(res.data))
      .catch(() => setError('Failed to load drug inventory.'))
      .finally(() => setLoading(false))
  }, [])

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_DRUG)
    setFormError('')
    setShowForm(true)
  }

  function openEdit(drug) {
    setEditing(drug)
    setForm({
      medication_name:   drug.medication_name,
      unit:              drug.unit,
      quantity_in_stock: String(drug.quantity_in_stock),
      reorder_threshold: String(drug.reorder_threshold),
    })
    setFormError('')
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    const payload = {
      medication_name:   form.medication_name,
      unit:              form.unit,
      quantity_in_stock: Number(form.quantity_in_stock),
      reorder_threshold: Number(form.reorder_threshold),
    }
    try {
      if (editing) {
        const res = await updateDrug(editing.drug_id, payload)
        setDrugs((prev) => prev.map((d) => d.drug_id === editing.drug_id ? res.data : d))
      } else {
        const res = await createDrug(payload)
        setDrugs((prev) => [...prev, res.data].sort((a, b) => a.medication_name.localeCompare(b.medication_name)))
      }
      setShowForm(false)
    } catch (err) {
      setFormError(err.response?.data?.message ?? 'Failed to save drug.')
    } finally {
      setSaving(false)
    }
  }

  function openAdjust(drug) {
    setAdjustTarget(drug)
    setAdjustDelta('')
    setAdjustNote('add')
    setAdjustError('')
  }

  async function handleAdjust(e) {
    e.preventDefault()
    setAdjustError('')
    setAdjustSaving(true)
    const delta = adjustNote === 'add' ? Number(adjustDelta) : -Number(adjustDelta)
    try {
      const res = await adjustStock(adjustTarget.drug_id, delta)
      setDrugs((prev) => prev.map((d) => d.drug_id === adjustTarget.drug_id ? res.data : d))
      setAdjustTarget(null)
    } catch (err) {
      setAdjustError(err.response?.data?.message ?? 'Failed to adjust stock.')
    } finally {
      setAdjustSaving(false)
    }
  }

  async function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    setImporting(true)
    try {
      const res = await importDrugs(file)
      setImportResult(res.data)
      getDrugs().then((r) => setDrugs(r.data))
    } catch (err) {
      setError(err.response?.data?.message ?? 'Import failed.')
    } finally {
      setImporting(false)
    }
  }

  async function handleDelete(drug) {
    if (!window.confirm(`Remove ${drug.medication_name} from inventory?`)) return
    try {
      await deleteDrug(drug.drug_id)
      setDrugs((prev) => prev.filter((d) => d.drug_id !== drug.drug_id))
    } catch {
      setError('Failed to delete drug.')
    }
  }

  const lowStockDrugs = drugs.filter((d) => stockStatus(d) !== 'ok')

  const filtered = drugs.filter((d) =>
    !search || d.medication_name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <p className="text-gray-500">Loading…</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Drug Inventory</h1>
        {canEdit && (
          <div className="flex gap-2">
            <label className={`btn-secondary cursor-pointer text-sm ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
              {importing ? 'Importing…' : '↑ Import'}
              <input
                type="file"
                accept=".csv,.xls,.xlsx"
                className="hidden"
                onChange={handleImport}
                disabled={importing}
              />
            </label>
            <button onClick={openAdd} className="btn-primary">+ Add drug</button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {/* Low-stock alert banner */}
      {lowStockDrugs.length > 0 && (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Attention:</strong> {lowStockDrugs.length} drug{lowStockDrugs.length > 1 ? 's' : ''} need restocking —{' '}
          {lowStockDrugs.map((d) => d.medication_name).join(', ')}.
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by medication name…"
          className="form-input max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Medication', 'Unit', 'In Stock', 'Reorder Level', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No drugs found.
                </td>
              </tr>
            )}
            {filtered.map((drug) => {
              const st = stockStatus(drug)
              const { badge, label } = STATUS_STYLES[st]
              return (
                <tr key={drug.drug_id} className={`hover:bg-gray-50 ${st === 'out' ? 'bg-red-50/40' : st === 'low' ? 'bg-amber-50/30' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{drug.medication_name}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{drug.unit}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{drug.quantity_in_stock}</td>
                  <td className="px-4 py-3 text-gray-500">{drug.reorder_threshold}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge}`}>
                      {label}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap flex gap-3">
                    {canEdit && (
                      <>
                        <button
                          onClick={() => openAdjust(drug)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          Adjust stock
                        </button>
                        <button
                          onClick={() => openEdit(drug)}
                          className="text-primary-600 hover:text-primary-800 text-xs font-medium"
                        >
                          Edit
                        </button>
                      </>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(drug)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Add / Edit drug modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit Drug' : 'Add Drug'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Medication name</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Amoxicillin 500mg"
              value={form.medication_name}
              onChange={(e) => setForm({ ...form, medication_name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Unit</label>
              <select
                className="form-select"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              >
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Initial quantity</label>
              <input
                type="number"
                required
                min="0"
                className="form-input"
                value={form.quantity_in_stock}
                onChange={(e) => setForm({ ...form, quantity_in_stock: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Reorder threshold</label>
            <input
              type="number"
              required
              min="0"
              className="form-input"
              placeholder="Alert when stock falls below this"
              value={form.reorder_threshold}
              onChange={(e) => setForm({ ...form, reorder_threshold: e.target.value })}
            />
          </div>

          {formError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Update' : 'Add drug'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Import result modal */}
      <Modal
        open={!!importResult}
        onClose={() => setImportResult(null)}
        title="Import Complete"
        size="md"
      >
        {importResult && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Added',   value: importResult.added,   color: 'text-green-700' },
                { label: 'Updated', value: importResult.updated, color: 'text-blue-700' },
                { label: 'Total',   value: importResult.total,   color: 'text-gray-700' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {importResult.errors.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">
                  {importResult.errors.length} row{importResult.errors.length > 1 ? 's' : ''} skipped
                </p>
                <ul className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-3 space-y-1 max-h-36 overflow-y-auto">
                  {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            <div className="text-xs text-gray-500 bg-gray-50 rounded p-3 space-y-1">
              <p className="font-medium text-gray-700">Expected columns</p>
              <p><code>medication_name</code> (required) · <code>unit</code> · <code>quantity_in_stock</code> · <code>reorder_threshold</code></p>
              <p>Existing drugs are updated by name. New drugs are added.</p>
            </div>

            <div className="flex justify-end">
              <button className="btn-primary" onClick={() => setImportResult(null)}>Done</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Adjust stock modal */}
      <Modal
        open={!!adjustTarget}
        onClose={() => setAdjustTarget(null)}
        title="Adjust Stock"
        size="sm"
      >
        {adjustTarget && (
          <form onSubmit={handleAdjust} className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="font-medium text-gray-900">{adjustTarget.medication_name}</p>
              <p className="text-gray-500">Current stock: <span className="font-semibold text-gray-800">{adjustTarget.quantity_in_stock} {adjustTarget.unit}</span></p>
            </div>

            <div>
              <label className="form-label">Operation</label>
              <div className="flex gap-3">
                {[{ value: 'add', label: 'Add stock' }, { value: 'remove', label: 'Remove stock' }].map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="adjustNote"
                      value={value}
                      checked={adjustNote === value}
                      onChange={() => setAdjustNote(value)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="form-label">Quantity</label>
              <input
                type="number"
                required
                min="1"
                className="form-input"
                placeholder="Enter amount"
                value={adjustDelta}
                onChange={(e) => setAdjustDelta(e.target.value)}
              />
            </div>

            {adjustError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {adjustError}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setAdjustTarget(null)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={adjustSaving}>
                {adjustSaving ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
