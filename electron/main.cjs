const path = require('path')

// Load .env explicitly — relying on the working directory isn't
// reliable once the app is packaged.
require('dotenv').config({
  path: path.join(__dirname, '..', '.env')
})

const { app, BrowserWindow, shell, ipcMain } = require('electron')
const {
  connectGmail,
  getGmailStatus,
  getRecentEmails,
  saveOAuthCredentials,
  hasOAuthCredentials,
  clearOAuthCredentials
} = require('./gmail.cjs')

ipcMain.handle('gmail:saveCredentials', (event, creds) => saveOAuthCredentials(creds))
ipcMain.handle('gmail:clearCredentials', () => clearOAuthCredentials())

const isDev = !app.isPackaged

let mainWindow = null

// Caches the most recent email fetch so the Job Emails page can
// repopulate instantly when it remounts after navigating away,
// without hitting the Gmail API again.
let lastEmails = []

function createWindow() {
  const win = new BrowserWindow({
    width: 1500,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#0b1120',
    icon: path.join(__dirname, '..', 'build', 'applytrack.ico'),
    titleBarStyle: 'hiddenInset',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: false
    }
  })

  if (isDev) win.loadURL('http://localhost:5173/')
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow = win

  win.on('closed', () => {
    mainWindow = null
  })
}

// Sends the latest email list to the renderer, if it's currently
// mounted and listening.
function broadcastEmails(emails) {
  if (!mainWindow) return

  mainWindow.webContents.send('emails:updated', emails)
}

async function fetchEmails() {
  const result = await getRecentEmails()

  if (result.success) {
    lastEmails = result.emails || []
    broadcastEmails(lastEmails)
  }

  return result
}

ipcMain.handle('gmail:connect', async () => {
  try {
    const result = await connectGmail()

    return result
  } catch (error) {
    console.error('Gmail connection error:', error)

    return {
      success: false,
      error: error.message
    }
  }
})

ipcMain.handle(
  'gmail:status',
  () => {
    return getGmailStatus()
  }
)

ipcMain.handle('gmail:getRecentEmails', async () => {
  try {
    return await fetchEmails()
  } catch (error) {
    console.error(
      'Unable to retrieve Gmail messages:',
      error
    )

    return {
      success: false,
      error: error.message
    }
  }
})

// Returns whatever was fetched most recently, without hitting the
// Gmail API again. Used to instantly repopulate the Job Emails page
// when it remounts after the user navigates away and back.
ipcMain.handle('gmail:getCachedEmails', () => {
  return {
    success: true,
    emails: lastEmails
  }
})

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
