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
  LogIn,
  Sparkles,
  Plus,
  ArrowRight,
  EyeOff,
  BadgeCheck
} from 'lucide-react'
import GmailSettings from './GmailSettings'
import AISettings from './AISettings'
import { detectEmailEvents, buildAiDetections } from '../data/emailDetection'

const PROCESSED_EMAILS_KEY = 'applytrack-processed-emails-v1'
const AI_CACHE_KEY = 'applytrack-ai-extraction-cache-v1'
const USE_AI_KEY = 'applytrack-use-ai-extraction-v1'

// Categories worth spending an API call on. Skips job-alert/
// recommendation emails (job_opportunity) and anything gmail.cjs
// couldn't classify at all, since those are never going to produce
// a usable suggestion anyway.
const AI_CANDIDATE_CATEGORIES = [
  'application_update',
  'interview',
  'job_offer',
  'rejection',
  'recruiter_message'
]

function loadProcessedEmailIds() {
  try {
    const saved = localStorage.getItem(PROCESSED_EMAILS_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

function loadExtractionCache() {
  try {
    const saved = localStorage.getItem(AI_CACHE_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

function persistExtractionCache(cache) {
  try {
    localStorage.setItem(AI_CACHE_KEY, JSON.stringify(cache))
  } catch (storageError) {
    console.error('Unable to save AI extraction cache:', storageError)
  }
}

function loadUseAiPreference() {
  try {
    const saved = localStorage.getItem(USE_AI_KEY)
    // No explicit preference saved yet — default to on; it only
    // actually does anything once a key is configured anyway.
    return saved === null ? true : saved === 'true'
  } catch {
    return true
  }
}

export default function JobEmails({
  applications = [],
  onAddApplication,
  onUpdateApplication
}) {
  const [emails, setEmails] = useState([])

  // Email ids the user has already confirmed or ignored, so a
  // Gmail refresh doesn't keep re-suggesting the same detection.
  const [processedEmailIds, setProcessedEmailIds] = useState(loadProcessedEmailIds)

  // { configured: boolean, connected: boolean }
  const [gmailStatus, setGmailStatus] = useState({
    configured: false,
    connected: false
  })

  const [loading, setLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')
  const [showSettings, setShowSettings] = useState(false)

  // ---------- AI-powered extraction (optional) ----------
  const [aiStatus, setAiStatus] = useState({ configured: false })
  const [useAiExtraction, setUseAiExtraction] = useState(loadUseAiPreference)
  const [extractionCache, setExtractionCache] = useState(loadExtractionCache)
  const [extracting, setExtracting] = useState(false)
  const [aiError, setAiError] = useState('')
  const [showAiSettings, setShowAiSettings] = useState(false)

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

  const refreshAiStatus = async () => {
    if (!window.electronAPI?.aiStatus) return

    try {
      const result = await window.electronAPI.aiStatus()
      setAiStatus({ configured: !!result?.configured })
    } catch (statusError) {
      console.error('Unable to check AI status:', statusError)
    }
  }

  useEffect(() => {
    refreshStatus()
    refreshAiStatus()

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

  // ---------- Smart Email Application Tracking ----------
  //
  // When AI extraction is on and configured, this effect sends any
  // not-yet-extracted, not-yet-processed, relevant-category emails
  // to Gemini (via the main process) and caches the result per email
  // id — so switching pages, re-rendering, or an unrelated
  // `applications` change never re-triggers an API call for an email
  // that's already been analyzed.
  useEffect(() => {
    if (!useAiExtraction || !aiStatus.configured) return
    if (!window.electronAPI?.extractEmailFields) return

    const candidates = emails.filter(
      (email) =>
        email?.id &&
        !processedEmailIds.includes(email.id) &&
        !(email.id in extractionCache) &&
        AI_CANDIDATE_CATEGORIES.includes(email.category)
    )

    if (!candidates.length) return

    let cancelled = false

    setExtracting(true)
    setAiError('')

    window.electronAPI.extractEmailFields(candidates)
      .then((response) => {
        if (cancelled) return

        if (!response?.success) {
          setAiError(response?.error || 'Unable to reach Gemini for email extraction.')
          return
        }

        const results = response.results || []

        setExtractionCache((prev) => {
          const next = { ...prev }
          for (const result of results) {
            next[result.emailId] = result
          }
          persistExtractionCache(next)
          return next
        })

        const failedCount = results.filter((result) => result.error).length

        if (failedCount) {
          setAiError(
            `Gemini couldn't analyze ${failedCount} email${failedCount === 1 ? '' : 's'} — falling back to basic detection for ${failedCount === 1 ? 'it' : 'those'}.`
          )
        }
      })
      .catch((extractError) => {
        if (!cancelled) {
          setAiError(extractError.message || 'Unable to reach Gemini for email extraction.')
        }
      })
      .finally(() => {
        if (!cancelled) setExtracting(false)
      })

    return () => {
      cancelled = true
    }
    // extractionCache intentionally excluded: including it would
    // re-run this effect every time it's updated by this same
    // effect, re-checking candidates against a closure that's about
    // to be stale anyway. It only needs to be current at the moment
    // emails/processedEmailIds/AI settings change, which is what the
    // listed deps already cover.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emails, processedEmailIds, useAiExtraction, aiStatus.configured])

  // Recomputed automatically whenever the email list, the
  // applications list, the processed-ids set, or the AI extraction
  // cache changes — so a suggestion disappears the instant it's
  // confirmed/ignored, and a freshly fetched or freshly extracted
  // email is picked up without any extra wiring.
  const suggestions = useMemo(() => {
    if (!(useAiExtraction && aiStatus.configured)) {
      return detectEmailEvents(emails, applications, processedEmailIds)
    }

    const unprocessedEmails = emails.filter(
      (email) => email?.id && !processedEmailIds.includes(email.id)
    )

    const aiExtractions = []
    const fallbackEmails = []

    for (const email of unprocessedEmails) {
      const extraction = extractionCache[email.id]

      if (extraction && !extraction.error) {
        aiExtractions.push(extraction)
      } else if (extraction && extraction.error) {
        // Gemini failed on this specific email (bad JSON, rate
        // limit, etc.) — fall back to the rule-based pass just for
        // this one rather than losing the suggestion entirely.
        fallbackEmails.push(email)
      }
      // No extraction yet (still loading, or not a relevant
      // category) — no suggestion until/unless one arrives.
    }

    const aiSuggestions = buildAiDetections(aiExtractions, emails, applications)

    const fallbackSuggestions = fallbackEmails.length
      ? detectEmailEvents(fallbackEmails, applications, processedEmailIds)
      : []

    return [...aiSuggestions, ...fallbackSuggestions]
  }, [emails, applications, processedEmailIds, useAiExtraction, aiStatus.configured, extractionCache])

  const markProcessed = (emailId) => {
    setProcessedEmailIds((prev) => {
      if (prev.includes(emailId)) return prev

      const next = [...prev, emailId]

      try {
        localStorage.setItem(PROCESSED_EMAILS_KEY, JSON.stringify(next))
      } catch (storageError) {
        console.error('Unable to save processed email state:', storageError)
      }

      return next
    })
  }

  const confirmNewApplication = (suggestion) => {
    onAddApplication?.(
      {
        company: suggestion.company,
        position: suggestion.position,
        status: 'Applied',
        appliedDate: new Date().toISOString().slice(0, 10),
        location: ''
      },
      { navigateToDetails: false }
    )

    markProcessed(suggestion.emailId)
  }

  const confirmStatusUpdate = (suggestion) => {
    onUpdateApplication?.(suggestion.matchedApplicationId, {
      status: suggestion.suggestedStatus
    })

    markProcessed(suggestion.emailId)
  }

  const ignoreSuggestion = (suggestion) => {
    markProcessed(suggestion.emailId)
  }

  const toggleUseAiExtraction = () => {
    setUseAiExtraction((prev) => {
      const next = !prev
      try {
        localStorage.setItem(USE_AI_KEY, String(next))
      } catch (storageError) {
        console.error('Unable to save AI extraction preference:', storageError)
      }
      return next
    })
  }

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

      <section className="ai-status-bar">
        <div className="ai-status-bar-info">
          <Sparkles size={16} />

          <span>
            {!aiStatus.configured
              ? 'AI extraction is off — set up a Gemini API key to read emails with AI instead of keyword matching.'
              : useAiExtraction
                ? extracting
                  ? 'Analyzing emails with Gemini...'
                  : 'AI extraction is on.'
                : 'AI extraction is off — using basic keyword detection.'}
          </span>
        </div>

        <div className="ai-status-bar-actions">
          {aiStatus.configured && (
            <button
              type="button"
              className="ai-toggle-button"
              onClick={toggleUseAiExtraction}
              aria-pressed={useAiExtraction}
            >
              {useAiExtraction ? 'On' : 'Off'}
            </button>
          )}

          <button
            type="button"
            className="icon-button"
            onClick={() => setShowAiSettings(true)}
            title="AI extraction settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </section>

      {aiError && (
        <div className="settings-error">
          {aiError}
        </div>
      )}

      {suggestions.length > 0 && (
        <section className="gmail-suggestions-section">

          <div className="gmail-section-heading">
            <div>
              <p className="eyebrow">SMART TRACKING</p>
              <h2>Email Updates</h2>
              <p className="gmail-suggestions-subtitle">
                Detected from your recent emails. Nothing changes in your
                tracker until you confirm.
              </p>
            </div>

            <span className="email-count">
              {suggestions.length} pending
            </span>
          </div>

          <div className="gmail-suggestions-list">
            {suggestions.map((suggestion) => (
              <article
                className={`panel email-suggestion-card confidence-${suggestion.confidence}`}
                key={suggestion.emailId}
              >
                <div className="email-suggestion-top">
                  <span className={`email-suggestion-type ${suggestion.type}`}>
                    <Sparkles size={14} />
                    {suggestion.type === 'new_application'
                      ? 'New Application Detected'
                      : 'Possible Status Update'}
                  </span>

                  <span className={`confidence-pill confidence-${suggestion.confidence}`}>
                    {suggestion.confidence} confidence
                  </span>

                  {suggestion.source === 'ai' && (
                    <span className="suggestion-source-badge">
                      via Gemini
                    </span>
                  )}
                </div>

                <h3>
                  {suggestion.company}
                  {suggestion.position && suggestion.type === 'new_application' && (
                    <> — {suggestion.position}</>
                  )}
                  {suggestion.type === 'status_update' && (
                    <> — {suggestion.position}</>
                  )}
                </h3>

                {suggestion.type === 'status_update' && (
                  <div className="status-change-preview">
                    <span>{suggestion.currentStatus}</span>
                    <ArrowRight size={14} />
                    <span className="status-change-target">
                      {suggestion.suggestedStatus}
                    </span>
                  </div>
                )}

                <p className="email-suggestion-reason">
                  {suggestion.reason}
                </p>

                <p className="email-suggestion-source">
                  From: {suggestion.subject || '(No subject)'}
                </p>

                <div className="email-suggestion-actions">
                  <button
                    className="secondary-button"
                    onClick={() => ignoreSuggestion(suggestion)}
                  >
                    <EyeOff size={16} />
                    Ignore
                  </button>

                  {suggestion.type === 'new_application' ? (
                    <button
                      className="primary-button"
                      onClick={() => confirmNewApplication(suggestion)}
                    >
                      <Plus size={16} />
                      Add Application
                    </button>
                  ) : (
                    <button
                      className="primary-button"
                      onClick={() => confirmStatusUpdate(suggestion)}
                    >
                      <BadgeCheck size={16} />
                      Change to {suggestion.suggestedStatus}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>

        </section>
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

      {showAiSettings && (
        <AISettings
          status={aiStatus}
          onClose={() => setShowAiSettings(false)}
          onSaved={() => {
            setShowAiSettings(false)
            refreshAiStatus()
          }}
          onCleared={() => {
            setExtractionCache({})
            persistExtractionCache({})
            refreshAiStatus()
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

              {selectedEmail.bodyHtml ? (
                <iframe
                  className="gmail-modal-iframe"
                  sandbox="allow-same-origin allow-popups"
                  srcDoc={selectedEmail.bodyHtml}
                  title="Email content"
                />
              ) : (
                <p>
                  {selectedEmail.body ||
                    selectedEmail.snippet ||
                    'No preview available for this email.'}
                </p>
              )}
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