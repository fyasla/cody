import { ContextFile } from '../../codebase-context/messages'
import { ActiveTextEditorSelection } from '../../editor'

/**
 * Creates display text for the given context files by replacing file names with markdown links.
 */
export function createDisplayTextWithFileLinks(files: ContextFile[], text: string): string {
    let formattedText = text
    for (const file of files) {
        if (file?.fileName && file?.uri?.fsPath) {
            formattedText = replaceFileNameWithMarkdownLink(
                formattedText,
                file?.fileName.trim(),
                file?.uri?.fsPath,
                file.range?.start?.line
            )
        }
    }
    return formattedText
}

/**
 * Gets the display text to show for the human's input.
 *
 * If there is a selection, display the file name + range alongside with human input
 * If the workspace root is available, it generates a markdown link to the file.
 */
export function createDisplayTextWithFileSelection(
    humanInput: string,
    selection?: ActiveTextEditorSelection | null
): string {
    const fileName = selection?.fileName?.trim()
    if (!fileName) {
        return humanInput
    }

    const displayText = `${humanInput} @${fileName}`
    const fsPath = selection?.fileUri?.fsPath
    const startLine = selection?.selectionRange?.start?.line
    if (!fsPath || !selection?.selectionRange?.end?.line) {
        return displayText
    }

    // Create markdown link to the file
    return replaceFileNameWithMarkdownLink(displayText, `@${fileName}`, fsPath, startLine)
}

/**
 * Replaces a file name in given text with markdown link to open that file in editor.
 * @returns The updated text with the file name replaced by a markdown link.
 */
export function replaceFileNameWithMarkdownLink(
    humanInput: string,
    fileName: string,
    fsPath: string,
    startLine = 0
): string {
    // Create markdown link to the file
    const range = startLine ? `:${startLine}` : ''
    const fileLink = `vscode://file${fsPath}${range}`
    const markdownText = `[_${fileName.trim()}_](${fileLink})`

    // Use regex to makes sure the file name is surrounded by spaces and not a substring of another file name
    const textToBeReplaced = new RegExp(`\\s*${fileName.replaceAll(/[$()*+./?[\\\]^{|}-]/g, '\\$&')}(?!\\S)`, 'g')
    return humanInput.replaceAll(textToBeReplaced, ` ${markdownText}`).trim()
}
