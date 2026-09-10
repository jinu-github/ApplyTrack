import { BriefcaseBusiness, Activity, CalendarDays, Trophy, Plus, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import ApplicationCard from '../components/ApplicationCard'

export default function Dashboard({ applications, onAdd, onOpen }) {
  const active = applications.filter(
    (a) => !['Rejected', 'Withdrawn'].includes(a.status)
  ).length

  const stats = [
    ['Total Applications', applications.length, BriefcaseBusiness],
    ['Active Applications', active, Activity],
    ['Interviews', applications.filter((a) => a.status === 'Interview').length, CalendarDays],
    ['Offers', applications.filter((a) => a.status === 'Offer').length, Trophy],
  ]

  const pipelineStages = ['Draft', 'Applied', 'Screening', 'Interview', 'Offer']

  const upcomingInterviews = applications
    .filter((application) => application.interview?.date)
    .sort((a, b) => {
      const dateA = new Date(`${a.interview.date}T${a.interview.time || '00:00'}`)
      const dateB = new Date(`${b.interview.date}T${b.interview.time || '00:00'}`)
      return dateA - dateB
    })
  
  const getReminderStatus = (date) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const reminderDate = new Date(`${date}T00:00`)
  reminderDate.setHours(0, 0, 0, 0)

  if (reminderDate < today) {
    return 'overdue'
  }

  if (reminderDate.getTime() === today.getTime()) {
    return 'today'
  }

  return 'upcoming'
}

const upcomingReminders = applications
  .flatMap((application) =>
    (application.reminders || []).map((reminder) => ({
      ...reminder,
      applicationId: application.id,
      company: application.company,
      position: application.position,
      urgency: getReminderStatus(reminder.date)
    }))
  )
  .filter(
    (reminder) =>
      reminder.date &&
      !reminder.completed
  )
  .sort((a, b) => {
    const urgencyOrder = {
      overdue: 0,
      today: 1,
      upcoming: 2
    }

    if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
      return (
        urgencyOrder[a.urgency] -
        urgencyOrder[b.urgency]
      )
    }

    return new Date(a.date) - new Date(b.date)
  })
  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">JOB SEARCH WORKSPACE</p>
          <h1>Dashboard</h1>
          <p>Stay on top of every opportunity.</p>
        </div>
        <button className="primary-button" onClick={onAdd}>
          <Plus size={18} /> Add Application
        </button>
      </section>

      <section className="stats-grid">
        {stats.map(([label, value, Icon]) => (
          <div className="stat-card" key={label}>
            <div className="stat-icon">
              <Icon size={20} />
            </div>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Application Pipeline</h2>
              <p>Your current progress by stage.</p>
            </div>
          </div>

          {pipelineStages.map((status) => {
            const count = applications.filter((a) => a.status === status).length
            const percent = applications.length
              ? Math.round((count / applications.length) * 100)
              : 0

            return (
              <div className="pipeline-row" key={status}>
                <div>
                  <span className={`status-dot ${status.toLowerCase()}`}></span>
                  {status}
                </div>
                <strong>{count}</strong>
                <div className="progress">
                  <span style={{ width: `${percent}%` }} />
                </div>
              </div>
            )
          })}
        </div>

        <section className="panel upcoming-interviews">
          <div className="panel-heading">
            <div>
              <h2>Upcoming Interviews</h2>
              <p>Keep track of your scheduled interviews.</p>
            </div>
          </div>

          {upcomingInterviews.length > 0 ? (
            <div className="upcoming-interviews-list">
              {upcomingInterviews.slice(0, 3).map((application) => (
                <div
                  className="upcoming-interview-card"
                  key={application.id}
                  onClick={() => onOpen(application.id)}
                >
                  <div className="interview-date-box">
                    <span>
                      {new Date(`${application.interview.date}T00:00`).toLocaleDateString(
                        'en-US',
                        { month: 'short' }
                      )}
                    </span>
                    <strong>
                      {new Date(`${application.interview.date}T00:00`).getDate()}
                    </strong>
                  </div>

                  <div className="upcoming-interview-info">
                    <strong>{application.company}</strong>
                    <span>{application.position}</span>
                    <small>
                      {application.interview.time}
                      {' • '}
                      {application.interview.type}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-interviews">
              <p>No interviews scheduled yet.</p>
            </div>
          )}
        </section>
      </section>

      <section className="panel upcoming-reminders">

        <div className="panel-heading">

          <div>
            <h2>Upcoming Reminders</h2>

            <p>
              Important follow-ups and tasks.
            </p>
          </div>

        </div>

        {upcomingReminders.length > 0 ? (

          <div className="upcoming-reminders-list">

            {upcomingReminders.slice(0, 4).map((reminder) => (

              <button
                className={`upcoming-reminder-card ${reminder.urgency}`}
                key={reminder.id}
                onClick={() =>
                  onOpen(reminder.applicationId)
                }
              >

                <div className="reminder-date-box">

                  <span>
                    {new Date(
                      `${reminder.date}T00:00`
                    ).toLocaleDateString(
                      'en-US',
                      {
                        month: 'short'
                      }
                    )}
                  </span>

                  <strong>
                    {new Date(
                      `${reminder.date}T00:00`
                    ).getDate()}
                  </strong>

                </div>

                <div className="upcoming-reminder-info">

                  <div className="reminder-title-row">

                    <strong>
                      {reminder.text}
                    </strong>

                    <span
                      className={`reminder-urgency ${reminder.urgency}`}
                    >
                      {reminder.urgency === 'overdue'
                        ? 'Overdue'
                        : reminder.urgency === 'today'
                        ? 'Today'
                        : 'Upcoming'}
                    </span>

                  </div>

                  <span>
                    {reminder.company}
                    {' • '}
                    {reminder.position}
                  </span>

                </div>

              </button>

            ))}

          </div>

        ) : (

          <div className="empty-interviews">

            <p>
              No reminders scheduled yet.
            </p>

          </div>

        )}

      </section>

      <section className="panel recent-panel">
        <div className="panel-heading">
          <div>
            <h2>Recent Applications</h2>
            <p>Your latest opportunities.</p>
          </div>
          <Link className="text-button" to="/applications">
            View all <ArrowRight size={16} />
          </Link>
        </div>
        <div className="recent-list">
          {applications.slice(0, 4).map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              compact
              onClick={() => onOpen(app.id)}
            />
          ))}
        </div>
      </section>
    </>
  )
}