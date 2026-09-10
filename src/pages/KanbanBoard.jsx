import { useState } from 'react'
import { X, MoveRight, CalendarX } from 'lucide-react'
import ApplicationCard from '../components/ApplicationCard'

const columns = [
  'Draft',
  'Applied',
  'Screening',
  'Interview',
  'Offer'
]

export default function KanbanBoard({
  applications,
  onOpen,
  onStatusChange
}) {
  const [draggedApplication, setDraggedApplication] = useState(null)
  const [dragOverColumn, setDragOverColumn] = useState(null)
  const [pendingMove, setPendingMove] = useState(null)

  const handleDragStart = (event, application) => {
    setDraggedApplication(application)

    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData(
      'text/plain',
      application.id
    )
  }

  const handleDragEnd = () => {
    setDraggedApplication(null)
    setDragOverColumn(null)
  }

  const handleDragOver = (event, status) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'

    if (dragOverColumn !== status) {
      setDragOverColumn(status)
    }
  }

  const handleDragLeave = (event, status) => {
    if (dragOverColumn === status) {
      setDragOverColumn(null)
    }
  }

  const handleDrop = (event, status) => {
    event.preventDefault()

    const applicationId =
      event.dataTransfer.getData('text/plain')

    if (!applicationId) {
      handleDragEnd()
      return
    }

    const application = applications.find(
      (app) => app.id === applicationId
    )

    if (
      application &&
      application.status !== status
    ) {
      setPendingMove({
        application,
        newStatus: status
      })
    }

    handleDragEnd()
  }

  const confirmMove = () => {
    if (!pendingMove) return

    const { application, newStatus } = pendingMove

    const update = {
      status: newStatus
    }

    // Remove interview data when
    // leaving the Interview stage.
    if (
      application.status === 'Interview' &&
      newStatus !== 'Interview'
    ) {
      update.interview = null
    }

    onStatusChange(application.id, update)

    setPendingMove(null)
  }

  const cancelMove = () => {
    setPendingMove(null)
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">WORKFLOW</p>

          <h1>Kanban Board</h1>

          <p>
            Drag applications between stages to keep
            your job search organized.
          </p>
        </div>
      </section>

      <div className="kanban-board">

        {columns.map((status) => {
          const items = applications.filter(
            (application) =>
              application.status === status
          )

          return (
            <div
              className={`kanban-column ${
                dragOverColumn === status
                  ? 'drag-over'
                  : ''
              }`}
              key={status}
              onDragOver={(event) =>
                handleDragOver(event, status)
              }
              onDragLeave={(event) =>
                handleDragLeave(event, status)
              }
              onDrop={(event) =>
                handleDrop(event, status)
              }
            >

              <div className="kanban-header">

                <div className="kanban-title">

                  <span
                    className={`status-dot ${status.toLowerCase()}`}
                  />

                  <span>{status}</span>

                </div>

                <span className="kanban-count">
                  {items.length}
                </span>

              </div>

              <div className="kanban-list">

                {items.map((application) => (

                  <div
                    className={`kanban-card-wrapper ${
                      draggedApplication?.id === application.id
                        ? 'dragging'
                        : ''
                    }`}
                    key={application.id}
                    draggable
                    onDragStart={(event) =>
                      handleDragStart(event, application)
                    }
                    onDragEnd={handleDragEnd}
                  >

                    <ApplicationCard
                      application={application}
                      onClick={() =>
                        onOpen(application.id)
                      }
                    />

                  </div>

                ))}

                {!items.length && (
                  <div className="column-empty">
                    <span>Drop applications here</span>
                  </div>
                )}

              </div>

            </div>
          )
        })}

      </div>

      {pendingMove && (
        <div className="confirmation-overlay">

          <div className="confirmation-modal kanban-confirmation-modal">

            <button
              className="confirmation-close"
              onClick={cancelMove}
              aria-label="Close confirmation"
            >
              <X size={19} />
            </button>

            <div className="confirmation-icon">
              <MoveRight size={28} />
            </div>

            <h2>Move application?</h2>

            <p>
              Move{' '}
              <strong>
                {pendingMove.application.company}
              </strong>{' '}
              from{' '}
              <strong>
                {pendingMove.application.status}
              </strong>{' '}
              to{' '}
              <strong>
                {pendingMove.newStatus}
              </strong>?
            </p>

            {pendingMove.application.status === 'Interview' &&
              pendingMove.newStatus !== 'Interview' && (

                <div className="kanban-move-warning">

                  <CalendarX size={18} />

                  <span>
                    The scheduled interview for this
                    application will also be removed.
                  </span>

                </div>

              )}

            <div className="confirmation-actions">

              <button
                className="secondary-button"
                onClick={cancelMove}
              >
                Cancel
              </button>

              <button
                className="primary-button"
                onClick={confirmMove}
              >
                <MoveRight size={17} />
                Move Application
              </button>

            </div>

          </div>

        </div>
      )}
    </>
  )
}