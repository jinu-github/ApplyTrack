import { MapPin, ArrowUp, ArrowDown } from 'lucide-react'

export default function ApplicationsTable({ applications, onOpen, sortBy, onSort }) {
  const columns = [
    { key: 'company', label: 'Company' },
    { key: 'position', label: 'Position' },
    { key: 'location', label: 'Location' },
    { key: 'date', label: 'Applied' },
    { key: 'status', label: 'Status' },
  ]

  const sortField = sortBy === 'newest' || sortBy === 'oldest' ? 'date' : sortBy

  return (
    <div className="applications-table-wrap">
      <table className="applications-table">
        <colgroup>
          <col className="col-company" />
          <col className="col-position" />
          <col className="col-location" />
          <col className="col-date" />
          <col className="col-status" />
        </colgroup>

        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={sortField === column.key ? 'sorted' : ''}
                onClick={() => onSort(column.key)}
              >
                <span>
                  {column.label}
                  {sortField === column.key && (
                    sortBy === 'oldest' ? (
                      <ArrowUp size={12} />
                    ) : (
                      <ArrowDown size={12} />
                    )
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {applications.map((application) => (
            <tr
              key={application.id}
              onClick={() => onOpen(application.id)}
            >
              <td>
                <div className="table-company-cell">
                  <div className="company-avatar">
                    {application.company.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="table-company-name" title={application.company}>
                    {application.company}
                  </span>
                </div>
              </td>

              <td className="table-position-cell" title={application.position}>
                {application.position}
              </td>

              <td
                className="table-location-cell"
                title={application.location || 'Not specified'}
              >
                <MapPin size={13} />
                <span>{application.location || 'Not specified'}</span>
              </td>

              <td className="table-date-cell">
                {formatDate(application.appliedDate)}
              </td>

              <td>
                <span className={`status-badge ${slug(application.status)}`}>
                  <span className={`status-dot ${slug(application.status)}`}></span>
                  {application.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function slug(v) {
  return v.toLowerCase().replace(/\s/g, '-')
}

function formatDate(v) {
  if (!v) return '—'
  return new Date(v + 'T00:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}