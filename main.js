const electron = require('electron')
const qs = require('qs')
const axios = require('axios')
const parse = require('url-parse')
const { app } = electron
const { BrowserWindow, session, ipcMain, dialog } = electron
let win
let child

const config = {
  apiHost: 'https://solapi-desktop-app-demo.sendsms.kr',
  solapiHost: 'https://api.solapi.com',
  client_id: 'CIDIVP82EOCJX1WO',
  response_type: 'code',
  redirect_uri: 'https://solapi-desktop-app-demo.sendsms.kr/token'
}

function isLogin() {
  return new Promise((resolve, reject) => {
    session.defaultSession.cookies.get({ name: 'state' }, (error, cookies) => {
      if (error) return reject(error)
      if (cookies.length > 0) {
        const cookie = cookies[0]
        return resolve(cookie)
      }
      return resolve(false)
    })
  })
}

function clearCookie() {
  return new Promise((resolve, reject) => {
    session.defaultSession.clearStorageData([], data => {
      return resolve(data)
    })
  })
}

function setCookie(data) {
  return new Promise((resolve, reject) => {
    session.defaultSession.cookies.set(data, error => {
      if (error) return reject(error)
      return resolve(data)
    })
  })
}

ipcMain.on('get-senderids', async (e, state) => {
  try {
    const { data } = await axios.get(config.apiHost + '/senderids', {
      headers: {
        Authorization: `Bearer ${state}`
      }
    })
    win.webContents.send('senderids', data.senderids)
  } catch (error) {
    console.error(error)
  }
})

function getBalance(state) {
  return axios.get(config.apiHost + '/balance', {
    headers: {
      Authorization: `Bearer ${state}`
    }
  })
}

ipcMain.on('get-balance', async (e, state) => {
  try {
    const { data } = await getBalance(state)
    win.webContents.send('balance', data.balance)
  } catch (error) {
    console.error(error)
  }
})

ipcMain.on('send-message', (e, message, from, to) => {
  session.defaultSession.cookies.get(
    { name: 'state' },
    async (error, cookies) => {
      const cookie = cookies[0]
      const state = cookie.value
      try {
        const result = await axios.post(config.apiHost + '/send', {
          from,
          to,
          message,
          state
        })
        const { data } = await getBalance(state)
        win.webContents.send('balance', data.balance)
        win.webContents.send('response', result.data)
      } catch (error) {
        const { response } = error
        win.webContents.send('response', response.data)
      }
    }
  )
})

ipcMain.on('request-logout', async e => {
  child = new BrowserWindow({ parent: win, show: false })
  child.setMenu(null)
  const logoutPage = config.solapiHost + '/oauth2/v1/logout'
  child.loadURL(logoutPage)
  await clearCookie()
  win.webContents.send('after-login', await isLogin())
  child.close()
})

ipcMain.on('request-login', async e => {
  let url, state
  // 이미 로그인창이 열려있는 경우 기존의 창은 닫기
  if (child) child.destroy()
  child = new BrowserWindow({
    parent: win,
    width: 500,
    height: 600,
    modal: false,
    show: true,
    webPreferences: {
      nodeIntegration: true
    }
  })
  child.setMenu(null)
  try {
    // 로그인 버튼 url 받아오기
    const { data } = await axios.get(config.apiHost + '/get-authorize-url')
    url = data.url
    state = data.state
  } catch (error) {
    console.error(error)
  }
  child.loadURL(url)
  child.webContents.on('did-redirect-navigation', async (e, url) => {
    try {
      const { pathname, query } = parse(url)
      if (pathname === '/login-fail') {
        const { message } = qs.parse(query.replace(/^\?/, ''))
        dialog.showMessageBox(
          child,
          {
            title: 'Error',
            message
          },
          () => {
            child.destroy()
          }
        )
      }
      if (pathname !== '/login-success') return
      const cookie = {
        url: config.apiHost,
        name: 'state',
        value: String(state)
      }
      await setCookie(cookie)
      win.webContents.send('after-login', cookie)
      child.close()
    } catch (error) {
      dialog.showMessageBox(
        child,
        {
          title: 'Error',
          message: error.message
        },
        () => {
          child.close()
        }
      )
    }
  })
})

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  })
  win.setMenu(null)

  win.webContents.on('did-finish-load', async () => {
    win.webContents.send('after-login', await isLogin())
  })

  win.loadURL(`file://${__dirname}/index.html`)
  win.on('closed', () => {
    win = null
  })
}
app.on('ready', createWindow)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
app.on('activate', () => {
  if (win === null) {
    createWindow()
  }
})
