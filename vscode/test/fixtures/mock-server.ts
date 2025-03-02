import { PubSub } from '@google-cloud/pubsub'
import express from 'express'
import * as uuid from 'uuid'

import { TelemetryEventInput } from '@sourcegraph/telemetry'

// create interface for the request
interface MockRequest {
    headers: {
        authorization: string
    }
    body: {
        messages: {
            text: string
        }[]
    }
}

const SERVER_PORT = 49300

export const SERVER_URL = 'http://localhost:49300'
export const VALID_TOKEN = 'abcdefgh1234'

const responses = {
    chat: 'hello from the assistant',
    fixup: '<fixup><title>Goodbye Cody</title></fixup>',
    firstCode: { completion: 'myFirstCompletion', stopReason: 'stop_sequence' },
    code: { completion: 'myNotFirstCompletion', stopReason: 'stop_sequence' },
}

const FIXUP_PROMPT_TAG = '<selectedCode>'
const NON_STOP_FIXUP_PROMPT_TAG = '<fixup>'

const pubSubClient = new PubSub({
    projectId: 'sourcegraph-telligent-testing',
})

const publishOptions = {
    gaxOpts: {
        timeout: 120000,
    },
}

const topicPublisher = pubSubClient.topic('projects/sourcegraph-telligent-testing/topics/e2e-testing', publishOptions)

// Runs a stub Cody service for testing.
export async function run<T>(around: () => Promise<T>): Promise<T> {
    const app = express()
    app.use(express.json())

    // endpoint which will accept the data that you want to send in that you will add your pubsub code
    app.post('/.api/testLogging', (req, res) => {
        void logTestingData('legacy', req.body)
        storeLoggedEvents(req.body)
        res.status(200)
    })

    // matches @sourcegraph/cody-shared/src/sourcegraph-api/telemetry/MockServerTelemetryExporter
    // importing const doesn't work, so hardcode it here.
    app.post('/.api/mockEventRecording', (req, res) => {
        const events = req.body as TelemetryEventInput[]
        events.forEach(event => {
            void logTestingData('new', JSON.stringify(event))
            if (
                ![
                    'cody.extension', // extension setup events can behave differently in test environments
                ].includes(event.feature)
            ) {
                loggedV2Events.push(`${event.feature}/${event.action}`)
            }
        })
        res.status(200)
    })

    app.post('/.api/completions/stream', (req, res) => {
        // TODO: Filter streaming response
        // TODO: Handle multiple messages
        // Ideas from Dom - see if we could put something in the test request itself where we tell it what to respond with
        // or have a method on the server to send a set response the next time it sees a trigger word in the request.
        const request = req as MockRequest
        const lastHumanMessageIndex = request.body.messages.length - 2
        const response =
            request.body.messages[lastHumanMessageIndex].text.includes(FIXUP_PROMPT_TAG) ||
            request.body.messages[lastHumanMessageIndex].text.includes(NON_STOP_FIXUP_PROMPT_TAG)
                ? responses.fixup
                : responses.chat
        res.send(`event: completion\ndata: {"completion": ${JSON.stringify(response)}}\n\nevent: done\ndata: {}\n\n`)
    })

    let isFirstCompletion = true
    app.post('/.api/completions/code', (req, res) => {
        const response = isFirstCompletion ? responses.firstCode : responses.code
        isFirstCompletion = false
        res.send(JSON.stringify(response))
    })

    app.post('/.api/graphql', (req, res) => {
        if (req.headers.authorization !== `token ${VALID_TOKEN}`) {
            res.sendStatus(401)
            return
        }

        const operation = new URL(req.url, 'https://example.com').search.replace(/^\?/, '')
        switch (operation) {
            case 'CurrentUser':
                res.send(JSON.stringify({ data: { currentUser: 'u' } }))
                break
            case 'IsContextRequiredForChatQuery':
                res.send(JSON.stringify({ data: { isContextRequiredForChatQuery: false } }))
                break
            case 'SiteProductVersion':
                res.send(JSON.stringify({ data: { site: { productVersion: 'dev' } } }))
                break
            case 'SiteGraphQLFields':
                res.send(JSON.stringify({ data: { __type: { fields: [{ name: 'id' }, { name: 'isCodyEnabled' }] } } }))
                break
            case 'SiteHasCodyEnabled':
                res.send(JSON.stringify({ data: { site: { isCodyEnabled: true } } }))
                break
            default:
                res.sendStatus(400)
                break
        }
    })

    const server = app.listen(SERVER_PORT, () => {
        console.log(`Mock server listening on port ${SERVER_PORT}`)
    })

    const result = await around()

    server.close()

    return result
}

export async function logTestingData(type: 'legacy' | 'new', data: string): Promise<void> {
    const message = {
        type,
        event: data,
        timestamp: new Date().getTime(),
        test_name: currentTestName,
        test_id: currentTestID,
        test_run_id: currentTestRunID,
        UID: uuid.v4(),
    }

    // Publishes the message as a string
    const dataBuffer = Buffer.from(JSON.stringify(message))

    const messageID = await topicPublisher.publishMessage({ data: dataBuffer }).catch(error => {
        console.error('Error publishing message:', error)
    })
    console.log(`Message published - Type: ${type}, ID: ${messageID}, TestRunId: ${currentTestRunID}`)
}

let currentTestName: string
let currentTestID: string
let currentTestRunID: string

export function sendTestInfo(testName: string, testID: string, testRunID: string): void {
    currentTestName = testName || ''
    currentTestID = testID || ''
    currentTestRunID = testRunID || ''
}

export let loggedEvents: string[] = []

// Events recorded using the new event recorders
// Needs to be recorded separately from the legacy events to ensure ordering
// is stable.
export let loggedV2Events: string[] = []

export function resetLoggedEvents(): void {
    loggedEvents = []
    loggedV2Events = []
}
export function storeLoggedEvents(event: string): void {
    interface ParsedEvent {
        event: string
    }
    const parsedEvent = JSON.parse(JSON.stringify(event)) as ParsedEvent
    const name = parsedEvent.event
    if (
        ![
            'CodyInstalled',
            'CodyVSCodeExtension:Auth:failed',
            'CodyVSCodeExtension:auth:clickOtherSignInOptions',
            'CodyVSCodeExtension:login:clicked',
            'CodyVSCodeExtension:auth:selectSigninMenu',
            'CodyVSCodeExtension:auth:fromToken',
            'CodyVSCodeExtension:Auth:connected',
        ].includes(name)
    ) {
        loggedEvents.push(name)
    }
}
