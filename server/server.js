const express = require('express')
const app = express()
const axios = require('axios')
const uniqid = require('uniqid')
const qs = require('qs')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const { config, Group } = require('coolsms-sdk-v4')
const AccessToken = require('./models/accessToken')
const clientConfig = require('./client-config.json')
const oauth2Config = {
  response_type: 'code',
  redirect_uri: 'https://solapi-desktop-app-demo.sendsms.kr/token',
  scope: 'cash:read message:write senderid:read'
}

app.use(bodyParser.json())

mongoose
  .connect('mongodb://localhost/desktop-app', { useNewUrlParser: true })
  .then(() => console.log('Successfully connected to mongodb'))
  .catch(e => console.error(e))

app.use('/healthcheck', (req, res) => {
  return res.status(200).send()
})

// get access token
app.use('/token', async (req, res, next) => {
  try {
    const code = req.query.code
    const state = req.query.state
    const requestUrl = 'https://api.solapi.com/oauth2/v1/access_token'
    const reqBody = {
      grant_type: 'authorization_code',
      client_id: clientConfig.clientId,
      client_secret: clientConfig.clientSecret,
      redirect_uri: 'https://solapi-desktop-app-demo.sendsms.kr/token',
      code
    }
    const { data } = await axios.post(requestUrl, reqBody)
    AccessToken.create({
      accessToken: data.access_token,
      state
    })
      .then(data => {
        res.redirect('/login-success')
      })
      .catch(error => {
        res.redirect('/login-fail?message=' + error.message)
      })
  } catch (error) {
    next(error)
  }
})

function getAccessToken(state) {
  return new Promise((resolve, reject) => {
    AccessToken.findOne({ state })
      .then(data => {
        if (!data) return reject(state + '로 토큰을 찾을 수 없음')
        resolve(data.accessToken)
      })
      .catch(reject)
  })
}

// 권한 승인 페이지 url
app.use('/get-authorize-url', (req, res) => {
  const authorizePage = 'https://api.solapi.com/oauth2/v1/authorize?'
  const state = uniqid()
  const query = {
    client_id: clientConfig.clientId,
    response_type: oauth2Config.response_type,
    redirect_uri: oauth2Config.redirect_uri,
    scope: oauth2Config.scope,
    state
  }
  res.send({
    url: authorizePage + qs.stringify(query),
    state
  })
})

app.use('/send', async (req, res, next) => {
  try {
    const { to, from, message, state } = req.body
    const accessToken = await getAccessToken(state)
    config.init({ accessToken })
    const response = await Group.sendSimpleMessage(
      {
        type: 'SMS',
        to,
        from,
        text: message
      },
      {
        appId: 'OavaIZnGRICS'
      }
    )
    res.send(response)
  } catch (error) {
    next(error)
  }
})

app.use('/senderids', async (req, res, next) => {
  try {
    const state = req.headers.authorization.split(' ')[1]
    const accessToken = await getAccessToken(state)
    const headers = { Authorization: `Bearer ${accessToken}` }
    const requestUrl = 'https://api.solapi.com/senderid/v1/numbers/active'
    const { data: senderids } = await axios.get(requestUrl, { headers })
    res.send({ senderids })
  } catch (error) {
    next(error)
  }
})

app.use('/balance', async (req, res, next) => {
  try {
    const state = req.headers.authorization.split(' ')[1]
    const accessToken = await getAccessToken(state)
    const headers = { Authorization: `Bearer ${accessToken}` }
    const requestUrl = 'https://api.solapi.com/cash/v1/balance'
    const { data: balance } = await axios.get(requestUrl, { headers })
    res.send({ balance })
  } catch (error) {
    next(error)
  }
})

app.use(async (err, req, res, next) => {
  res.status(500).send(err)
})

app.listen(3000, function() {
  console.log('Server running on port: 3000')
})
