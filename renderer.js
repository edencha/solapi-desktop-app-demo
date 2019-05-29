const { ipcRenderer } = require('electron')

const selectEl = document.querySelector('#from')
const defaultOptionEl = selectEl.options[0]
const balanceEl = document.querySelector('.balance')
const pointEl = document.querySelector('.point')
const responseEl = document.querySelector('#response')
const recipentEl = document.querySelector('#to')
const messageEl = document.querySelector('#message')
const sizeEl = document.querySelector('.size')

ipcRenderer.on('after-login', (e, cookie) => {
  const loginForm = document.querySelector('.login-form')
  const messageForm = document.querySelector('.textmessage-form')
  loginForm.style.display = cookie ? 'none' : 'block'
  messageForm.style.display = cookie ? 'block' : 'none'
  if (cookie) {
    ipcRenderer.send('get-senderids', cookie.value)
    ipcRenderer.send('get-balance', cookie.value)
  }
})

ipcRenderer.on('senderids', (e, senderids) => {
  senderids.map(senderId => {
    selectEl.options.add(new Option(senderId, senderId, false))
  })
})

ipcRenderer.on('balance', (e, balanceInfo) => {
  const { balance, point } = balanceInfo
  balanceEl.innerHTML = balance
  pointEl.innerHTML = point
})

ipcRenderer.on('response', (e, responseData) => {
  responseEl.innerHTML = JSON.stringify(responseData, null, '\t')
})

function getTextMessageSize(message) {
  return message
    ? message
      .match(/./g)
      .map(str => {
        var charCode = str.charCodeAt(0)
        return charCode <= 0x00007f ? 1 : 2
      })
      .reduce((a, b) => a + b)
    : 0
}

function cutTextMessage(message) {
  let size = 0
  return message.match(/./g).filter(str => {
    var charCode = str.charCodeAt(0)
    size += charCode <= 0x00007f ? 1 : 2
    return size <= 90
  })
}

function onClickLogin() {
  ipcRenderer.send('request-login')
}

function onClickLogout() {
  selectEl.innerHTML = ''
  selectEl.options.add(defaultOptionEl)
  balanceEl.innerHTML = 0
  pointEl.innerHTML = 0
  responseEl.innerHTML = ''
  recipentEl.value = ''
  messageEl.value = ''
  sizeEl.innerHTML = 0
  ipcRenderer.send('request-logout')
}

function onChangeTextMessage() {
  if (getTextMessageSize(messageEl.value) > 90) {
    messageEl.value = cutTextMessage(messageEl.value).join('')
  }
  sizeEl.innerHTML = getTextMessageSize(messageEl.value)
}

function onClickSendMessage() {
  const message = messageEl.value
  const option = selectEl.options[selectEl.selectedIndex]
  const selSenderId = (option || {}).value
  if (!confirm('정말로 발송합니까?')) return
  const to = recipentEl.value
  ipcRenderer.send('send-message', message, selSenderId, to)
}
