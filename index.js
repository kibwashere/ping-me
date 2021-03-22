require('dotenv').config()

const cors = require('cors')
const axios = require('axios')
const express = require('express')
const bodyParser = require('body-parser')

const port = 81
const app = express()

// Slack
const slackChannel = 'home-security'
const slackToken = process.env.SLACK_TOKEN
const { sendSlack } = require('@kznjunk/paperboy-slack')(slackToken)

// Gmail
const gmailConfig = getGmailConfig()
const { EMAIL_FROM, EMAIL_TO } = process.env
const { sendGmail } = require('@kznjunk/paperboy-gmail')(gmailConfig)

// FCM
const { FCM_CONFIG_PATH, FCM_TOPIC } = process.env
const fcmConfig = require(FCM_CONFIG_PATH)
const { sendFcm } = require('@kznjunk/paperboy-fcm')(fcmConfig)

initServer()
handleHP()
handleAlert()
listen()

function handleHP() {
    app.get('/', (req, res) => {
        res.send('bwop')
    })
}

function handleAlert() {
    app.get('/sendAlert', async (req, res) => {
        const { home, room, z } = req.query
        const isGoodCity = home === 'Bannalec'
        const isGoodRoom = ['salon', 'sdb', 'cuisine', 'asc', 'ext', 'chambre'].indexOf(room) > -1

        if (isGoodCity && isGoodRoom && z) {
            const title = '🚨 URGENT 🚨'
            const body = `Someone called from the room "${room}" at ${home}! [${z}]`

            await Promise.all([
                sendSlack(slackChannel, `${title}: ${body}`),
                sendGmail(EMAIL_FROM, EMAIL_TO, title, body),
                sendFcm(FCM_TOPIC, title, body)
            ])

            res.send('Done.')
        } else {
            res.send('Something went wrong...')
        }
    })
}

function getGmailConfig() {
    const {
        EMAIL_CLIENTID,
        EMAIL_CLIENTSECRET,
        EMAIL_REFRESHTOKEN
    } = process.env

    return {
        clientId: EMAIL_CLIENTID,
        clientSecret: EMAIL_CLIENTSECRET,
        refreshToken: EMAIL_REFRESHTOKEN
    }
}

function initServer() {
    app.use(cors())
    app.set('trust proxy', true)
    app.use(bodyParser.json())
    app.use(express.urlencoded({ extended: true }))
}

function listen() {
    app.listen(port, () => {
        console.log(`App listening at http://localhost:${port}`)
    })
}
