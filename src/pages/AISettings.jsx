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

export default function AISettings({ status, onClose, onSaved, onCleared }) {
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showTutorial, setShowTutorial] = useState(!status?.configured)

  const handleSave = async (event) => {
    event.preventDefault()
    setError('')

    if (!apiKey.trim()) {
      setError('Enter your Gemini API key.')
      return
    }

    setSaving(true)

    try {
      if (!window.electronAPI?.saveAiApiKey) {
        throw new Error(
          'AI extraction is only available in the ApplyTrack desktop app.'
        )
      }

      const result = await window.electronAPI.saveAiApiKey(apiKey.trim())

      if (!result?.success) {
        throw new Error(result?.error || 'Unable to save the API key.')
      }

      setApiKey('')
      onSaved?.()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    try {
      await window.electronAPI?.clearAiApiKey?.()
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
            <h2>AI Email Extraction</h2>
            <p>
              Connect your own Gemini API key — free, no billing
              required — so ApplyTrack can read your job emails with
              AI instead of keyword matching. This stays on your
              machine only.
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
          How do I get a free Gemini API key?
        </button>

        {showTutorial && (
          <div className="gmail-tutorial">
            <ol>
              <li>
                Go to{' '}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                >
                  Google AI Studio <ExternalLink size={12} />
                </a>{' '}
                and sign in with any Google account.
              </li>
              <li>
                Click <strong>Create API key</strong>, and pick or
                create a Google Cloud project when prompted — no
                billing/credit card needed for the free tier.
              </li>
              <li>
                Copy the key that's shown and paste it into the field
                below.
              </li>
              <li>
                Extraction uses a Gemini Flash-Lite model, free of
                charge under Google's rate limits (roughly 500
                requests/day) — more than enough for checking your own
                email a few times a day.
              </li>
            </ol>

            <div className="gmail-security-note">
              <ShieldCheck size={16} />
              <p>
                <strong>Where this is stored:</strong> your API key is
                encrypted with your operating system's secure
                credential store (Keychain on macOS, Credential Manager
                on Windows, libsecret on Linux) before being written to
                disk. It stays on this device and is only ever sent
                directly to Google's Gemini API when checking emails —
                never to any ApplyTrack server, because there isn't
                one.
              </p>
            </div>
          </div>
        )}

        <form className="gmail-credentials-form" onSubmit={handleSave}>
          <div className="form-grid">
            <label>
              Gemini API Key
              <input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="AIza••••••••••••••••••••"
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
                Remove Saved Key
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
              {saving ? 'Saving...' : 'Save Key'}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
