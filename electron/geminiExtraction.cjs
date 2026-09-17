const { app, safeStorage } = require('electron')
const fs = require('fs')
const path = require('path')

// Same storage pattern as the Gmail OAuth credentials in gmail.cjs:
// encrypted at rest with Electron's safeStorage (OS keychain), never
// sent anywhere except directly to Google's Gemini API.
const API_KEY_FILE = path.join(
  app.getPath('userData'),
  'gemini-api-key.dat'
)

// "-latest" aliases auto-follow Google's current stable release for
// that model tier, so this doesn't need updating every time a new
// Gemini version ships. Flash-Lite is used specifically because it
// carries the most generous free-tier daily request quota of any
// Gemini model — the right choice here since this is a small,
// well-defined extraction task, not something that needs frontier
// reasoning.
const MODEL = 'gemini-flash-lite-latest'

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

// Hard cap on how many emails get sent to the API per "Check Recent
// Emails" click, mainly to stay comfortably inside the free tier's
// per-minute rate limit even on a burst of new emails.
const MAX_EMAILS_PER_BATCH = 10

// Truncate long email bodies before sending — keeps requests small;
// a job-application email rarely needs more than this to extract
// company/position/status from.
const MAX_BODY_CHARS = 4000

function saveApiKey(apiKey) {
  try {
    if (!apiKey || !apiKey.trim()) {
      return { success: false, error: 'Enter an API key.' }
    }

    const encrypted = safeStorage.encryptString(apiKey.trim())
    fs.writeFileSync(API_KEY_FILE, encrypted)

    return { success: true }
  } catch (error) {
    console.error('Unable to save Gemini API key:', error)
    return { success: false, error: error.message }
  }
}

function loadApiKey() {
  try {
    if (!fs.existsSync(API_KEY_FILE)) return null

    const encrypted = fs.readFileSync(API_KEY_FILE)
    return safeStorage.decryptString(encrypted)
  } catch (error) {
    console.error('Unable to load Gemini API key:', error)
    return null
  }
}

function clearApiKey() {
  try {
    if (fs.existsSync(API_KEY_FILE)) {
      fs.unlinkSync(API_KEY_FILE)
    }
    return { success: true }
  } catch (error) {
    console.error('Unable to clear Gemini API key:', error)
    return { success: false, error: error.message }
  }
}

function getAiStatus() {
  return { configured: !!loadApiKey() }
}

// ---------- Extraction ----------

const SYSTEM_PROMPT = `You read a single email that has already been identified as job-search related and extract structured information about it. Respond with ONLY a JSON object — no markdown fences, no commentary, nothing before or after it.

The JSON object must have exactly these fields:
{
  "isJobApplicationEvent": boolean,
  "type": "new_application" | "status_update" | "irrelevant",
  "company": string or null,
  "position": string or null,
  "suggestedStatus": "Applied" | "Screening" | "Interview" | "Offer" | "Rejected" | null,
  "confidence": "high" | "medium" | "low",
  "reason": a short (under 20 words) plain-English explanation of what in the email supports this
}

Rules:
- "new_application" means the email confirms an application was just submitted/received (e.g. "thank you for applying", "your application was received").
- "status_update" means the email signals an existing application has moved to a new stage: Screening, Interview, Offer, or Rejected. Set suggestedStatus accordingly.
- If the email is not really about a specific job application (e.g. a generic job alert, a newsletter, a recommendation of jobs to apply to), set isJobApplicationEvent to false and type to "irrelevant".
- "company" should be the actual hiring company's name, NOT a job board or ATS platform (Indeed, LinkedIn, Jobstreet, Greenhouse, Lever, Workday, etc.) even if that platform is the email sender. If you cannot confidently identify the real company, set company to null.
- "position" should be the job title being applied for, as written in the email. If unclear, set to null.
- Be conservative: if you are not confident about company, position, or the event type, lower the confidence rather than guessing.
- Consider the whole email's context, not just keyword matches — a word like "rejected" appearing in an unrelated context should not trigger a rejection classification.`

function buildUserPrompt(email) {
  const body = (email.body || email.snippet || '').slice(0, MAX_BODY_CHARS)

  return [
    `From: ${email.from || '(unknown sender)'}`,
    `Subject: ${email.subject || '(no subject)'}`,
    `Category (pre-classified): ${email.category || 'unknown'}`,
    '',
    'Body:',
    body
  ].join('\n')
}

function stripJsonFences(text) {
  return text.replace(/```json|```/g, '').trim()
}

async function extractOne(apiKey, email) {
  const response = await fetch(`${API_BASE}/${MODEL}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: buildUserPrompt(email) }]
        }
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json'
      }
    })
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    const message = errorBody?.error?.message || `Gemini API error (${response.status})`

    // Surface auth problems distinctly so the UI can point the user
    // back to Settings rather than showing a generic failure.
    if (response.status === 400 && /api key/i.test(message)) {
      throw new Error('Invalid Gemini API key. Check it in AI Settings.')
    }
    if (response.status === 403) {
      throw new Error('Gemini API key rejected (check it\'s enabled for the Gemini API).')
    }
    if (response.status === 429) {
      throw new Error('Gemini free-tier rate limit hit — try again in a minute.')
    }

    throw new Error(message)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) {
    throw new Error('Gemini returned an empty response.')
  }

  let parsed
  try {
    parsed = JSON.parse(stripJsonFences(text))
  } catch {
    throw new Error('Could not parse Gemini\'s response as JSON.')
  }

  return {
    emailId: email.id,
    ...parsed
  }
}

// Runs extraction for a batch of emails. Each email is processed
// independently — one failing (bad JSON, a transient API error)
// doesn't stop the others. Returns one result per input email,
// either the extraction or an { emailId, error } entry.
async function extractEmailFields(emails = []) {
  const apiKey = loadApiKey()

  if (!apiKey) {
    return {
      success: false,
      error: 'No Gemini API key is configured yet. Add one in AI Settings.'
    }
  }

  const batch = emails.slice(0, MAX_EMAILS_PER_BATCH)

  const settled = await Promise.allSettled(
    batch.map((email) => extractOne(apiKey, email))
  )

  const results = settled.map((outcome, index) => {
    if (outcome.status === 'fulfilled') return outcome.value

    return {
      emailId: batch[index].id,
      error: outcome.reason?.message || 'Extraction failed.'
    }
  })

  return { success: true, results }
}

module.exports = {
  saveApiKey,
  loadApiKey,
  clearApiKey,
  getAiStatus,
  extractEmailFields
}
