import { describe, expect, it } from 'vitest'
import type * as vscode from 'vscode'

import { DOTCOM_URL } from '@sourcegraph/cody-shared/src/sourcegraph-api/environments'

import { getConfiguration } from './configuration'

describe('getConfiguration', () => {
    it('returns default values when no config set', () => {
        const config: Pick<vscode.WorkspaceConfiguration, 'get'> = {
            get: <T>(_key: string, defaultValue?: T): typeof defaultValue | undefined => defaultValue,
        }
        expect(getConfiguration(config)).toEqual({
            serverEndpoint: DOTCOM_URL.href,
            proxy: null,
            codebase: '',
            customHeaders: {},
            chatPreInstruction: undefined,
            useContext: 'embeddings',
            autocomplete: true,
            autocompleteLanguages: {
                '*': true,
                scminput: false,
            },
            experimentalCommandLenses: false,
            editorTitleCommandIcon: true,
            experimentalChatPanel: false,
            experimentalChatPredictions: false,
            experimentalGuardrails: false,
            experimentalLocalSymbols: false,
            experimentalSearchPanel: false,
            inlineChat: true,
            codeActions: true,
            isRunningInsideAgent: false,
            agentIDE: undefined,
            experimentalNonStop: false,
            debugEnable: false,
            debugVerbose: false,
            debugFilter: null,
            telemetryLevel: 'all',
            autocompleteAdvancedProvider: null,
            autocompleteAdvancedServerEndpoint: null,
            autocompleteAdvancedModel: null,
            autocompleteAdvancedAccessToken: null,
            autocompleteCompleteSuggestWidgetSelection: true,
            autocompleteExperimentalSyntacticPostProcessing: true,
            autocompleteExperimentalGraphContext: null,
        })
    })

    it('reads values from config', () => {
        const config: Pick<vscode.WorkspaceConfiguration, 'get'> = {
            get: key => {
                switch (key) {
                    case 'cody.serverEndpoint':
                        return 'http://example.com'
                    case 'cody.proxy':
                        return 'socks5://127.0.0.1:9999'
                    case 'cody.codebase':
                        return 'my/codebase'
                    case 'cody.useContext':
                        return 'keyword'
                    case 'cody.customHeaders':
                        return {
                            'Cache-Control': 'no-cache',
                            'Proxy-Authenticate': 'Basic',
                        }
                    case 'cody.autocomplete.enabled':
                        return false
                    case 'cody.autocomplete.languages':
                        return { '*': true, scminput: false }
                    case 'cody.experimental.chatPanel':
                        return true
                    case 'cody.experimental.chatPredictions':
                        return true
                    case 'cody.experimental.newSearch':
                        return true
                    case 'cody.experimental.commandLenses':
                        return true
                    case 'cody.editorTitleCommandIcon':
                        return true
                    case 'cody.experimental.guardrails':
                        return true
                    case 'cody.inlineChat.enabled':
                        return true
                    case 'cody.codeActions.enabled':
                        return true
                    case 'cody.experimental.nonStop':
                        return true
                    case 'cody.experimental.localSymbols':
                        return true
                    case 'cody.experimental.symf.path':
                        return '/usr/local/bin/symf'
                    case 'cody.debug.enable':
                        return true
                    case 'cody.debug.verbose':
                        return true
                    case 'cody.debug.filter':
                        return /.*/
                    case 'cody.telemetry.level':
                        return 'off'
                    case 'cody.chat.preInstruction':
                        return 'My name is Jeff.'
                    case 'cody.autocomplete.advanced.provider':
                        return 'unstable-openai'
                    case 'cody.autocomplete.advanced.serverEndpoint':
                        return 'https://example.com/llm'
                    case 'cody.autocomplete.advanced.model':
                        return 'starcoder-32b'
                    case 'cody.autocomplete.advanced.accessToken':
                        return 'foobar'
                    case 'cody.autocomplete.completeSuggestWidgetSelection':
                        return false
                    case 'cody.autocomplete.experimental.syntacticPostProcessing':
                        return true
                    case 'cody.autocomplete.experimental.graphContext':
                        return 'lsp-light'
                    case 'cody.advanced.agent.running':
                        return false
                    case 'cody.advanced.agent.ide':
                        return undefined
                    default:
                        throw new Error(`unexpected key: ${key}`)
                }
            },
        }
        expect(getConfiguration(config)).toEqual({
            serverEndpoint: 'http://example.com',
            proxy: 'socks5://127.0.0.1:9999',
            codebase: 'my/codebase',
            useContext: 'keyword',
            customHeaders: {
                'Cache-Control': 'no-cache',
                'Proxy-Authenticate': 'Basic',
            },
            chatPreInstruction: 'My name is Jeff.',
            autocomplete: false,
            autocompleteLanguages: {
                '*': true,
                scminput: false,
            },
            experimentalChatPanel: true,
            experimentalChatPredictions: true,
            experimentalSearchPanel: true,
            experimentalCommandLenses: true,
            editorTitleCommandIcon: true,
            experimentalGuardrails: true,
            experimentalLocalSymbols: true,
            inlineChat: true,
            codeActions: true,
            isRunningInsideAgent: false,
            agentIde: undefined,
            experimentalNonStop: true,
            debugEnable: true,
            debugVerbose: true,
            debugFilter: /.*/,
            telemetryLevel: 'off',
            autocompleteAdvancedProvider: 'unstable-openai',
            autocompleteAdvancedServerEndpoint: 'https://example.com/llm',
            autocompleteAdvancedModel: 'starcoder-32b',
            autocompleteAdvancedAccessToken: 'foobar',
            autocompleteCompleteSuggestWidgetSelection: false,
            autocompleteExperimentalSyntacticPostProcessing: true,
            autocompleteExperimentalGraphContext: 'lsp-light',
        })
    })
})
