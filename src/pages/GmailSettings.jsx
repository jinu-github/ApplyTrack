import { useState } from 'react'
import {
  ShieldCheck,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  LoaderCircle,
  Trash2,
  X
} from 'lucide-react'

export default function GmailSettings({ status, onClose, onSaved, onCleared }) {
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showTutorial, setShowTutorial] = useState(!status?.configured)

  const handleSave = async (event) => {
    event.preventDefault()
    setError('')

    if (!clientId.trim() || !clientSecret.trim()) {
      setError('Enter both the Client ID and Client Secret.')
      return
    }

    setSaving(true)

    try {
      if (!window.electronAPI?.saveGmailCredentials) {
        throw new Error(
          'Gmail settings are only available in the ApplyTrack desktop app.'
        )
      }

      const result = await window.electronAPI.saveGmailCredentials({
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim()
      })

      if (!result?.success) {
        throw new Error(result?.error || 'Unable to save credentials.')
      }

      setClientId('')
      setClientSecret('')
      onSaved?.()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    try {
      await window.electronAPI?.clearGmailCredentials?.()
      onCleared?.()
    } catch (clearError) {
      setError(clearError.message)
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
    >
      <div
        className="modal gmail-settings-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2>Gmail Setup</h2>
            <p>
              Connect your own Google account by creating a free OAuth
              client — this keeps your credentials on your machine only.
            </p>
          </div>

          <button
            className="icon-button"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <button
          type="button"
          className="secondary-button gmail-tutorial-toggle"
          onClick={() => setShowTutorial((prev) => !prev)}
        >
          {showTutorial ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          How do I get a Client ID and Client Secret?
        </button>

        {showTutorial && (
          <div className="gmail-tutorial">
            <ol>
              <li>
                Go to the{' '}
                <a
                  href="https://console.cloud.google.com/projectcreate"
                  target="_blank"
                  rel="noreferrer"
                >
                  Google Cloud Console <ExternalLink size={12} />
                </a>{' '}
                and create a new project (any name works, e.g. "ApplyTrack").
              </li>
              <li>
                Open <strong>APIs &amp; Services → Library</strong>, search
                for <strong>Gmail API</strong>, and click <strong>Enable</strong>.
              </li>
              <li>
                Go to <strong>APIs &amp; Services → OAuth consent screen</strong>.
                Choose <strong>External</strong>, fill in the required app
                name and support email, and add yourself as a{' '}
                <strong>test user</strong> so you can sign in without
                publishing the app.
              </li>
              <li>
                Go to <strong>APIs &amp; Services → Credentials → Create
                Credentials → OAuth client ID</strong>. Choose{' '}
                <strong>Desktop app</strong> as the application type.
              </li>
              <li>
                Under <strong>Authorized redirect URIs</strong>, add exactly:{' '}
                <code>http://127.0.0.1:3000/oauth2callback</code>
              </li>
              <li>
                Click <strong>Create</strong>. Google will show you a{' '}
                <strong>Client ID</strong> and <strong>Client Secret</strong> —
                copy both into the fields below.
              </li>
            </ol>

            <div className="gmail-security-note">
              <ShieldCheck size={16} />
              <p>
                <strong>Where this is stored:</strong> your Client ID and
                Secret are encrypted with your operating system's secure
                credential store (Keychain on macOS, Credential Manager on
                Windows, libsecret on Linux) before being written to disk.
                They stay on this device and are only ever sent directly to
                Google's OAuth servers when you sign in — never to any
                ApplyTrack server, because there isn't one. Only the
                read-only Gmail scope is requested, so ApplyTrack can view
                messages but never send, delete, or modify anything in your
                inbox.
              </p>
            </div>
          </div>
        )}

        <form className="gmail-credentials-form" onSubmit={handleSave}>
          <div className="form-grid">
            <label>
              Client ID
              <input
                type="text"
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                placeholder="xxxxxxxxxx.apps.googleusercontent.com"
                autoComplete="off"
                spellCheck={false}
              />
            </label>

            <label>
              Client Secret
              <input
                type="password"
                value={clientSecret}
                onChange={(event) => setClientSecret(event.target.value)}
                placeholder="GOCSPX-••••••••••••"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
          </div>

          {error && <div className="settings-error">{error}</div>}

          <div className="modal-actions gmail-settings-actions">
            {status?.configured && (
              <button
                type="button"
                className="secondary-button gmail-clear-button"
                onClick={handleClear}
              >
                <Trash2 size={16} />
                Remove Saved Credentials
              </button>
            )}

            <button
              type="submit"
              className="primary-button"
              disabled={saving}
            >
              {saving ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <CheckCircle size={16} />
              )}
              {saving ? 'Saving...' : 'Save Credentials'}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}