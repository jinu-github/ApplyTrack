const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  connectGmail: () =>
    ipcRenderer.invoke('gmail:connect'),

  gmailStatus: () =>
    ipcRenderer.invoke('gmail:status'),

  getRecentEmails: () =>
    ipcRenderer.invoke('gmail:getRecentEmails'),

  getCachedEmails: () =>
    ipcRenderer.invoke('gmail:getCachedEmails'),

  saveGmailCredentials: (credentials) =>
    ipcRenderer.invoke('gmail:saveCredentials', credentials),

  clearGmailCredentials: () =>
    ipcRenderer.invoke('gmail:clearCredentials'),

  // ---- Gemini-powered email extraction (optional) ----

  saveAiApiKey: (apiKey) =>
    ipcRenderer.invoke('ai:saveApiKey', apiKey),

  clearAiApiKey: () =>
    ipcRenderer.invoke('ai:clearApiKey'),

  aiStatus: () =>
    ipcRenderer.invoke('ai:status'),

  // emails: array of { id, from, subject, body, snippet, category }
  // Returns { success, results: [{ emailId, ...fields } | { emailId, error }] }
  extractEmailFields: (emails) =>
    ipcRenderer.invoke('ai:extractEmails', emails),

  // Subscribes to emails pushed from the main process after a
  // manual check. Returns an unsubscribe function — call it in a
  // useEffect cleanup.
  onEmailsUpdated: (callback) => {
    const handler = (_event, emails) => callback(emails)

    ipcRenderer.on('emails:updated', handler)

    return () => {
      ipcRenderer.removeListener('emails:updated', handler)
    }
  }
})
