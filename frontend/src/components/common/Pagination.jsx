export default function Pagination({ page, total, limit, onPageChange }) {
  const totalPages = Math.ceil(total / limit) || 1
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
      <span>
        Showing {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of {total}
      </span>
      <div className="flex gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
        >
          Previous
        </button>
        <span className="px-3 py-1">{page} / {totalPages}</span>
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}
