import { logDebug } from '../log'

import { DocumentContext } from './get-current-doc-context'

export interface LatencyFeatureFlags {
    user?: boolean
    language?: boolean
}

const defaultLatencies = {
    user: 200,
    lowPerformance: 1000,
    comment: 1000,
    max: 2000,
}

// Languages with lower performance get additional latency to avoid spamming users with unhelpful
// suggestions
export const lowPerformanceLanguageIds = new Set([
    'css',
    'html',
    'scss',
    'vue',
    'dart',
    'json',
    'yaml',
    'postcss',
    'markdown',
    'plaintext',
    'xml',
])

let userMetrics = {
    sessionTimestamp: 0,
    currentLatency: 0,
    suggested: 0,
    uri: '',
}

// Adjust the minimum latency based on user actions and env Start when the last 5 suggestions were
// not accepted Increment latency by 200ms linearly up to max latency Reset every 5 minutes, or on
// file change, or on accepting a suggestion
export function getArtificialDelay(
    featureFlags: LatencyFeatureFlags,
    uri: string,
    languageId: string,
    docContext: Pick<DocumentContext, 'completionIntent'>
): number {
    let baseline = 0

    const isLowPerformance = featureFlags.language && lowPerformanceLanguageIds.has(languageId)
    const isComment = docContext.completionIntent === 'comment'
    if (isLowPerformance || isComment) {
        baseline = defaultLatencies.lowPerformance
    }

    const timestamp = Date.now()
    if (!userMetrics.sessionTimestamp) {
        userMetrics.sessionTimestamp = timestamp
    }

    const elapsed = timestamp - userMetrics.sessionTimestamp
    // reset metrics and timer after 5 minutes or file change
    if (elapsed >= 5 * 60 * 1000 || userMetrics.uri !== uri) {
        resetArtificialDelay(timestamp)
    }

    userMetrics.suggested++
    userMetrics.uri = uri

    const total = Math.max(baseline, Math.min(baseline + userMetrics.currentLatency, defaultLatencies.max))

    // Increase latency linearly up to max after 5 rejected suggestions
    if (userMetrics.suggested >= 5 && userMetrics.currentLatency < defaultLatencies.max) {
        userMetrics.currentLatency += featureFlags.user ? defaultLatencies.user : 0
    }

    logDebug('CodyCompletionProvider:getLatency', `Delay added: ${total}`)

    return total
}

// reset user latency and counter:
// - on acceptance
// - every 5 minutes
// - on file change
export function resetArtificialDelay(timestamp = 0): void {
    userMetrics = {
        sessionTimestamp: timestamp,
        currentLatency: 0,
        suggested: 0,
        uri: '',
    }
    logDebug('CodyCompletionProvider:resetArtificialDelay', 'Latency Reset')
}
