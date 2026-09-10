import { useEffect, useMemo, useState } from 'react'
import {
  Mail,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  LoaderCircle,
  X,
  Clock,
  User,
  Tag,
  Settings,
  LogIn
} from 'lucide-react'
import GmailSettings from './GmailSettings'

export default function JobEmails() {
  const [emails, setEmails] = useState([])

  // { configured: boolean, connected: boolean }
  const [gmailStatus, setGmailStatus] = useState({
    configured: false,
    connected: false
  })

  const [loading, setLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')
  const [showSettings, setShowSettings] = useState(false)

  // Category filter
  const [activeCategory, setActiveCategory] = useState('all')

  // Details modal
  const [selectedEmail, setSelectedEmail] = useState(null)

  const refreshStatus = async () => {
    if (!window.electronAPI?.gmailStatus) {
      return
    }

    try {
      const result = await window.electronAPI.gmailStatus()

      setGmailStatus({
        configured: !!result?.configured,
        connected: !!result?.connected
      })

      // Only pop the setup form open automatically the first time,
      // when nothing has been configured yet.
      setShowSettings((prev) => prev || !result?.configured)
    } catch (statusError) {
      console.error(
        'Unable to check Gmail status:',
        statusError
      )
    }
  }

  useEffect(() => {
    refreshStatus()

    // Repopulate instantly from whatever was already fetched the
    // last time this page was open, without hitting the Gmail API
    // again — so navigating away and back doesn't lose your list.
    const loadCachedEmails = async () => {
      if (!window.electronAPI?.getCachedEmails) return

      const result = await window.electronAPI.getCachedEmails()

      if (result?.success && result.emails?.length) {
        setEmails(result.emails)
      }
    }

    loadCachedEmails()

    let unsubscribeEmails
    if (window.electronAPI?.onEmailsUpdated) {
      unsubscribeEmails = window.electronAPI.onEmailsUpdated((newEmails) => {
        setEmails(newEmails)
      })
    }

    return () => {
      if (unsubscribeEmails) unsubscribeEmails()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleConnect = async () => {
    setError('')
    setConnecting(true)

    try {
      if (!window.electronAPI?.connectGmail) {
        throw new Error(
          'Gmail integration is only available in the ApplyTrack desktop app.'
        )
      }

      const result = await window.electronAPI.connectGmail()

      if (!result?.success) {
        throw new Error(result?.error || 'Unable to connect Gmail.')
      }

      await refreshStatus()
    } catch (connectError) {
      setError(connectError.message)
    } finally {
      setConnecting(false)
    }
  }

  const checkEmails = async () => {
    setLoading(true)
    setError('')

    try {
      if (!window.electronAPI?.getRecentEmails) {
        throw new Error(
          'Gmail integration is only available in the ApplyTrack desktop app.'
        )
      }

      const result =
        await window.electronAPI.getRecentEmails()

      if (!result.success) {
        throw new Error(
          result.error ||
          'Unable to retrieve Gmail messages.'
        )
      }

      // No need to setEmails here — the main process broadcasts the
      // same result via 'emails:updated', which the subscription
      // above already listens for. Keeping a single source of truth
      // avoids the two ever getting out of sync.
      setGmailStatus((prev) => ({ ...prev, connected: true }))
    } catch (checkError) {
      console.error(
        'Unable to retrieve Gmail messages:',
        checkError
      )

      setError(checkError.message)
    } finally {
      setLoading(false)
    }
  }

  // ---------- Formatting helpers ----------

  const formatCategory = (category) => {
    if (!category) return 'Other Job Related'

    return category
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      )
  }

  // ---------- Category filters ----------

  const categories = useMemo(() => {
    const unique = new Set(
      emails.map((email) => email.category || 'other')
    )
    return Array.from(unique)
  }, [emails])

  const filteredEmails = useMemo(() => {
    if (activeCategory === 'all') return emails

    return emails.filter(
      (email) => (email.category || 'other') === activeCategory
    )
  }, [emails, activeCategory])

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">GMAIL INTEGRATION</p>

          <h1>Job Emails</h1>

          <p>
            View job-related emails from your connected Gmail account.
          </p>
        </div>
      </section>

      <section className="panel gmail-status-panel">

        <div className="gmail-status-info">

          <div className="settings-icon">
            <Mail size={24} />
          </div>

          <div>
            <h2>Gmail</h2>

            <p>
              {!gmailStatus.configured
                ? 'Set up your Gmail OAuth credentials to get started.'
                : gmailStatus.connected
                  ? 'Your Gmail account is connected.'
                  : 'Credentials are set up — sign in to connect your account.'
              }
            </p>
          </div>

        </div>

        <div className="gmail-status-badge">
          {gmailStatus.connected ? (
            <>
              <CheckCircle size={16} />
              Connected
            </>
          ) : (
            <>
              <AlertCircle size={16} />
              Not Connected
            </>
          )}
        </div>

        <button
          type="button"
          className="icon-button gmail-settings-button"
          onClick={() => setShowSettings((prev) => !prev)}
          title="Gmail settings"
        >
          <Settings size={18} />
        </button>

      </section>

      <section className="gmail-actions">

        {gmailStatus.configured && !gmailStatus.connected ? (
          <button
            className="primary-button"
            onClick={handleConnect}
            disabled={connecting}
          >
            {connecting ? (
              <LoaderCircle size={18} className="spin" />
            ) : (
              <LogIn size={18} />
            )}
            {connecting ? 'Connecting...' : 'Connect Gmail'}
          </button>
        ) : (
          <button
            className="primary-button"
            onClick={checkEmails}
            disabled={loading || !gmailStatus.connected}
          >
            {loading ? (
              <LoaderCircle
                size={18}
                className="spin"
              />
            ) : (
              <RefreshCw size={18} />
            )}

            {loading
              ? 'Checking Emails...'
              : 'Check Recent Emails'
            }
          </button>
        )}

      </section>

      {error && (
        <div className="settings-error">
          {error}
        </div>
      )}

      <section className="gmail-emails-section">

        <div className="gmail-section-heading">

          <div>
            <p className="eyebrow">
              RECENT ACTIVITY
            </p>

            <h2>
              Recent Job Emails
            </h2>
          </div>

          {emails.length > 0 && (
            <span className="email-count">
              {filteredEmails.length} of {emails.length}
            </span>
          )}

        </div>

        {emails.length > 0 && (
          <div className="gmail-category-filters">
            <button
              className={`category-filter-pill ${activeCategory === 'all' ? 'active' : ''}`}
              onClick={() => setActiveCategory('all')}
            >
              All
            </button>

            {categories.map((category) => (
              <button
                key={category}
                className={`category-filter-pill ${activeCategory === category ? 'active' : ''}`}
                onClick={() => setActiveCategory(category)}
              >
                {formatCategory(category)}
              </button>
            ))}
          </div>
        )}

        {emails.length === 0 && !loading && gmailStatus.connected && (
          <div className="panel gmail-empty-state">

            <Mail size={32} />

            <h3>No emails loaded yet</h3>

            <p>
              Click "Check Recent Emails" to look for
              job-related messages in your Gmail account.
            </p>

          </div>
        )}

        {emails.length > 0 && filteredEmails.length === 0 && (
          <div className="panel gmail-empty-state">
            <Mail size={32} />
            <h3>No emails in this category</h3>
            <p>Try a different filter above.</p>
          </div>
        )}

        <div className="gmail-email-list">

          {filteredEmails.map((email) => (
            <article
              className="panel gmail-email-card"
              key={email.id}
              onClick={() => setSelectedEmail(email)}
            >

              <div className="gmail-email-top">

                <div className="gmail-email-header">

                  <strong>
                    {email.subject || '(No subject)'}
                  </strong>

                  <span
                    className={`email-category ${email.category || ''}`}
                  >
                    {formatCategory(email.category)}
                  </span>

                </div>

              </div>

              <div className="gmail-email-meta">

                <span>
                  {email.from}
                </span>

                <span>
                  {email.date}
                </span>

              </div>

              {email.snippet && (
                <p className="gmail-email-snippet">
                  {email.snippet}
                </p>
              )}

            </article>
          ))}

        </div>

      </section>

      {showSettings && (
        <GmailSettings
          status={gmailStatus}
          onClose={() => setShowSettings(false)}
          onSaved={() => {
            setShowSettings(false)
            refreshStatus()
          }}
          onCleared={() => {
            setEmails([])
            refreshStatus()
          }}
        />
      )}

      {selectedEmail && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedEmail(null)}
        >
          <div
            className="modal gmail-email-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>{selectedEmail.subject || '(No subject)'}</h2>
                <p>Job email details</p>
              </div>

              <button
                className="icon-button"
                onClick={() => setSelectedEmail(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="gmail-modal-badges">
              <span
                className={`email-category ${selectedEmail.category || ''}`}
              >
                <Tag size={12} />
                {formatCategory(selectedEmail.category)}
              </span>
            </div>

            <dl className="detail-list">
              <div>
                <dt><User size={12} /> From</dt>
                <dd>{selectedEmail.from}</dd>
              </div>

              <div>
                <dt><Clock size={12} /> Received</dt>
                <dd>{selectedEmail.date}</dd>
              </div>
            </dl>

            <div className="gmail-modal-body">
              <p className="eyebrow">MESSAGE</p>
              <p>
                {selectedEmail.body ||
                  selectedEmail.snippet ||
                  'No preview available for this email.'}
              </p>
            </div>

            <div className="modal-actions">
              <button
                className="secondary-button"
                onClick={() => setSelectedEmail(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}