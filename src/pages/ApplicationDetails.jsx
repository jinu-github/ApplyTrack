import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ExternalLink,
  Trash2,
  X,
  NotebookPen,
  Pencil,
  Plus,
  CalendarDays,
  Clock,
  MapPin,
  Video,
  Bell,
  BellRing,
  Check
} from 'lucide-react'

import { statuses } from '../data/defaultData'

export default function ApplicationDetails({
  applications,
  onUpdate,
  onDelete,
  onEdit
}) {
  const { id } = useParams()
  const navigate = useNavigate()

  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [deleteNoteIndex, setDeleteNoteIndex] = useState(null)
  const [editingNoteIndex, setEditingNoteIndex] = useState(null)

  const [interviewModalOpen, setInterviewModalOpen] = useState(false)

  const [interviewDate, setInterviewDate] = useState('')
  const [interviewTime, setInterviewTime] = useState('')
  const [interviewType, setInterviewType] = useState('Online')
  const [interviewLocation, setInterviewLocation] = useState('')

  const [reminderModalOpen, setReminderModalOpen] = useState(false)

  const [reminderText, setReminderText] = useState('')
  const [reminderDate, setReminderDate] = useState('')

  const [deleteReminderId, setDeleteReminderId] = useState(null)

  const app = applications.find(
    (application) => application.id === id
  )

  if (!app) {
    return (
      <div className="empty-state">
        <h2>Application not found</h2>

        <button
          className="secondary-button"
          onClick={() => navigate('/applications')}
        >
          Back to Applications
        </button>
      </div>
    )
  }

 const saveNote = () => {
  const trimmedNote = noteText.trim()

  if (!trimmedNote) return

  // EDIT EXISTING NOTE
  if (editingNoteIndex !== null) {
    const updatedNotes = [...(app.notes || [])]

    updatedNotes[editingNoteIndex] = trimmedNote

    onUpdate(id, {
      notes: updatedNotes
    })
  }

  // ADD NEW NOTE
  else {
    onUpdate(id, {
      notes: [
        ...(app.notes || []),
        trimmedNote
      ]
    })
  }

  setNoteText('')
  setEditingNoteIndex(null)
  setNoteModalOpen(false)
}

  const closeNoteModal = () => {
  setNoteText('')
  setEditingNoteIndex(null)
  setNoteModalOpen(false)
}
  
  const requestDeleteNote = (index) => {
  setDeleteNoteIndex(index)
}

const confirmDeleteNote = () => {
  if (deleteNoteIndex === null) return

  onUpdate(id, {
    notes: app.notes.filter(
      (_, index) => index !== deleteNoteIndex
    )
  })

  setDeleteNoteIndex(null)
}

const cancelDeleteNote = () => {
  setDeleteNoteIndex(null)
}

const editNote = (index) => {
  setNoteText(app.notes[index])
  setEditingNoteIndex(index)
  setNoteModalOpen(true)
}

//Interview

const saveInterview = () => {
  if (!interviewDate || !interviewTime) return

  onUpdate(id, {
    status: 'Interview',

    interview: {
      date: interviewDate,
      time: interviewTime,
      type: interviewType,
      location: interviewLocation
    }
  })

  setInterviewModalOpen(false)

  setInterviewDate('')
  setInterviewTime('')
  setInterviewType('Online')
  setInterviewLocation('')
}

//Reminders

const saveReminder = () => {
  const trimmedReminder = reminderText.trim()

  if (!trimmedReminder || !reminderDate) return

  const newReminder = {
    id: crypto.randomUUID(),
    text: trimmedReminder,
    date: reminderDate,
    completed: false
  }

  onUpdate(id, {
    reminders: [
      ...(app.reminders || []),
      newReminder
    ]
  })

  setReminderText('')
  setReminderDate('')
  setReminderModalOpen(false)
}

const requestDeleteReminder = (reminderId) => {
  setDeleteReminderId(reminderId)
}

const confirmDeleteReminder = () => {
  if (!deleteReminderId) return

  onUpdate(id, {
    reminders: app.reminders.filter(
      (reminder) => reminder.id !== deleteReminderId
    )
  })

  setDeleteReminderId(null)
}

const cancelDeleteReminder = () => {
  setDeleteReminderId(null)
}

const toggleReminderComplete = (reminderId) => {
  const updatedReminders = (app.reminders || []).map(
    (reminder) =>
      reminder.id === reminderId
        ? {
            ...reminder,
            completed: !reminder.completed
          }
        : reminder
  )

  onUpdate(id, {
    reminders: updatedReminders
  })
}

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

  return (
    <>
      <button
        className="back-button"
        onClick={() => navigate('/applications')}
      >
        <ArrowLeft size={17} />
        Back to Applications
      </button>

      <section className="details-hero">

        <div className="company-avatar large">
          {app.company.slice(0, 2).toUpperCase()}
        </div>

        <div className="details-title">

          <p className="eyebrow">
            {app.status}
          </p>

          <h1>{app.company}</h1>

          <p>{app.position}</p>

        </div>

        <div className="details-actions">

          <select
            value={app.status}
            onChange={(e) =>
              onUpdate(id, {
                status: e.target.value
              })
            }
          >
            {statuses.map((status) => (
              <option key={status}>
                {status}
              </option>
            ))}
          </select>

          <button
            className="secondary-button interview-button"
            onClick={() => setInterviewModalOpen(true)}
          >
            <CalendarDays size={16} />
            {app.interview ? 'View Interview' : 'Schedule Interview'}
          </button>

          <button
            className="secondary-button edit-application-button"
            onClick={() => onEdit(app)}
          >
            <Pencil size={16} />
            Edit
          </button>

          <button
            className="danger-button"
            onClick={() => onDelete(id)}
          >
            <Trash2 size={16} />
            Delete
          </button>

        </div>

      </section>

      <div className="details-grid">

        {app.interview && (
            <section className="panel interview-panel">

              <div className="panel-heading">

                <div>
                  <h2>Scheduled Interview</h2>

                  <p>
                    Your upcoming interview details.
                  </p>
                </div>

                <CalendarDays size={22} />

              </div>

              <div className="interview-details">

                <div className="interview-detail-item">
                  <CalendarDays size={18} />

                  <div>
                    <span>Date</span>

                    <strong>
                      {app.interview.date}
                    </strong>
                  </div>
                </div>

                <div className="interview-detail-item">
                  <Clock size={18} />

                  <div>
                    <span>Time</span>

                    <strong>
                      {app.interview.time}
                    </strong>
                  </div>
                </div>

                <div className="interview-detail-item">
                  <Video size={18} />

                  <div>
                    <span>Interview Type</span>

                    <strong>
                      {app.interview.type}
                    </strong>
                  </div>
                </div>

                <div className="interview-detail-item">
                  <MapPin size={18} />

                  <div>
                    <span>Location / Link</span>

                    <strong>
                      {app.interview.location || 'Not specified'}
                    </strong>
                  </div>
                </div>

              </div>

            </section>
          )}

        {/* APPLICATION INFORMATION */}
        <section className="panel">

          <div className="panel-heading">
            <h2>Application Information</h2>
          </div>

          <dl className="detail-list">

            <Detail label="Company" value={app.company} />
            <Detail label="Position" value={app.position} />
            <Detail label="Location" value={app.location} />
            <Detail label="Job Type" value={app.jobType} />
            <Detail label="Salary" value={app.salary} />
            <Detail
              label="Applied Date"
              value={app.appliedDate}
            />

          </dl>

          {app.url && (
            <a
              className="external-link"
              href={app.url}
              target="_blank"
              rel="noreferrer"
            >
              Open Job Posting
              <ExternalLink size={15} />
            </a>
          )}

        </section>

        {/* NOTES */}
        <section className="panel">

          <div className="panel-heading">

            <div>
              <h2>Notes</h2>

              <p>
                Keep important details in one place.
              </p>
            </div>

            <button
            className="icon-button"
            onClick={() => {
                setEditingNoteIndex(null)
                setNoteText('')
                setNoteModalOpen(true)
            }}
            aria-label="Add note"
            >
            <Plus size={18} />
            </button>

          </div>

          <div className="notes-list">

            {app.notes?.length ? (
            app.notes.map((note, index) => (
                <div className="note" key={index}>

                <span className="note-content">
                    {note}
                </span>

                    <div className="note-actions">

                        <button
                        className="note-edit-button"
                        onClick={() => editNote(index)}
                        aria-label="Edit note"
                        title="Edit note"
                        >
                        <Pencil size={15} />
                        </button>

                        <button
                        className="note-delete-button"
                        onClick={() => requestDeleteNote(index)}
                        aria-label="Delete note"
                        title="Delete note"
                        >
                        <Trash2 size={16} />
                        </button>

                    </div>

                </div>
            ))
            ) : (
              <div className="empty-state small">
                No notes yet.
              </div>
            )}

          </div>

        </section>

        {/* REMINDERS */}
        <section className="panel reminders-panel">

          <div className="panel-heading">

            <div>
              <h2>Reminders</h2>

              <p>
                Keep track of important follow-ups.
              </p>
            </div>

            <button
              className="icon-button"
              onClick={() => setReminderModalOpen(true)}
              aria-label="Add reminder"
            >
              <Plus size={18} />
            </button>

          </div>

          <div className="reminders-list">

            {app.reminders?.length ? (

              app.reminders
                .slice()
                .sort(
                  (a, b) =>
                    new Date(a.date) -
                    new Date(b.date)
                )
                .map((reminder) => (

                  <div
                    className={`reminder ${
                      reminder.completed ? 'completed' : ''
                    }`}
                    key={reminder.id}
                  >

                    <button
                      className="reminder-complete-button"
                      onClick={() =>
                        toggleReminderComplete(reminder.id)
                      }
                      aria-label={
                        reminder.completed
                          ? 'Mark reminder as active'
                          : 'Mark reminder as completed'
                      }
                      title={
                        reminder.completed
                          ? 'Mark as active'
                          : 'Mark as completed'
                      }
                    >
                      <Check size={16} />
                    </button>

                    <div className="reminder-icon">

                      <Bell size={17} />

                    </div>

                    <div className="reminder-content">

                        <div className="reminder-text-row">

                          <strong>
                            {reminder.text}
                          </strong>

                          {!reminder.completed && (

                            <span
                              className={`reminder-urgency ${
                                getReminderStatus(reminder.date)
                              }`}
                            >
                              {getReminderStatus(reminder.date) === 'overdue'
                                ? 'Overdue'
                                : getReminderStatus(reminder.date) === 'today'
                                ? 'Today'
                                : 'Upcoming'}
                            </span>

                          )}

                        </div>

                        <span>
                          {new Date(
                            `${reminder.date}T00:00`
                          ).toLocaleDateString(
                            'en-US',
                            {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            }
                          )}
                        </span>

                      </div>

                    <button
                      className="note-delete-button"
                      onClick={() =>
                        requestDeleteReminder(reminder.id)
                      }
                      aria-label="Delete reminder"
                      title="Delete reminder"
                    >
                      <Trash2 size={16} />
                    </button>

                  </div>

                ))

            ) : (

              <div className="empty-state small">
                No reminders yet.
              </div>

            )}

          </div>

        </section>

      </div>

      {/* ADD NOTE MODAL */}
      {noteModalOpen && (
        <div className="note-modal-overlay">

          <div className="note-modal">

            <button
              className="note-modal-close"
              onClick={closeNoteModal}
              aria-label="Close"
            >
              <X size={19} />
            </button>

            <div className="note-modal-icon">
              <NotebookPen size={26} />
            </div>

            <h2>
                {editingNoteIndex !== null
                    ? 'Edit Note'
                    : 'Add Note'}
            </h2>

            <p>
                {editingNoteIndex !== null
                    ? 'Update the information for this note.'
                    : 'Save important information about this application.'}
            </p>

            <textarea
              className="note-textarea"
              placeholder="Write your note here..."
              value={noteText}
              onChange={(e) =>
                setNoteText(e.target.value)
              }
              autoFocus
            />

            <div className="note-modal-actions">

              <button
                className="secondary-button"
                onClick={closeNoteModal}
              >
                Cancel
              </button>

            <button
                className="primary-button"
                onClick={saveNote}
                disabled={!noteText.trim()}
                >
                {editingNoteIndex !== null
                    ? 'Save Changes'
                    : 'Save Note'}
            </button>

            </div>

          </div>

        </div>
      )}

        {deleteNoteIndex !== null && (
    <div className="confirmation-overlay">

        <div className="confirmation-modal note-delete-modal">

        <button
            className="confirmation-close"
            onClick={cancelDeleteNote}
            aria-label="Close confirmation"
        >
            <X size={19} />
        </button>

        <div className="confirmation-icon">
            <Trash2 size={28} />
        </div>

        <h2>Delete note?</h2>

        <p>
            Are you sure you want to delete this note?
        </p>

        <div className="delete-note-preview">
            {app.notes[deleteNoteIndex]}
        </div>

        <p className="delete-warning">
            This action cannot be undone.
        </p>

        <div className="confirmation-actions">

            <button
            className="secondary-button"
            onClick={cancelDeleteNote}
            >
            Cancel
            </button>

            <button
            className="delete-button"
            onClick={confirmDeleteNote}
            >
            Delete Note
            </button>

        </div>

        </div>

    </div>
    )}

    {interviewModalOpen && (
  <div className="note-modal-overlay">

    <div className="note-modal interview-modal">

      <button
        className="note-modal-close"
        onClick={() => setInterviewModalOpen(false)}
        aria-label="Close"
      >
        <X size={19} />
      </button>

      <div className="note-modal-icon">
        <CalendarDays size={26} />
      </div>

      <h2>
        Schedule Interview
      </h2>

      <p>
        Add the details for your upcoming interview.
      </p>

      <div className="interview-form">

        <div className="interview-form-row">

          <label>
            Interview Date

            <input
              type="date"
              value={interviewDate}
              onChange={(e) =>
                setInterviewDate(e.target.value)
              }
            />
          </label>

          <label>
            Interview Time

            <input
              type="time"
              value={interviewTime}
              onChange={(e) =>
                setInterviewTime(e.target.value)
              }
            />
          </label>

        </div>

        <label>
          Interview Type

          <select
            value={interviewType}
            onChange={(e) =>
              setInterviewType(e.target.value)
            }
          >
            <option>Online</option>
            <option>Phone</option>
            <option>On-site</option>
            <option>Video Call</option>
          </select>
        </label>

        <label>
          Location or Meeting Link

          <input
            type="text"
            placeholder="Google Meet, Zoom, office address..."
            value={interviewLocation}
            onChange={(e) =>
              setInterviewLocation(e.target.value)
            }
          />
        </label>

      </div>

      <div className="note-modal-actions">

        <button
          className="secondary-button"
          onClick={() => setInterviewModalOpen(false)}
        >
          Cancel
        </button>

        <button
          className="primary-button"
          onClick={saveInterview}
          disabled={!interviewDate || !interviewTime}
        >
          <CalendarDays size={17} />

          Schedule Interview
        </button>

      </div>

    </div>

  </div>
)}

    {/* ADD REMINDER MODAL */}
    {reminderModalOpen && (

      <div className="note-modal-overlay">

        <div className="note-modal reminder-modal">

          <button
            className="note-modal-close"
            onClick={() => {
              setReminderText('')
              setReminderDate('')
              setReminderModalOpen(false)
            }}
            aria-label="Close"
          >
            <X size={19} />
          </button>

          <div className="note-modal-icon">

            <BellRing size={26} />

          </div>

          <h2>Add Reminder</h2>

          <p>
            Set a reminder for an important follow-up or task.
          </p>

          <div className="reminder-form">

            <label>
              Reminder

              <textarea
                className="note-textarea"
                placeholder="Follow up with the recruiter..."
                value={reminderText}
                onChange={(e) =>
                  setReminderText(e.target.value)
                }
                autoFocus
              />

            </label>

            <label>
              Reminder Date

              <input
                type="date"
                value={reminderDate}
                onChange={(e) =>
                  setReminderDate(e.target.value)
                }
              />

            </label>

          </div>

          <div className="note-modal-actions">

            <button
              className="secondary-button"
              onClick={() => {
                setReminderText('')
                setReminderDate('')
                setReminderModalOpen(false)
              }}
            >
              Cancel
            </button>

            <button
              className="primary-button"
              onClick={saveReminder}
              disabled={
                !reminderText.trim() ||
                !reminderDate
              }
            >
              <Bell size={17} />

              Save Reminder
            </button>

          </div>

        </div>

      </div>

    )}

    {/* DELETE REMINDER CONFIRMATION */}
    {deleteReminderId !== null && (
      <div className="confirmation-overlay">

        <div className="confirmation-modal note-delete-modal">

          <button
            className="confirmation-close"
            onClick={cancelDeleteReminder}
            aria-label="Close confirmation"
          >
            <X size={19} />
          </button>

          <div className="confirmation-icon">
            <Trash2 size={28} />
          </div>

          <h2>Delete reminder?</h2>

          <p>
            Are you sure you want to delete this reminder?
          </p>

          <div className="delete-note-preview">
            {
              app.reminders.find(
                (reminder) => reminder.id === deleteReminderId
              )?.text
            }
          </div>

          <p className="delete-warning">
            This action cannot be undone.
          </p>

          <div className="confirmation-actions">

            <button
              className="secondary-button"
              onClick={cancelDeleteReminder}
            >
              Cancel
            </button>

            <button
              className="delete-button"
              onClick={confirmDeleteReminder}
            >
              Delete Reminder
            </button>

          </div>

        </div>

      </div>
    )}

    </>
  )
}

function Detail({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>

      <dd>
        {value || 'Not specified'}
      </dd>
    </div>
  )
}