// src/data/emailDetection.js
//
// Rule-based, deterministic detection of job-application-related
// events (new applications + status changes) from Gmail messages
// already fetched and classified by electron/gmail.cjs. Each email
// object coming from the Gmail integration already carries a
// `category` field (application_update, interview, job_offer,
// rejection, recruiter_message, job_opportunity, other_job_related)
// set by classifyJobEmail() in gmail.cjs — this module builds on
// top of that instead of re-implementing job-relatedness detection.
//
// Nothing here ever mutates application data directly. It only
// produces suggestion objects; the caller (JobEmails.jsx) decides
// whether/when to actually call onAddApplication / onUpdateApplication,
// and only ever does so after explicit user confirmation.
//
// No AI/external API is used — this is intentionally a first,
// deterministic pass. See the "matchApplication" section for where
// a smarter matching strategy could later be swapped in without
// touching the rest of the feature.

// ---------------------------------------------------------------
// Phrase signal sets
// ---------------------------------------------------------------
// These are separate from (and more specific than) the STRONG/WEAK
// keyword lists gmail.cjs uses just to decide "is this job-related
// at all". Here we're trying to tell *which stage* an email signals.

const NEW_APPLICATION_PHRASES = [
  'thank you for applying',
  'thank you for your application',
  'thank you for your interest in',
  'we received your application',
  "we've received your application",
  'your application has been submitted',
  'your application has been received',
  'application received',
  'we have received your application',
  'application submitted successfully',
  'successfully submitted',
  'application to',
  'was submitted'
]

const SCREENING_PHRASES = [
  'your application is being reviewed',
  'we are reviewing your application',
  'application has been shortlisted',
  'moving to the next stage',
  'currently under review'
]

const INTERVIEW_PHRASES = [
  "we'd like to schedule an interview",
  'interview invitation',
  'we would like to speak with you',
  'schedule an interview',
  'invited you to interview',
  'interview request',
  'like to set up a call',
  'schedule a call with you'
]

const OFFER_PHRASES = [
  'we are pleased to offer you',
  'job offer',
  'pleased to offer you the position',
  'we would like to offer you the position',
  'offer of employment',
  'excited to offer you',
  'formal offer'
]

const REJECTION_PHRASES = [
  'unfortunately, we will not be moving forward',
  'we will not be moving forward',
  'application was unsuccessful',
  'decided to move forward with other candidates',
  'application is unlikely to progress',
  'will not be progressing your application',
  'the position has been filled',
  'we regret to inform you',
  'pursue other candidates',
  'not be proceeding with your application'
]

// Emails whose gmail.cjs category alone (no phrase match) can still
// justify a *low-confidence* suggestion, so we don't miss emails
// phrased differently than our phrase lists expect.
const CATEGORY_STATUS_FALLBACK = {
  interview: 'Interview',
  job_offer: 'Offer',
  rejection: 'Rejected'
}

// ---------------------------------------------------------------
// Small text helpers
// ---------------------------------------------------------------

// Collapses any run of whitespace that contains a line break into a
// literal ". " sentence boundary. This is what stops name-extraction
// regexes from bridging across a paragraph break — e.g. "...submitted
// to Megaworld Corporation.\n\nHi Justin," would otherwise let a
// "capitalized word, capitalized word" pattern walk straight from
// "Corporation" into "Hi Justin" since both are capitalized and only
// whitespace separates them.
function flattenParagraphBreaks(value = '') {
  return value.replace(/[ \t]*\n\s*/g, '. ')
}

function emailText(email) {
  const raw = `${email.subject || ''}\n${email.body || email.snippet || ''}`
  return flattenParagraphBreaks(raw).toLowerCase()
}

function matchedPhrases(text, phrases) {
  return phrases.filter((phrase) => text.includes(phrase))
}

function extractDomain(fromHeader = '') {
  const match = fromHeader.match(/@([\w.-]+)/)
  return match ? match[1].toLowerCase() : ''
}

function extractDisplayName(fromHeader = '') {
  const match = fromHeader.match(/^"?([^"<]+)"?\s*<[^>]+>/)
  return match ? match[1].trim() : ''
}

function normalizeForMatch(value = '') {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function tokenOverlap(a, b) {
  const tokensA = new Set(normalizeForMatch(a).split(' ').filter(Boolean))
  const tokensB = new Set(normalizeForMatch(b).split(' ').filter(Boolean))

  if (!tokensA.size || !tokensB.size) return 0

  let overlap = 0
  tokensA.forEach((token) => {
    if (tokensB.has(token)) overlap += 1
  })

  return overlap / Math.max(tokensA.size, tokensB.size)
}

function capitalizeWords(value = '') {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

// ---------------------------------------------------------------
// Company / position extraction
// ---------------------------------------------------------------
// Deliberately conservative: it's fine to return null (and skip
// the suggestion) rather than guess something misleading, since a
// wrong company/position name makes matching unreliable and the
// suggestion card confusing.

const ATS_OR_PLATFORM_DOMAINS = [
  'greenhouse.io', 'lever.co', 'myworkdayjobs.com', 'workday.com',
  'icims.com', 'smartrecruiters.com', 'bamboohr.com', 'ashbyhq.com',
  'jobvite.com', 'taleo.net', 'successfactors.com', 'breezy.hr',
  'indeed.com', 'jobalert.indeed.com', 'match.indeed.com',
  'linkedin.com', 'glassdoor.com', 'ziprecruiter.com',
  'jobstreet.com', 'jobstreet.com.ph', 'ecom.jobstreet.com'
]

const SENDER_NAME_NOISE = /\b(recruiting|recruitment|careers?|talent acquisition|hr team|human resources|hiring team|jobs?|no ?reply|notifications?)\b/gi

function isUsableCompanyName(name) {
  if (!name) return false
  const cleaned = name.trim()
  if (cleaned.length < 2 || cleaned.length > 60) return false
  // Reject names that are just an email address or generic platform noise
  if (/@/.test(cleaned)) return false
  if (/^(team|support|admin|info|talent|careers|jobs)$/i.test(cleaned)) return false
  return true
}

// Looks for the company name in the email's own wording. Tried
// first (even before the sender identity) because for job-board
// emails — Jobstreet, Indeed, LinkedIn — the sender is the
// *platform*, never the actual employer; the real company name only
// ever shows up in the body text, in phrasing like "submitted to
// Megaworld Corporation" or "applied to Acme Inc".
// Words that sometimes get capitalized and can look like a
// continuation of a company name ("...Corporation Hi Justin") if
// they slip past the paragraph-break flattening above. Stripped from
// the end of a captured name as a second line of defense.
const GREETING_OR_SIGNOFF_WORDS =
  /\b(hi|hello|dear|greetings|regards|sincerely|best|thanks|thank you|warm regards|kind regards|cheers)\b.*$/i

function cleanCompanyMatch(rawName) {
  return rawName
    .replace(GREETING_OR_SIGNOFF_WORDS, '')
    .trim()
    // Strip trailing punctuation left over from a sentence boundary
    // (e.g. the ". " inserted by flattenParagraphBreaks) or from the
    // email's own punctuation ("Megaworld Corporation," etc.)
    .replace(/[.,;:]+$/, '')
    .trim()
}

function extractCompanyFromText(text) {
  const flattened = flattenParagraphBreaks(text)
  const namePart = "[A-Z][A-Za-z0-9&.,'-]{1,40}(?:\\s+[A-Z][A-Za-z0-9&.,'-]{1,40}){0,3}"

  const patterns = [
    new RegExp(`submitted to (${namePart})`),
    new RegExp(`applied to (?:the\\s+)?(${namePart})`),
    new RegExp(`application (?:for [^.]+? )?(?:to|at) (${namePart})`),
    new RegExp(`interest in working at (${namePart})`),
    new RegExp(`offer from (${namePart})`),
    new RegExp(`\\b(?:at|with) (${namePart})`)
  ]

  for (const pattern of patterns) {
    const match = flattened.match(pattern)

    if (match) {
      const cleaned = cleanCompanyMatch(match[1])

      if (isUsableCompanyName(cleaned)) {
        return cleaned
      }
    }
  }

  return null
}

function extractCompany(email) {
  const domain = extractDomain(email.from)
  const isPlatform = ATS_OR_PLATFORM_DOMAINS.some((d) => domain.includes(d))
  const text = `${email.subject || ''} ${email.body || email.snippet || ''}`

  // 1. Body/subject wording — most reliable, and the only option
  //    when the sender is a job board rather than the employer.
  const fromText = extractCompanyFromText(text)
  if (fromText) return fromText

  // 2. Sender's display name, stripped of generic HR/recruiting
  //    noise — only trusted when the sender isn't a known platform.
  const displayName = extractDisplayName(email.from).replace(SENDER_NAME_NOISE, '').trim()

  if (isUsableCompanyName(displayName) && !isPlatform) {
    return displayName
  }

  // 3. Sender domain, again only when it's not a known platform
  //    (e.g. "acme.com" -> "Acme")
  if (domain && !isPlatform) {
    const base = domain.split('.')[0]
    if (isUsableCompanyName(base)) {
      return capitalizeWords(base)
    }
  }

  return null
}

function extractPosition(text) {
  // The core title, plus an optional trailing parenthetical like
  // "(Open for Fresh Graduates)" captured as its own balanced group
  // so it can't run away and swallow unrelated text after it.
  const titlePart = "[a-z0-9 ,.&/+-]{3,60}?(?:\\s*\\([a-z0-9 ,.&/+-]{2,50}\\))?"

  const patterns = [
    new RegExp(`application for (?:the )?(?:position of )?(${titlePart})\\s*(?:role|position)?\\s*(?:has|was|is|to|at|with|\\.|,|\\n|$)`, 'i'),
    new RegExp(`your application to (?:the )?(${titlePart})`, 'i'),
    new RegExp(`for the (${titlePart}) position`, 'i'),
    new RegExp(`position:\\s*(${titlePart})`, 'i'),
    new RegExp(`role:\\s*(${titlePart})`, 'i'),
    new RegExp(`interview for (?:the )?(${titlePart})\\s*(?:role|position)?\\s*(?:at|with|\\.|,|\\n|$)`, 'i')
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1] && match[1].trim().length > 1) {
      return capitalizeWords(match[1].trim())
    }
  }

  return null
}

// ---------------------------------------------------------------
// Matching against existing applications
// ---------------------------------------------------------------
// Scores are a weighted blend of company-name and position-title
// token overlap. Thresholds below were chosen conservatively —
// tune them if real-world testing shows too many/few matches.

const CONFIDENT_MATCH = 0.55
const POSSIBLE_MATCH = 0.3

function scoreApplicationMatch({ company, position }, application) {
  const companyScore = tokenOverlap(company || '', application.company || '')
  const positionScore = tokenOverlap(position || '', application.position || '')

  // Company match matters more than position wording, which varies a lot
  // between the job posting and how a company phrases it in an email.
  return companyScore * 0.65 + positionScore * 0.35
}

function findMatchingApplication(detected, applications) {
  let best = null
  let bestScore = 0

  for (const application of applications) {
    const score = scoreApplicationMatch(detected, application)

    if (score > bestScore) {
      bestScore = score
      best = application
    }
  }

  if (!best) return null

  return { application: best, score: bestScore }
}

// ---------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------
//
// emails: the array already fetched + classified by the Gmail
//   integration (each has id, from, subject, body/snippet, category)
// applications: current ApplyTrack applications
// processedEmailIds: email ids the user has already confirmed or
//   ignored — these are skipped so refreshing Gmail doesn't keep
//   re-suggesting the same thing.

export function detectEmailEvents(emails = [], applications = [], processedEmailIds = []) {
  const processed = new Set(processedEmailIds)
  const detections = []

  for (const email of emails) {
    if (!email?.id || processed.has(email.id)) continue

    const text = emailText(email)

    const rejectionSignals = matchedPhrases(text, REJECTION_PHRASES)
    const offerSignals = matchedPhrases(text, OFFER_PHRASES)
    const interviewSignals = matchedPhrases(text, INTERVIEW_PHRASES)
    const screeningSignals = matchedPhrases(text, SCREENING_PHRASES)
    const newApplicationSignals = matchedPhrases(text, NEW_APPLICATION_PHRASES)

    let type = null
    let suggestedStatus = null
    let signals = []
    let categoryOnly = false

    // Priority order matters: a later-stage signal (rejection, offer,
    // interview) is more specific and more useful than a generic
    // "application received" phrase that might also appear quoted
    // further down in the same email thread.
    if (rejectionSignals.length) {
      type = 'status_update'; suggestedStatus = 'Rejected'; signals = rejectionSignals
    } else if (offerSignals.length) {
      type = 'status_update'; suggestedStatus = 'Offer'; signals = offerSignals
    } else if (interviewSignals.length) {
      type = 'status_update'; suggestedStatus = 'Interview'; signals = interviewSignals
    } else if (screeningSignals.length) {
      type = 'status_update'; suggestedStatus = 'Screening'; signals = screeningSignals
    } else if (newApplicationSignals.length) {
      type = 'new_application'; signals = newApplicationSignals
    } else if (CATEGORY_STATUS_FALLBACK[email.category]) {
      type = 'status_update'
      suggestedStatus = CATEGORY_STATUS_FALLBACK[email.category]
      categoryOnly = true
    } else if (email.category === 'application_update') {
      type = 'new_application'
      categoryOnly = true
    } else {
      continue // Nothing actionable — e.g. a job alert/recommendation email
    }

    const company = extractCompany(email)
    const position = extractPosition(text)
    const match = findMatchingApplication({ company, position }, applications)

    if (type === 'new_application') {
      if (!company) continue // Can't meaningfully suggest without a company name

      let possibleDuplicateOf = null

      if (match) {
        if (match.score >= CONFIDENT_MATCH) continue // Already tracked — skip silently
        if (match.score >= POSSIBLE_MATCH) possibleDuplicateOf = match.application
      }

      const confidence = possibleDuplicateOf
        ? 'low'
        : categoryOnly
          ? 'low'
          : signals.length >= 2
            ? 'high'
            : 'medium'

      detections.push({
        type: 'new_application',
        confidence,
        company,
        position: position || 'Unknown Position',
        emailId: email.id,
        subject: email.subject,
        sender: email.from,
        reason: possibleDuplicateOf
          ? `Might already be tracked as "${possibleDuplicateOf.company} — ${possibleDuplicateOf.position}". Review before adding.`
          : signals[0]
            ? `Email contains: "${signals[0]}"`
            : 'Classified as an application-confirmation email.',
        matchedApplicationId: possibleDuplicateOf?.id || null,
        possibleDuplicate: !!possibleDuplicateOf,
        source: 'rules'
      })
    } else {
      // status_update — only suggest when we have at least a
      // plausible match, since applying a status change to the
      // wrong application is the riskiest kind of false positive.
      if (!match || match.score < POSSIBLE_MATCH + 0.05) continue

      const application = match.application

      if (application.status === suggestedStatus) continue // No-op

      const confidence =
        match.score >= CONFIDENT_MATCH && signals.length >= 1 && !categoryOnly
          ? 'high'
          : match.score >= CONFIDENT_MATCH || signals.length >= 1
            ? 'medium'
            : 'low'

      detections.push({
        type: 'status_update',
        confidence,
        company: application.company,
        position: application.position,
        currentStatus: application.status,
        suggestedStatus,
        emailId: email.id,
        subject: email.subject,
        sender: email.from,
        reason: signals[0]
          ? `Email contains: "${signals[0]}"`
          : `Classified as a ${suggestedStatus.toLowerCase()} email for this company.`,
        matchedApplicationId: application.id,
        source: 'rules'
      })
    }
  }

  return detections
}

// ---------------------------------------------------------------
// AI-based extraction path (optional, requires a Gemini API key)
// ---------------------------------------------------------------
//
// When a Gemini API key is configured, JobEmails.jsx has the main
// process (electron/geminiExtraction.cjs) call the Gemini API to extract
// company/position/type/status directly from each email's full text
// — this reads the email holistically instead of pattern-matching,
// so it isn't tripped up by unusual phrasing, paragraph breaks, or
// titles with punctuation the regex-based path above can miss.
//
// Deliberately kept as a separate path rather than merged into
// detectEmailEvents: the rule-based function above is the always-
// available fallback (no API key, offline, or a per-email extraction
// failure), so it's left untouched. Both paths funnel through the
// same matching/duplicate-prevention logic below for consistent
// behavior regardless of which one produced the candidate.

// Takes ONE extraction result (as returned by
// window.electronAPI.extractEmailFields — see electron/aiExtraction.cjs)
// and runs it through the same matching/duplicate-prevention rules
// the rule-based path uses.
export function resolveAiDetection(extraction, email, applications) {
  if (!extraction || extraction.error || !email) return null
  if (!extraction.isJobApplicationEvent) return null
  if (extraction.type !== 'new_application' && extraction.type !== 'status_update') return null

  const company = extraction.company || null
  const position = extraction.position || null
  const match = findMatchingApplication({ company, position }, applications)

  if (extraction.type === 'new_application') {
    if (!company) return null

    let possibleDuplicateOf = null

    if (match) {
      if (match.score >= CONFIDENT_MATCH) return null // Already tracked
      if (match.score >= POSSIBLE_MATCH) possibleDuplicateOf = match.application
    }

    return {
      type: 'new_application',
      confidence: possibleDuplicateOf ? 'low' : (extraction.confidence || 'medium'),
      company,
      position: position || 'Unknown Position',
      emailId: email.id,
      subject: email.subject,
      sender: email.from,
      reason: possibleDuplicateOf
        ? `Might already be tracked as "${possibleDuplicateOf.company} — ${possibleDuplicateOf.position}". Review before adding.`
        : extraction.reason || 'Identified by Gemini as an application-confirmation email.',
      matchedApplicationId: possibleDuplicateOf?.id || null,
      possibleDuplicate: !!possibleDuplicateOf,
      source: 'ai'
    }
  }

  // status_update
  if (!extraction.suggestedStatus) return null
  if (!match || match.score < POSSIBLE_MATCH + 0.05) return null

  const application = match.application
  if (application.status === extraction.suggestedStatus) return null

  // Even though Gemini read the whole email, we still don't trust a
  // status change against a weakly-matched application — the risk of
  // updating the wrong entry outweighs the benefit of a confident-
  // sounding but possibly misattributed suggestion.
  const confidence = match.score >= CONFIDENT_MATCH ? (extraction.confidence || 'medium') : 'low'

  return {
    type: 'status_update',
    confidence,
    company: application.company,
    position: application.position,
    currentStatus: application.status,
    suggestedStatus: extraction.suggestedStatus,
    emailId: email.id,
    subject: email.subject,
    sender: email.from,
    reason: extraction.reason || `Gemini classified this as a ${extraction.suggestedStatus.toLowerCase()} email.`,
    matchedApplicationId: application.id,
    source: 'ai'
  }
}

// Batch helper: takes the raw extraction results array (one per
// email that was sent to Gemini) and returns the same suggestion-
// array shape detectEmailEvents produces, ready to render directly.
export function buildAiDetections(extractionResults = [], emails = [], applications = []) {
  const emailsById = new Map(emails.map((email) => [email.id, email]))

  return extractionResults
    .map((extraction) => resolveAiDetection(extraction, emailsById.get(extraction.emailId), applications))
    .filter(Boolean)
}