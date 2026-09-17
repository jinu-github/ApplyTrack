import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard,
  BriefcaseBusiness,
  Columns3,
  CalendarDays,
  X,
  Pencil,
  AlertTriangle,
  Settings,
  Mail
} from 'lucide-react'

import Dashboard from './pages/Dashboard'
import Applications from './pages/Applications'
import KanbanBoard from './pages/KanbanBoard'
import CalendarPage from './pages/CalendarPage'
import ApplicationDetails from './pages/ApplicationDetails'
import ApplicationForm from './components/ApplicationForm'
import JobEmails from './pages/JobEmails'
import DataSettings from './pages/DataSettings'
import applyTrackLogo from './assets/applytrack.png'

const STORAGE_KEY = 'applytrack-applications-v1'

export default function App() {
  const [applications, setApplications] = useState(() => {
  try {
    const savedApplications = localStorage.getItem(STORAGE_KEY)

    return savedApplications
      ? JSON.parse(savedApplications)
      : []
  } catch {
    return []
  }
})

  const [formOpen, setFormOpen] = useState(false)
  const [editingApplication, setEditingApplication] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [aboutOpen, setAboutOpen] = useState(false)

  const navigate = useNavigate()
  const location = useLocation() // NEW: needed so AnimatePresence knows when the route changes

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications))
  }, [applications])

  // `options.navigateToDetails` defaults to true for the normal "Add
  // Application" form flow. The Email Updates feature in JobEmails
  // passes false so confirming a suggestion doesn't yank the user
  // away from the page they're reviewing suggestions on.
  const addApplication = (data, options = {}) => {
    const { navigateToDetails = true } = options
    const now = new Date().toISOString().slice(0, 10)

    const application = {
      ...data,
      id: crypto.randomUUID(),
      updatedAt: now,
      notes: [],
      timeline: [
        {
          text: 'Application created',
          date: now
        }
      ]
    }

    setApplications((prev) => [application, ...prev])

    setFormOpen(false)

    if (navigateToDetails) {
      navigate(`/applications/${application.id}`)
    }

    return application
  }

  const editApplication = (application) => {
  setEditingApplication(application)
  setFormOpen(true)
  }
  
  const saveEditedApplication = (data) => {
  if (!editingApplication) return

  setApplications((prev) =>
    prev.map((application) =>
      application.id === editingApplication.id
        ? {
            ...application,
            ...data,
            updatedAt: new Date()
              .toISOString()
              .slice(0, 10)
          }
        : application
    )
  )

  setEditingApplication(null)
  setFormOpen(false)
 }

  const updateApplication = (id, patch) => {
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== id) return app

        const now = new Date().toISOString().slice(0, 10)

        let timeline = app.timeline || []

        if (patch.status && patch.status !== app.status) {
          timeline = [
            {
              text: `Status changed to ${patch.status}`,
              date: now
            },
            ...timeline
          ]
        }

        return {
          ...app,
          ...patch,
          updatedAt: now,
          timeline
        }
      })
    )
  }

  // Opens the confirmation modal instead of deleting immediately
  const requestDelete = (id) => {
    const application = applications.find((app) => app.id === id)

    if (!application) return

    setDeleteTarget(application)
  }

  // Deletes only after user confirms
  const confirmDelete = () => {
    if (!deleteTarget) return

    setApplications((prev) =>
      prev.filter((app) => app.id !== deleteTarget.id)
    )

    setDeleteTarget(null)

    navigate('/applications')
  }

  const cancelDelete = () => {
    setDeleteTarget(null)
  }

  const navItems = [
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard
    },
    {
      to: '/applications',
      label: 'Applications',
      icon: BriefcaseBusiness
    },
    {
      to: '/board',
      label: 'Kanban Board',
      icon: Columns3
    },
    {
      to: '/calendar',
      label: 'Calendar',
      icon: CalendarDays
    },
    {
      to: '/emails',
      label: 'Job Emails',
      icon: Mail
    },
    {
      to: '/settings',
      label: 'Data & Settings',
      icon: Settings
    }
  ]

  const activeApplications = applications.filter(
    (app) => !['Rejected', 'Withdrawn'].includes(app.status)
  ).length

  const interviewApplications = applications.filter(
    (app) => app.status === 'Interview'
  ).length

  const offerApplications = applications.filter(
    (app) => app.status === 'Offer'
  ).length

  return (
    <div className="app-shell">

      {/* SIDEBAR */}
      <aside className="sidebar">

        <div className="brand">
          <div className="brand-mark">
            <img
              src={applyTrackLogo}
              alt="ApplyTrack"
            />
          </div>

          <span>ApplyTrack</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={18} />

              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* PIPELINE SUMMARY */}
        <div className="sidebar-summary">

          <span className="eyebrow">
            PIPELINE
          </span>

          <SummaryRow
            label="Total"
            value={applications.length}
          />

          <SummaryRow
            label="Active"
            value={activeApplications}
          />

          <SummaryRow
            label="Interview"
            value={interviewApplications}
          />

          <SummaryRow
            label="Offers"
            value={offerApplications}
          />

        </div>

        {/* SIDEBAR FOOTER */}
        <button
          type="button"
          className="sidebar-footer sidebar-footer-button"
          onClick={() => setAboutOpen(true)}
        >

          <div className="user-avatar">
            <img
              src={applyTrackLogo}
              alt="ApplyTrack"
            />
          </div>

          <div>
            <strong>ApplyTrack</strong>

            <small>Local workspace</small>
          </div>

        </button>

      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">

        {/* CHANGED: .page-content now wraps AnimatePresence + a motion.div keyed by route,
            instead of wrapping <Routes> directly */}
        <div className="page-content">

          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
            >

              <Routes location={location}>

                <Route
                  path="/"
                  element={
                    <Dashboard
                      applications={applications}
                      onAdd={() => setFormOpen(true)}
                      onOpen={(id) =>
                        navigate(`/applications/${id}`)
                      }
                    />
                  }
                />

                <Route
                  path="/applications"
                  element={
                    <Applications
                      applications={applications}
                      onAdd={() => setFormOpen(true)}
                      onOpen={(id) =>
                        navigate(`/applications/${id}`)
                      }
                    />
                  }
                />

                <Route
                  path="/applications/:id"
                  element={
                    <ApplicationDetails
                      applications={applications}
                      onUpdate={updateApplication}
                      onDelete={requestDelete}
                      onEdit={editApplication}
                    />
                  }
                />

                <Route
                  path="/board"
                  element={
                    <KanbanBoard
                      applications={applications}
                      onOpen={(id) =>
                        navigate(`/applications/${id}`)
                      }
                      onStatusChange={updateApplication}
                    />
                  }
                />

                <Route
                  path="/calendar"
                  element={
                    <CalendarPage
                      applications={applications}
                      onOpen={(id) => navigate(`/applications/${id}`)}
                    />
                  }
                />
                 
                <Route
                  path="/emails"
                  element={
                    <JobEmails
                      applications={applications}
                      onAddApplication={addApplication}
                      onUpdateApplication={updateApplication}
                    />
                  }
                />

                <Route
                  path="/settings"
                  element={
                    <DataSettings 
                    applications ={applications}
                    onImport ={setApplications}
                    onReset={() => setApplications([])}
                    />
                  }
                />

              </Routes>

            </motion.div>
          </AnimatePresence>

        </div>

      </main>

      {/* ADD APPLICATION MODAL */}
      {formOpen && (
        <ApplicationForm
          onClose={() => {
            setFormOpen(false)
            setEditingApplication(null)
          }}
          onSave={
            editingApplication
              ? saveEditedApplication
              : addApplication
          }
          initialData={editingApplication}
        />
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <DeleteConfirmation
          application={deleteTarget}
          onCancel={cancelDelete}
          onConfirm={confirmDelete}
        />
      )}

      {/* ABOUT MODAL */}
      {aboutOpen && (
        <AboutModal onClose={() => setAboutOpen(false)} />
      )}

    </div>
  )
}

function AboutModal({ onClose }) {
  return (
    <div className="confirmation-overlay" onClick={onClose}>

      <div
        className="confirmation-modal about-modal"
        onClick={(e) => e.stopPropagation()}
      >

        <button
          className="confirmation-close"
          onClick={onClose}
          aria-label="Close about"
        >
          <X size={19} />
        </button>

        <div className="about-mark">
          <img
            src={applyTrackLogo}
            alt="ApplyTrack"
          />
        </div>

        <h2>ApplyTrack</h2>

        <span className="about-version">Version 1.0</span>

        <div className="about-credits">

          <p>
            Designed &amp; Developed by
            <strong>Justin Villanueva</strong>
          </p>


        </div>

        <p className="about-copyright">
          © 2026 Justin Villanueva
        </p>

      </div>

    </div>
  )
}

function SummaryRow({ label, value }) {
  return (
    <div className="summary-row">
      <span>{label}</span>

      <strong>{value}</strong>
    </div>
  )
}

function DeleteConfirmation({
  application,
  onCancel,
  onConfirm
}) {
  return (
    <div className="confirmation-overlay">

      <div className="confirmation-modal">

        <button
          className="confirmation-close"
          onClick={onCancel}
          aria-label="Close confirmation"
        >
          <X size={19} />
        </button>

        <div className="confirmation-icon">
          <AlertTriangle size={28} />
        </div>

        <h2>Delete application?</h2>

        <p>
          Are you sure you want to delete your application for{' '}
          <strong>{application.company}</strong>?
        </p>

        <div className="delete-application-info">

          <div className="delete-company-icon">
            {application.company?.charAt(0)?.toUpperCase()}
          </div>

          <div>

            <strong>
              {application.company}
            </strong>

            <span>
              {application.position}
            </span>

          </div>

        </div>

        <p className="delete-warning">
          This action cannot be undone.
        </p>

        <div className="confirmation-actions">

          <button
            className="secondary-button"
            onClick={onCancel}
          >
            Cancel
          </button>

          <button
            className="delete-button"
            onClick={onConfirm}
          >
            Delete Application
          </button>

        </div>

      </div>

    </div>
  )
}