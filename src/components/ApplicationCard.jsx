import { MapPin, CalendarDays } from 'lucide-react'

export default function ApplicationCard({ application, onClick, compact = false }) {
  const initials = application.company.slice(0, 2).toUpperCase()

  return (
    <div
      className={`application-card ${compact ? 'compact-card' : ''}`}
      onClick={onClick}
    >
      <div className="card-company">
        <div className="company-avatar">{initials}</div>
        <div>
          <strong>{application.company}</strong>
          <span>{application.position}</span>
        </div>
      </div>

      {!compact && (
        <>
          <div className="card-meta">
            <span>
              <MapPin size={13} />
              {application.location || 'Not specified'}
            </span>
            {application.appliedDate && (
              <span>
                <CalendarDays size={13} />
                {formatDate(application.appliedDate)}
              </span>
            )}
          </div>
          <div className="card-footer">
            <span className={`status-dot ${slug(application.status)}`}></span>
            {application.status}
          </div>
        </>
      )}
    </div>
  )
}

function slug(v) {
  return v.toLowerCase().replace(/\s/g, '-')
}

function formatDate(v) {
  return new Date(v + 'T00:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}