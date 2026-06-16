import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getLabOrders, createLabOrder, updateLabOrder,
} from '../api/labOrders'
import {
  getLabResults, createLabResult, updateLabResult,
} from '../api/labResults'
import { getMedicalRecords } from '../api/medicalRecords'
import Modal from '../components/common/Modal'
import Pagination from '../components/common/Pagination'

// Linear status progression for lab orders
const ORDER_PROGRESSION = {
  'Ordered':          { next: 'Sample Collected', action: 'Collect Sample' },
  'Sample Collected': { next: 'Processing',        action: 'Start Processing' },
  'Processing':       { next: 'Completed',         action: 'Mark Complete' },
}

const ORDER_STATUS_BADGE = {
  'Ordered':          'bg-gray-100 text-gray-600',
  'Sample Collected': 'bg-blue-100 text-blue-700',
  'Processing':       'bg-amber-100 text-amber-700',
  'Completed':        'bg-green-100 text-green-700',
  'Cancelled':        'bg-red-100 text-red-600',
}

const RESULT_STATUS_BADGE = {
  'Pending Review':      'bg-amber-100 text-amber-700',
  'Results Reviewed':    'bg-green-100 text-green-700',
  'Requires Follow-up':  'bg-red-100 text-red-600',
}

export default function Lab() {
  const { user } = useAuth()
  const isDoctor    = user?.role === 'doctor'
  const isLabTech   = user?.role === 'lab_technician'
  const isAdmin     = user?.role === 'admin'

  const [tab, setTab]             = useState('orders')
  const [orders, setOrders]       = useState([])
  const [ordersTotal, setOrdersTotal] = useState(0)
  const [ordersPage, setOrdersPage]   = useState(1)
  const [results, setResults]     = useState([])
  const [resultsTotal, setResultsTotal] = useState(0)
  const [resultsPage, setResultsPage]   = useState(1)
  const limit = 50
  const [records, setRecords]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch]       = useState('')

  // New order modal
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [orderForm, setOrderForm]           = useState({ record_id: '', test_name: '' })
  const [orderSaving, setOrderSaving]       = useState(false)
  const [orderError, setOrderError]         = useState('')

  // Enter result modal
  const [resultTarget, setResultTarget] = useState(null)
  const [resultForm, setResultForm]     = useState({ result_data: '' })
  const [resultSaving, setResultSaving] = useState(false)
  const [resultError, setResultError]   = useState('')

  // View result modal
  const [viewResult, setViewResult] = useState(null)

  useEffect(() => {
    setLoading(true)
    const promises = [getLabOrders(ordersPage, limit), getLabResults(resultsPage, limit)]
    if (isDoctor || isAdmin) promises.push(getMedicalRecords(1, 100))

    Promise.all(promises)
      .then(([o, r, rec]) => {
        setOrders(o.data.data); setOrdersTotal(o.data.total)
        setResults(r.data.data); setResultsTotal(r.data.total)
        if (rec) setRecords(rec.data.data ?? rec.data)
      })
      .catch(() => setError('Failed to load lab data.'))
      .finally(() => setLoading(false))
  }, [isDoctor, isAdmin, ordersPage, resultsPage])

  // Build a set of order IDs that already have a result
  const resultedOrderIds = new Set(results.map((r) => r.lab_order_id))

  async function handleAdvanceStatus(order) {
    const prog = ORDER_PROGRESSION[order.status]
    if (!prog) return
    try {
      const res = await updateLabOrder(order.lab_order_id, {
        test_name: order.test_name,
        status:    prog.next,
      })
      setOrders((prev) => prev.map((o) => o.lab_order_id === order.lab_order_id ? res.data : o))
    } catch {
      setError('Failed to update order status.')
    }
  }

  async function handleCreateOrder(e) {
    e.preventDefault()
    setOrderError('')
    setOrderSaving(true)
    try {
      const res = await createLabOrder(orderForm)
      setOrders((prev) => [res.data, ...prev])
      setShowOrderModal(false)
    } catch (err) {
      setOrderError(err.response?.data?.message ?? 'Failed to create order.')
    } finally {
      setOrderSaving(false)
    }
  }

  function openResultModal(order) {
    setResultTarget(order)
    setResultForm({ result_data: '' })
    setResultError('')
  }

  async function handleEnterResult(e) {
    e.preventDefault()
    setResultError('')
    setResultSaving(true)
    try {
      const res = await createLabResult({
        lab_order_id: resultTarget.lab_order_id,
        result_data:  resultForm.result_data,
        status:       'Pending Review',
      })
      setResults((prev) => [res.data, ...prev])
      setResultTarget(null)
    } catch (err) {
      setResultError(err.response?.data?.message ?? 'Failed to save result.')
    } finally {
      setResultSaving(false)
    }
  }

  async function handleReviewResult(result, status) {
    try {
      const res = await updateLabResult(result.result_id, {
        result_data: result.result_data,
        status,
        reviewed_at: new Date().toISOString(),
      })
      setResults((prev) => prev.map((r) => r.result_id === result.result_id ? res.data : r))
      if (viewResult?.result_id === result.result_id) setViewResult(res.data)
    } catch {
      setError('Failed to update result.')
    }
  }

  const filteredOrders = orders.filter((o) => {
    const matchStatus = statusFilter === 'all' || o.status === statusFilter
    const q = search.toLowerCase()
    const matchSearch = !q ||
      `${o.patient_first_name} ${o.patient_last_name}`.toLowerCase().includes(q) ||
      o.test_name.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  if (loading) return <p className="text-gray-500">Loading…</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Laboratory</h1>
        {(isDoctor || isAdmin) && (
          <button onClick={() => { setShowOrderModal(true); setOrderForm({ record_id: '', test_name: '' }); setOrderError('') }} className="btn-primary">
            + New order
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {[
          { key: 'orders',  label: 'Order Queue' },
          { key: 'results', label: 'Results' },
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

      {/* ORDER QUEUE TAB */}
      {tab === 'orders' && (
        <>
          <div className="flex flex-wrap gap-3 mb-4">
            <input
              type="text"
              placeholder="Search patient or test…"
              className="form-input max-w-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="form-select w-52"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              {['Ordered', 'Sample Collected', 'Processing', 'Completed', 'Cancelled'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="card overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Patient', 'Test', 'Status', 'Ordered', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No orders found.</td></tr>
                )}
                {filteredOrders.map((order) => {
                  const prog        = ORDER_PROGRESSION[order.status]
                  const needsResult = order.status === 'Completed' && !resultedOrderIds.has(order.lab_order_id)
                  return (
                    <tr key={order.lab_order_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{order.patient_first_name} {order.patient_last_name}</td>
                      <td className="px-4 py-3 text-gray-800">{order.test_name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ORDER_STATUS_BADGE[order.status]}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(order.order_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap flex gap-3">
                        {(isLabTech || isAdmin) && prog && (
                          <button
                            onClick={() => handleAdvanceStatus(order)}
                            className="text-xs font-medium text-blue-600 hover:text-blue-800"
                          >
                            {prog.action}
                          </button>
                        )}
                        {(isLabTech || isAdmin) && needsResult && (
                          <button
                            onClick={() => openResultModal(order)}
                            className="text-xs font-medium text-green-600 hover:text-green-800"
                          >
                            Enter Result
                          </button>
                        )}
                        {order.status === 'Completed' && resultedOrderIds.has(order.lab_order_id) && (
                          <span className="text-xs text-gray-400">Result filed</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={ordersPage} total={ordersTotal} limit={limit} onPageChange={setOrdersPage} />
        </>
      )}

      {/* RESULTS TAB */}
      {tab === 'results' && (
        <>
        <div className="card overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Patient', 'Test', 'Result', 'Review Status', 'Reviewed At', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {results.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No results yet.</td></tr>
              )}
              {results.map((r) => (
                <tr key={r.result_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.patient_first_name} {r.patient_last_name}</td>
                  <td className="px-4 py-3 text-gray-800">{r.test_name}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{r.result_data}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${RESULT_STATUS_BADGE[r.status]}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap flex gap-2">
                    <button
                      onClick={() => setViewResult(r)}
                      className="text-xs font-medium text-gray-500 hover:text-gray-700"
                    >
                      View
                    </button>
                    {(isDoctor || isAdmin) && r.status === 'Pending Review' && (
                      <>
                        <button
                          onClick={() => handleReviewResult(r, 'Results Reviewed')}
                          className="text-xs font-medium text-green-600 hover:text-green-800"
                        >
                          Reviewed
                        </button>
                        <button
                          onClick={() => handleReviewResult(r, 'Requires Follow-up')}
                          className="text-xs font-medium text-red-500 hover:text-red-700"
                        >
                          Follow-up
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={resultsPage} total={resultsTotal} limit={limit} onPageChange={setResultsPage} />
        </>
      )}

      {/* New order modal */}
      <Modal open={showOrderModal} onClose={() => setShowOrderModal(false)} title="New Lab Order" size="md">
        <form onSubmit={handleCreateOrder} className="space-y-4">
          <div>
            <label className="form-label">Medical record</label>
            <select
              required
              className="form-select"
              value={orderForm.record_id}
              onChange={(e) => setOrderForm({ ...orderForm, record_id: e.target.value })}
            >
              <option value="">Select a record…</option>
              {records.map((rec) => (
                <option key={rec.record_id} value={rec.record_id}>
                  {rec.patient_first_name} {rec.patient_last_name}
                  {rec.diagnosis ? ` — ${rec.diagnosis.slice(0, 40)}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Test name</label>
            <input
              required
              className="form-input"
              placeholder="e.g. Full Blood Count"
              value={orderForm.test_name}
              onChange={(e) => setOrderForm({ ...orderForm, test_name: e.target.value })}
            />
          </div>
          {orderError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{orderError}</p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowOrderModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={orderSaving}>
              {orderSaving ? 'Saving…' : 'Create order'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Enter result modal */}
      <Modal open={!!resultTarget} onClose={() => setResultTarget(null)} title="Enter Lab Result" size="md">
        {resultTarget && (
          <form onSubmit={handleEnterResult} className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
              <Row label="Patient" value={`${resultTarget.patient_first_name} ${resultTarget.patient_last_name}`} />
              <Row label="Test"    value={resultTarget.test_name} />
            </div>
            <div>
              <label className="form-label">Result</label>
              <textarea
                required
                rows={4}
                className="form-input"
                placeholder="Enter the full result details…"
                value={resultForm.result_data}
                onChange={(e) => setResultForm({ result_data: e.target.value })}
              />
            </div>
            {resultError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{resultError}</p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setResultTarget(null)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={resultSaving}>
                {resultSaving ? 'Saving…' : 'File result'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* View result modal */}
      <Modal open={!!viewResult} onClose={() => setViewResult(null)} title="Lab Result" size="md">
        {viewResult && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Patient" value={`${viewResult.patient_first_name} ${viewResult.patient_last_name}`} />
              <Field label="Test"    value={viewResult.test_name} />
              <Field label="Status"  value={viewResult.status} />
              <Field label="Reviewed" value={viewResult.reviewed_at ? new Date(viewResult.reviewed_at).toLocaleDateString() : '—'} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Result</p>
              <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 rounded p-3 border border-gray-200">
                {viewResult.result_data}
              </p>
            </div>
            {(isDoctor || isAdmin) && viewResult.status === 'Pending Review' && (
              <div className="flex gap-3 pt-1">
                <button onClick={() => handleReviewResult(viewResult, 'Results Reviewed')} className="btn-primary text-sm">
                  Mark Reviewed
                </button>
                <button onClick={() => handleReviewResult(viewResult, 'Requires Follow-up')} className="btn-secondary text-sm text-red-600 border-red-200 hover:bg-red-50">
                  Requires Follow-up
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-500 w-16 shrink-0">{label}:</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-gray-900">{value}</p>
    </div>
  )
}
