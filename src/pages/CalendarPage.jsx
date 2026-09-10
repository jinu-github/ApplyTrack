import { useState } from 'react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock
} from 'lucide-react'

export default function CalendarPage({
  applications,
  onOpen
}) {
  const [currentDate, setCurrentDate] = useState(
    new Date()
  )

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const monthName = currentDate.toLocaleDateString(
    'en-US',
    {
      month: 'long',
      year: 'numeric'
    }
  )

  const firstDayOfMonth = new Date(
    year,
    month,
    1
  ).getDay()

  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate()

  const previousMonth = () => {
    setCurrentDate(
      new Date(year, month - 1, 1)
    )
  }

  const nextMonth = () => {
    setCurrentDate(
      new Date(year, month + 1, 1)
    )
  }

  const interviews = applications.filter(
    (application) => application.interview?.date
  )
 const reminders = applications.flatMap(
  (application) =>
    (application.reminders || [])
      .filter(
        (reminder) =>
          !reminder.completed
      )
      .map(
        (reminder) => ({
          ...reminder,
          applicationId: application.id,
          company: application.company
        })
      )
)

  const getInterviewsForDay = (day) => {
    const date = new Date(
      year,
      month,
      day
    )
      .toISOString()
      .slice(0, 10)

    return interviews.filter(
      (application) =>
        application.interview.date === date
    )
  }

  const getRemindersForDay = (day) => {
  const date = new Date(
    year,
    month,
    day
  )
    .toISOString()
    .slice(0, 10)

  return reminders.filter(
    (reminder) =>
      reminder.date === date
  )
}

  const days = []

  // Empty spaces before the first day
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(
      <div
        className="calendar-day empty"
        key={`empty-${i}`}
      />
    )
  }

  // Actual days
  for (
    let day = 1;
    day <= daysInMonth;
    day++
  ) {
    const dayInterviews =
    getInterviewsForDay(day)

    const dayReminders =
    getRemindersForDay(day)

    const today = new Date()

    const isToday =
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day

    days.push(
      <div
        className={`calendar-day ${
          isToday ? 'today' : ''
        }`}
        key={day}
      >
        <span className="calendar-day-number">
          {day}
        </span>

        <div className="calendar-events">

        {dayInterviews.map(
            (application) => (

            <button
                className="calendar-event"
                key={application.id}
                onClick={() =>
                onOpen(application.id)
                }
            >

                <span className="calendar-event-company">
                {application.company}
                </span>

                <small>
                {application.interview.time}
                </small>

            </button>

            )
        )}

        {dayReminders.map(
            (reminder) => (

            <button
                className="calendar-event reminder-event"
                key={reminder.id}
                onClick={() =>
                onOpen(reminder.applicationId)
                }
            >

                <span className="calendar-event-company">
                🔔 {reminder.text}
                </span>

            </button>

            )
                )}
                </div>
            </div>
            )
        }

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">
            PLANNING
          </p>

          <h1>Calendar</h1>

          <p>
            Keep track of your interviews.
          </p>
        </div>

        <div className="calendar-title">
          <CalendarDays size={20} />

          <span>
            {monthName}
          </span>
        </div>
      </section>

      <section className="calendar-panel">

        {/* CALENDAR CONTROLS */}

        <div className="calendar-controls">

          <button
            className="icon-button"
            onClick={previousMonth}
            aria-label="Previous month"
          >
            <ChevronLeft size={20} />
          </button>

          <h2>
            {monthName}
          </h2>

          <button
            className="icon-button"
            onClick={nextMonth}
            aria-label="Next month"
          >
            <ChevronRight size={20} />
          </button>

        </div>

        {/* WEEKDAYS */}

        <div className="calendar-weekdays">

          {[
            'Sun',
            'Mon',
            'Tue',
            'Wed',
            'Thu',
            'Fri',
            'Sat'
          ].map((day) => (
            <span key={day}>
              {day}
            </span>
          ))}

        </div>

        {/* DAYS */}

        <div className="calendar-grid">

          {days}

        </div>

      </section>

      {/* UPCOMING INTERVIEWS */}

      <section className="panel calendar-upcoming">

        <div className="panel-heading">

          <div>

            <h2>
              Scheduled Interviews
            </h2>

            <p>
              Your upcoming interview schedule.
            </p>

          </div>

        </div>

        {interviews.length > 0 ? (

          <div className="calendar-interview-list">

            {interviews
              .sort(
                (a, b) =>
                  new Date(
                    `${a.interview.date}T${a.interview.time || '00:00'}`
                  ) -
                  new Date(
                    `${b.interview.date}T${b.interview.time || '00:00'}`
                  )
              )
              .map((application) => (

                <button
                  className="calendar-interview-card"
                  key={application.id}
                  onClick={() =>
                    onOpen(application.id)
                  }
                >

                  <div className="calendar-interview-icon">

                    <CalendarDays size={19} />

                  </div>

                  <div>

                    <strong>
                      {application.company}
                    </strong>

                    <span>
                      {application.position}
                    </span>

                  </div>

                  <div className="calendar-interview-meta">

                    <span>
                      <Clock size={14} />

                      {application.interview.date}
                    </span>

                    <span>
                      {application.interview.time}
                    </span>

                  </div>

                </button>

              ))}

          </div>

        ) : (

          <div className="calendar-empty">

            <CalendarDays size={40} />

            <h3>
              No interviews scheduled
            </h3>

            <p>
              Schedule an interview from an application to see it here.
            </p>

          </div>

        )}

      </section>
    </>
  )
}