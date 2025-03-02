import * as vscode from 'vscode'

import { ChatEventSource } from '@sourcegraph/cody-shared/src/chat/transcript/messages'
import { FixupIntent } from '@sourcegraph/cody-shared/src/editor'

import { Diff } from './diff'
import { FixupFile } from './FixupFile'
import { CodyTaskState } from './utils'

export type taskID = string

export class FixupTask {
    public id: taskID
    public state_: CodyTaskState = CodyTaskState.idle
    /**
     * The original text that we're working on updating. Set when we start an LLM spin.
     */
    public original = ''
    /** The text of the streaming turn of the LLM, if any */
    public inProgressReplacement: string | undefined
    /** The text of the last completed turn of the LLM, if any */
    public replacement: string | undefined
    /** The error attached to the fixup, if any */
    public error: string | undefined
    /**
     * If text has been received from the LLM and a diff has been computed,
     * it is cached here. Diffs are recomputed lazily and may be stale.
     */
    public diff: Diff | undefined
    /** The number of times we've submitted this to the LLM. */
    public spinCount = 0
    // The edited range of the applied replacement
    public editedRange: vscode.Range | undefined
    public formattingResolver: ((value: boolean) => void) | null = null

    constructor(
        public readonly fixupFile: FixupFile,
        public readonly instruction: string,
        /* The intent of the edit, derived from the source of the command. */
        public readonly intent: FixupIntent = 'edit',
        public selectionRange: vscode.Range,
        /* insert mode means insert replacement at selection, otherwise replace selection contents with replacement */
        public insertMode?: boolean,
        /* the source of the instruction, e.g. 'code-action', 'doc', etc */
        public source?: ChatEventSource
    ) {
        this.id = Date.now().toString(36).replaceAll(/\d+/g, '')
        this.instruction = instruction.replace(/^\/(edit|fix)/, '').trim()
    }

    /**
     * Sets the task state. Checks the state transition is valid.
     */
    public set state(state: CodyTaskState) {
        this.state_ = state
    }

    public get state(): CodyTaskState {
        return this.state_
    }
}
