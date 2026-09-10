import { useRef, useState } from 'react'
import {
  Database,
  Download,
  Upload,
  X,
  AlertTriangle,
  FileJson,
  Loader2
} from 'lucide-react'

export default function DataSettings({
  applications,
  onImport,
  onReset
}) {
  const fileInputRef = useRef(null)

  const [importData, setImportData] = useState(null)
  const [importError, setImportError] = useState('')
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [isReading, setIsReading] = useState(false)

  const exportBackup = () => {
    const backup = {
      version: 1,
      appName: 'ApplyTrack',
      exportDate: new Date().toISOString(),
      applications
    }

    const backupData = JSON.stringify(
      backup,
      null,
      2
    )

    const blob = new Blob(
      [backupData],
      {
        type: 'application/json'
      }
    )

    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')

    const date = new Date()
      .toISOString()
      .slice(0, 10)

    link.href = url
    link.download = `ApplyTrack-Backup-${date}.json`

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]

    if (!file) return

    setImportError('')
    setImportData(null)

    if (!file.name.toLowerCase().endsWith('.json')) {
      setImportError(
        'Please select a valid ApplyTrack backup file.'
      )

      event.target.value = ''
      return
    }

    setIsReading(true)

    const reader = new FileReader()

    reader.onload = (loadEvent) => {
      setIsReading(false)

      try {
        const backup = JSON.parse(
          loadEvent.target.result
        )

        if (
          backup.appName !== 'ApplyTrack' ||
          !Array.isArray(backup.applications)
        ) {
          setImportError(
            'This file is not a valid ApplyTrack backup.'
          )

          return
        }

        setImportData(backup)
        setImportModalOpen(true)

      } catch {
        setImportError(
          'Unable to read this backup file. Please select a valid JSON file.'
        )
      }
    }

    reader.onerror = () => {
      setIsReading(false)

      setImportError(
        'Something went wrong while reading this file. Please try again.'
      )
    }

    reader.readAsText(file)

    // Allows the same file to be selected again if needed
    event.target.value = ''
  }

  const confirmImport = () => {
    if (!importData) return

    onImport(importData.applications)

    setImportData(null)
    setImportModalOpen(false)
  }

  const cancelImport = () => {
    setImportData(null)
    setImportModalOpen(false)
  }

  const requestReset = () => {
    setResetModalOpen(true)
  }

  const confirmReset = () => {
    onReset()
    setResetModalOpen(false)
  }

  const cancelReset = () => {
    setResetModalOpen(false)
  }

  const formatBackupDate = (isoString) => {
    if (!isoString) return null

    const date = new Date(isoString)

    if (Number.isNaN(date.getTime())) return null

    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">SETTINGS</p>

          <h1>Data & Settings</h1>

          <p>
            Manage and protect your ApplyTrack data.
          </p>
        </div>
      </section>

      <div className="settings-grid">

        {/* BACKUP */}
        <section className="panel settings-panel">

          <div className="settings-icon icon-blue">
            <Database size={24} />
          </div>

          <div>
            <h2>Backup Your Data</h2>

            <p>
              Create a backup of your applications,
              notes, interviews, and reminders.
            </p>
          </div>

          <span className="settings-tag">
            JSON file · everything included
          </span>

          <div className="settings-panel-footer">
            <button
              className="primary-button"
              onClick={exportBackup}
            >
              <Download size={18} />
              Export Backup
            </button>
          </div>

        </section>

        {/* RESTORE */}
        <section className="panel settings-panel">

          <div className="settings-icon icon-violet">
            <Upload size={24} />
          </div>

          <div>
            <h2>Restore Your Data</h2>

            <p>
              Import a previous ApplyTrack backup
              to restore your saved data.
            </p>
          </div>

          <span className="settings-tag">
            Replaces your current data
          </span>

          <div className="settings-panel-footer">
            <button
              className={`secondary-button${isReading ? ' processing' : ''}`}
              onClick={handleImportClick}
              disabled={isReading}
            >
              {isReading
                ? <Loader2 size={18} className="spin" />
                : <Upload size={18} />}
              {isReading ? 'Reading file…' : 'Import Backup'}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            {importError && (
              <small className="settings-error">
                <AlertTriangle size={13} />
                {importError}
              </small>
            )}
          </div>

        </section>

      </div>

      {/* DANGER ZONE */}
      <section className="settings-section danger-zone">

        <div className="settings-section-heading">
          <h2>Danger Zone</h2>

          <p>
            Permanently remove all your
            application data.
          </p>
        </div>

        <div className="settings-card danger-card">

          <div className="settings-card-info">

            <div className="settings-icon danger-icon">
              <AlertTriangle size={20} />
            </div>

            <div>
              <h3>Reset All Data</h3>

              <p>
                {applications.length === 0
                  ? 'Your workspace is empty — there’s nothing to reset.'
                  : `Delete all ${applications.length} application${
                      applications.length !== 1 ? 's' : ''
                    } from your ApplyTrack workspace.`}
              </p>
            </div>

          </div>

          <div className="danger-card-actions">

            {applications.length > 0 && (
              <button
                className="text-button"
                onClick={exportBackup}
              >
                <Download size={14} />
                Back up first
              </button>
            )}

            <button
              className="delete-button"
              onClick={requestReset}
              disabled={applications.length === 0}
            >
              Reset All Data
            </button>

          </div>

        </div>

      </section>

      {/* IMPORT CONFIRMATION */}
      {importModalOpen && importData && (
        <div
          className="confirmation-overlay"
          onClick={cancelImport}
        >

          <div
            className="confirmation-modal"
            onClick={(event) => event.stopPropagation()}
          >

            <button
              className="confirmation-close"
              onClick={cancelImport}
              aria-label="Close"
            >
              <X size={19} />
            </button>

            <div className="confirmation-icon">
              <Upload size={28} />
            </div>

            <h2>Restore backup?</h2>

            <p>
              This will replace your current{' '}
              <strong>
                {applications.length}
              </strong>{' '}
              application
              {applications.length !== 1
                ? 's'
                : ''} with the data from this backup.
            </p>

            <div className="import-receipt">
              <div className="import-receipt-icon">
                <FileJson size={20} />
              </div>

              <div>
                <strong>
                  {importData.applications.length} application
                  {importData.applications.length !== 1 ? 's' : ''}
                </strong>

                <span>
                  {formatBackupDate(importData.exportDate)
                    ? `Backed up on ${formatBackupDate(importData.exportDate)}`
                    : 'Backup date unknown'}
                </span>
              </div>
            </div>

            <p className="delete-warning">
              This action cannot be undone.
            </p>

            <div className="confirmation-actions">

              <button
                className="secondary-button"
                onClick={cancelImport}
              >
                Cancel
              </button>

              <button
                className="primary-button"
                onClick={confirmImport}
              >
                Restore Backup
              </button>

            </div>

          </div>

        </div>
      )}

      {/* RESET CONFIRMATION */}
      {resetModalOpen && (
        <div
          className="confirmation-overlay"
          onClick={cancelReset}
        >

          <div
            className="confirmation-modal"
            onClick={(event) => event.stopPropagation()}
          >

            <button
              className="confirmation-close"
              onClick={cancelReset}
              aria-label="Close"
            >
              <X size={19} />
            </button>

            <div className="confirmation-icon">
              <AlertTriangle size={28} />
            </div>

            <h2>Reset all data?</h2>

            <p>
              You are about to permanently delete all{' '}
              <strong>
                {applications.length}
              </strong>{' '}
              application
              {applications.length !== 1
                ? 's'
                : ''}.
            </p>

            <p className="delete-warning">
              This action cannot be undone. Consider
              exporting a backup before continuing.
            </p>

            <div className="confirmation-actions">

              <button
                className="secondary-button"
                onClick={cancelReset}
              >
                Cancel
              </button>

              <button
                className="delete-button"
                onClick={confirmReset}
              >
                Yes, Reset Everything
              </button>

            </div>

          </div>

        </div>
      )}
    </>
  )
}