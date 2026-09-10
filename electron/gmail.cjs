const { google } = require('googleapis')
const http = require('http')
const { shell, app, safeStorage } = require('electron')
const fs = require('fs')
const path = require('path')

const PORT = 3000

const REDIRECT_URI =
  `http://127.0.0.1:${PORT}/oauth2callback`

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly'
]

const TOKEN_FILE = path.join(
  app.getPath('userData'),
  'gmail-tokens.dat'
)

const CREDENTIALS_FILE = path.join(
  app.getPath('userData'),
  'gmail-credentials.dat'
)

// ---------- Token storage (per-user Gmail login) ----------

function saveTokens(tokens) {
  try {
    const encrypted = safeStorage.encryptString(
      JSON.stringify(tokens)
    )
    fs.writeFileSync(
      TOKEN_FILE,
      encrypted
    )
    console.log('Gmail tokens saved securely.')
  } catch (error) {
    console.error(
      'Unable to save Gmail tokens:',
      error
    )
  }
}

function loadTokens() {
  try {
    if (!fs.existsSync(TOKEN_FILE)) {
      return null
    }
    const encrypted = fs.readFileSync(TOKEN_FILE)
    const decrypted = safeStorage.decryptString(
      encrypted
    )
    return JSON.parse(decrypted)
  } catch (error) {
    console.error(
      'Unable to load Gmail tokens:',
      error
    )
    return null
  }
}

function clearTokens() {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      fs.unlinkSync(TOKEN_FILE)
    }
    return { success: true }
  } catch (error) {
    console.error('Unable to clear Gmail tokens:', error)
    return { success: false, error: error.message }
  }
}

// ---------- OAuth client credential storage ----------
//
// Every user who runs this app needs their own Google OAuth client
// (Client ID + Client Secret) from their own Google Cloud project —
// see GmailSettings.jsx for the in-app setup tutorial. Credentials
// are encrypted at rest with Electron's safeStorage, which uses the
// OS keychain (macOS Keychain, Windows DPAPI, libsecret on Linux).
// They are never sent anywhere except directly to Google's OAuth
// endpoints during sign-in.

function saveOAuthCredentials({ clientId, clientSecret }) {
  try {
    if (!clientId || !clientSecret) {
      return {
        success: false,
        error: 'Both a Client ID and Client Secret are required.'
      }
    }

    const encrypted = safeStorage.encryptString(
      JSON.stringify({ clientId, clientSecret })
    )

    fs.writeFileSync(CREDENTIALS_FILE, encrypted)

    // Credentials changed, so any previously saved Gmail login is
    // no longer valid against the new OAuth client.
    clearTokens()

    return { success: true }
  } catch (error) {
    console.error(
      'Unable to save Gmail OAuth credentials:',
      error
    )
    return { success: false, error: error.message }
  }
}

function loadOAuthCredentials() {
  try {
    if (!fs.existsSync(CREDENTIALS_FILE)) {
      return null
    }
    const encrypted = fs.readFileSync(CREDENTIALS_FILE)
    const decrypted = safeStorage.decryptString(encrypted)
    return JSON.parse(decrypted)
  } catch (error) {
    console.error(
      'Unable to load Gmail OAuth credentials:',
      error
    )
    return null
  }
}

function clearOAuthCredentials() {
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      fs.unlinkSync(CREDENTIALS_FILE)
    }
    clearTokens()
    return { success: true }
  } catch (error) {
    console.error(
      'Unable to clear Gmail OAuth credentials:',
      error
    )
    return { success: false, error: error.message }
  }
}

function getOAuthConfig() {
  // Credentials entered in-app take priority. Falling back to
  // environment variables is only useful for local development —
  // a packaged, shared build should never ship real secrets, so
  // nothing here throws if neither is present.
  const stored = loadOAuthCredentials()

  if (stored?.clientId && stored?.clientSecret) {
    return stored
  }

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    }
  }

  return null
}

function hasOAuthCredentials() {
  return getOAuthConfig() !== null
}

// ---------- Status ----------

function getGmailStatus() {
  if (!hasOAuthCredentials()) {
    return {
      configured: false,
      connected: false
    }
  }

  const tokens = loadTokens()

  return {
    configured: true,
    connected: !!tokens
  }
}

// ---------- OAuth sign-in flow ----------

function connectGmail() {
  return new Promise((resolve, reject) => {
    const oauthConfig = getOAuthConfig()

    if (!oauthConfig) {
      reject(
        new Error(
          'Gmail OAuth credentials are not set up yet. Add them in Settings first.'
        )
      )
      return
    }

    const auth = new google.auth.OAuth2(
      oauthConfig.clientId,
      oauthConfig.clientSecret,
      REDIRECT_URI
    )

    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(
          req.url,
          `http://127.0.0.1:${PORT}`
        )

        // Only handle our OAuth callback
        if (url.pathname !== '/oauth2callback') {
          res.writeHead(404)
          res.end('Not found')
          return
        }

        // Handle authorization errors or cancellation
        const oauthError = url.searchParams.get('error')

        if (oauthError) {
          res.writeHead(200, {
            'Content-Type': 'text/html'
          })

          res.end(`
            <h2>Gmail connection cancelled</h2>
            <p>You can close this window and return to ApplyTrack.</p>
          `)

          server.close()

          reject(
            new Error(
              `Google authorization failed: ${oauthError}`
            )
          )

          return
        }

        const code = url.searchParams.get('code')

        if (!code) {
          throw new Error(
            'No authorization code was received from Google.'
          )
        }

        // Exchange the authorization code for tokens
        const { tokens } = await auth.getToken({
          code,
          redirect_uri: REDIRECT_URI
        })

        auth.setCredentials(tokens)

        // Save the Gmail authentication tokens securely
        saveTokens(tokens)

        res.writeHead(200, {
          'Content-Type': 'text/html'
        })

        res.end(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>ApplyTrack Connected</title>
            </head>

            <body style="
              font-family: Arial, sans-serif;
              background: #0b1120;
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
            ">
              <div>
                <h1>&#10003; Gmail Connected!</h1>

                <p>
                  You can close this window and return
                  to ApplyTrack.
                </p>
              </div>
            </body>
          </html>
        `)

        server.close()

        resolve({
          success: true,
          tokens
        })
      } catch (error) {
        console.error(
          'Gmail connection error:',
          error
        )

        // Send an error page if possible
        if (!res.headersSent) {
          res.writeHead(500, {
            'Content-Type': 'text/html'
          })

          res.end(`
            <h2>Connection failed</h2>
            <p>
              Please return to ApplyTrack and try again.
            </p>
          `)
        }

        server.close()

        reject(error)
      }
    })

    server.on('error', (error) => {
      console.error(
        'Gmail authentication server error:',
        error
      )

      reject(
        new Error(
          'Unable to start the Gmail authentication server. ' +
          'Please make sure ApplyTrack is not already running and try again.'
        )
      )
    })

    // Start the temporary local authentication server
    server.listen(PORT, '127.0.0.1', () => {
      console.log(
        `Gmail authentication server running on port ${PORT}`
      )

      const authUrl = auth.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent'
      })

      shell.openExternal(authUrl)
    })
  })
}

// ---------- Job email classification ----------

const TRUSTED_JOB_SENDERS = [
  'jobalert.indeed.com',
  'match.indeed.com',
  'indeed.com',
  'linkedin.com',
  'glassdoor.com',
  'jobstreet.com',
  'jobstreet.com.ph'
]

const EXCLUDED_SENDERS = [
  'steampowered.com',
  'alison.com',
  'us-courses.alison.com'
]

// Strong keywords: fairly unambiguous on their own
const STRONG_KEYWORDS = [
  'job offer',
  'job opening',
  'job application',
  'hiring',
  'recruiter',
  'recruitment',
  'interview invitation',
  'schedule an interview',
  'application received',
  'application status',
  'now hiring',
  'vacancy',
  'vacancies'
]

// Weak keywords: require at least 2 matches
const WEAK_KEYWORDS = [
  'job',
  'career',
  'position',
  'opportunity',
  'employment',
  'resume',
  'cv',
  'applicant',
  'assessment',
  'screening',
  'offer'
]

function extractDomain(fromHeader = '') {
  const match = fromHeader.match(
    /@([\w.-]+)/
  )

  return match
    ? match[1].toLowerCase()
    : ''
}

function countMatches(text, keywords) {
  return keywords.filter((keyword) => {
    const escaped = keyword.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    )

    const pattern = new RegExp(
      `\\b${escaped}\\b`,
      'i'
    )

    return pattern.test(text)
  }).length
}

function isJobRelatedEmail(email) {
  const domain = extractDomain(
    email.from || ''
  )

  const text = [
    email.subject || '',
    email.snippet || ''
  ]
    .join(' ')
    .toLowerCase()

  // Explicitly exclude known non-job senders
  if (
    EXCLUDED_SENDERS.some((sender) =>
      domain.includes(sender)
    )
  ) {
    return false
  }

  // Automatically trust known job platforms
  if (
    TRUSTED_JOB_SENDERS.some((sender) =>
      domain.includes(sender)
    )
  ) {
    return true
  }

  // One strong keyword is enough
  if (
    countMatches(text, STRONG_KEYWORDS) >= 1
  ) {
    return true
  }

  // Require two weak indicators
  if (
    countMatches(text, WEAK_KEYWORDS) >= 2
  ) {
    return true
  }

  return false
}

function classifyJobEmail(email) {
  const text = [
    email.subject || '',
    email.snippet || '',
    email.from || ''
  ]
    .join(' ')
    .toLowerCase()

  const hasAny = (keywords) =>
    keywords.some((keyword) =>
      text.includes(keyword)
    )

  // Interview
  if (
    hasAny([
      'interview invitation',
      'schedule an interview',
      'job interview',
      'interview schedule',
      'interview with',
      'invited to interview'
    ])
  ) {
    return {
      category: 'interview'
    }
  }

  // Job offer
  if (
    hasAny([
      'job offer',
      'offer letter',
      'employment offer',
      'we are pleased to offer',
      'we are delighted to offer'
    ])
  ) {
    return {
      category: 'job_offer'
    }
  }

  // Rejection
  if (
    hasAny([
      'application unsuccessful',
      'we regret to inform you',
      'not moving forward',
      'will not be proceeding',
      'decided to move forward with other candidates'
    ])
  ) {
    return {
      category: 'rejection'
    }
  }

  // Application update
  if (
    hasAny([
      'application update',
      'application status',
      'your application',
      'application received',
      'application has been',
      'thank you for applying',
      'thank you for your application'
    ])
  ) {
    return {
      category: 'application_update'
    }
  }

  // Recruiter or employer message
  if (
    hasAny([
      'recruiter',
      'contact you',
      'start the conversation',
      'send a message',
      'message from',
      'interested in your profile'
    ])
  ) {
    return {
      category: 'recruiter_message'
    }
  }

  // Job opportunities and recommendations
  if (
    hasAny([
      'job alert',
      'new jobs',
      'job opportunity',
      'quick application',
      'could be a match',
      'background could be a match',
      'recommended for you',
      'job opening',
      'vacancy'
    ])
  ) {
    return {
      category: 'job_opportunity'
    }
  }

  return {
    category: 'other_job_related'
  }
}

async function getRecentEmails() {
  const oauthConfig = getOAuthConfig()

  if (!oauthConfig) {
    throw new Error(
      'Gmail OAuth credentials are not set up yet. Add them in Settings first.'
    )
  }

  const tokens = loadTokens()

  if (!tokens) {
    throw new Error(
      'Gmail is not connected.'
    )
  }

  const auth = new google.auth.OAuth2(
    oauthConfig.clientId,
    oauthConfig.clientSecret,
    REDIRECT_URI
  )

  auth.setCredentials(tokens)

  const gmail = google.gmail({
    version: 'v1',
    auth
  })

  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 10
  })

  const messages = response.data.messages || []

  const emails = []

  for (const message of messages) {
    const email = await gmail.users.messages.get({
      userId: 'me',
      id: message.id,
      format: 'metadata',
      metadataHeaders: [
        'From',
        'Subject',
        'Date'
      ]
    })

    const headers = email.data.payload.headers || []

    const getHeader = (name) => {
      const header = headers.find(
        (item) =>
          item.name.toLowerCase() ===
          name.toLowerCase()
      )

      return header?.value || ''
    }

    const emailData = {
      id: message.id,
      from: getHeader('From'),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
      snippet: email.data.snippet || ''
    }

    const classification =
      classifyJobEmail(emailData)

    emails.push({
      ...emailData,
      ...classification
    })
  }

  const jobRelatedEmails =
    emails.filter(isJobRelatedEmail)

  return {
    success: true,
    emails: jobRelatedEmails
  }
}

module.exports = {
  connectGmail,
  getGmailStatus,
  getRecentEmails,
  saveOAuthCredentials,
  hasOAuthCredentials,
  clearOAuthCredentials
}