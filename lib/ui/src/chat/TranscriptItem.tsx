import React, { useState } from 'react'

import classNames from 'classnames'

import { ChatMessage } from '@sourcegraph/cody-shared'

import {
    ChatButtonProps,
    ChatUISubmitButtonProps,
    ChatUITextAreaProps,
    CodeBlockActionsProps,
    EditButtonProps,
    FeedbackButtonsProps,
} from '../Chat'

import { BlinkingCursor, LoadingContext } from './BlinkingCursor'
import { CodeBlocks } from './CodeBlocks'
import { FileLinkProps } from './components/ContextFiles'
import { EnhancedContext } from './components/EnhancedContext'
import { PreciseContexts, SymbolLinkProps } from './PreciseContext'

import styles from './TranscriptItem.module.css'

/**
 * CSS class names used for the {@link TranscriptItem} component.
 */
export interface TranscriptItemClassNames {
    transcriptItemClassName?: string
    humanTranscriptItemClassName?: string
    transcriptItemParticipantClassName?: string
    codeBlocksCopyButtonClassName?: string
    codeBlocksInsertButtonClassName?: string
    transcriptActionClassName?: string
    chatInputClassName?: string
}

/**
 * A single message in the chat trans cript.
 */
export const TranscriptItem: React.FunctionComponent<
    {
        message: ChatMessage
        inProgress: boolean
        beingEdited: boolean
        setBeingEdited: (input: boolean) => void
        fileLinkComponent: React.FunctionComponent<FileLinkProps>
        symbolLinkComponent: React.FunctionComponent<SymbolLinkProps>
        textAreaComponent?: React.FunctionComponent<ChatUITextAreaProps>
        EditButtonContainer?: React.FunctionComponent<EditButtonProps>
        editButtonOnSubmit?: (text: string) => void
        showEditButton: boolean
        FeedbackButtonsContainer?: React.FunctionComponent<FeedbackButtonsProps>
        feedbackButtonsOnSubmit?: (text: string) => void
        showFeedbackButtons: boolean
        copyButtonOnSubmit?: CodeBlockActionsProps['copyButtonOnSubmit']
        insertButtonOnSubmit?: CodeBlockActionsProps['insertButtonOnSubmit']
        submitButtonComponent?: React.FunctionComponent<ChatUISubmitButtonProps>
        abortMessageInProgressComponent?: React.FunctionComponent<{ onAbortMessageInProgress: () => void }>
        onAbortMessageInProgress?: () => void
        ChatButtonComponent?: React.FunctionComponent<ChatButtonProps>
    } & TranscriptItemClassNames
> = React.memo(function TranscriptItemContent({
    message,
    inProgress,
    beingEdited,
    setBeingEdited,
    fileLinkComponent,
    symbolLinkComponent,
    transcriptItemClassName,
    humanTranscriptItemClassName,
    transcriptItemParticipantClassName,
    codeBlocksCopyButtonClassName,
    codeBlocksInsertButtonClassName,
    transcriptActionClassName,
    textAreaComponent: TextArea,
    EditButtonContainer,
    editButtonOnSubmit,
    showEditButton,
    FeedbackButtonsContainer,
    feedbackButtonsOnSubmit,
    showFeedbackButtons,
    copyButtonOnSubmit,
    insertButtonOnSubmit,
    submitButtonComponent: SubmitButton,
    chatInputClassName,
    ChatButtonComponent,
}) {
    const [formInput, setFormInput] = useState<string>(message.displayText ?? '')
    const textarea =
        TextArea && beingEdited && editButtonOnSubmit && SubmitButton ? (
            <div className={styles.textAreaContainer}>
                <TextArea
                    className={classNames(styles.chatInput, chatInputClassName)}
                    rows={5}
                    value={formInput}
                    autoFocus={true}
                    required={true}
                    onInput={event => setFormInput((event.target as HTMLInputElement).value)}
                    onKeyDown={event => {
                        if (event.key === 'Escape') {
                            setBeingEdited(false)
                        }

                        if (
                            event.key === 'Enter' &&
                            !event.shiftKey &&
                            !event.nativeEvent.isComposing &&
                            formInput.trim()
                        ) {
                            event.preventDefault()
                            setBeingEdited(false)
                            editButtonOnSubmit(formInput)
                        }
                    }}
                />
                <SubmitButton
                    className={styles.submitButton}
                    onClick={() => {
                        setBeingEdited(false)
                        editButtonOnSubmit(formInput)
                    }}
                    disabled={formInput.length === 0}
                />
            </div>
        ) : null

    return (
        <div
            className={classNames(
                styles.row,
                transcriptItemClassName,
                message.speaker === 'human' ? humanTranscriptItemClassName : styles.assistantRow
            )}
        >
            {/* display edit buttons on last user message, feedback buttons on last assistant message only */}
            {EditButtonContainer && beingEdited && <p className={classNames(styles.editingLabel)}>Editing...</p>}
            {showEditButton && EditButtonContainer && editButtonOnSubmit && TextArea && message.speaker === 'human' && (
                <header
                    className={classNames(
                        beingEdited ? styles.editingContainer : styles.headerContainer,
                        transcriptItemParticipantClassName
                    )}
                >
                    <EditButtonContainer
                        className={styles.FeedbackEditButtonsContainer}
                        messageBeingEdited={beingEdited}
                        setMessageBeingEdited={setBeingEdited}
                    />
                </header>
            )}
            {message.preciseContext && message.preciseContext.length > 0 && (
                <div className={styles.actions}>
                    <PreciseContexts
                        preciseContexts={message.preciseContext}
                        symbolLinkComponent={symbolLinkComponent}
                        className={transcriptActionClassName}
                    />
                </div>
            )}
            <div className={classNames(styles.contentPadding, textarea ? undefined : styles.content)}>
                {message.displayText
                    ? textarea ?? (
                          <CodeBlocks
                              displayText={message.displayText}
                              copyButtonClassName={codeBlocksCopyButtonClassName}
                              copyButtonOnSubmit={copyButtonOnSubmit}
                              insertButtonClassName={codeBlocksInsertButtonClassName}
                              insertButtonOnSubmit={insertButtonOnSubmit}
                              metadata={message.metadata}
                              inProgress={inProgress}
                          />
                      )
                    : inProgress && <BlinkingCursor />}
            </div>
            {message.buttons?.length && ChatButtonComponent && (
                <div className={styles.actions}>{message.buttons.map(ChatButtonComponent)}</div>
            )}
            {message.speaker === 'human' && (
                <div className={styles.contextFilesContainer}>
                    {message.contextFiles && message.contextFiles.length > 0 ? (
                        <EnhancedContext
                            contextFiles={message.contextFiles}
                            fileLinkComponent={fileLinkComponent}
                            className={transcriptActionClassName}
                        />
                    ) : (
                        inProgress && <LoadingContext />
                    )}
                </div>
            )}
            {showFeedbackButtons &&
                FeedbackButtonsContainer &&
                feedbackButtonsOnSubmit &&
                message.speaker === 'assistant' && (
                    <footer className={classNames(styles.footerContainer, transcriptItemParticipantClassName)}>
                        {/* display edit buttons on last user message, feedback buttons on last assistant message only */}
                        <FeedbackButtonsContainer
                            className={styles.FeedbackEditButtonsContainer}
                            feedbackButtonsOnSubmit={feedbackButtonsOnSubmit}
                        />
                    </footer>
                )}
        </div>
    )
})
