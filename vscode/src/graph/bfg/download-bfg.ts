import * as fs from 'fs'
import { promises as fspromises } from 'fs'
import path from 'path'

import axios from 'axios'
import * as unzipper from 'unzipper'
import * as vscode from 'vscode'

import { fileExists } from '../../local-context/download-symf'
import { logDebug } from '../../log'
import { getOSArch } from '../../os'

// Available releases: https://github.com/sourcegraph/bfg/releases
const defaultBfgVersion = '5.2.6637'

export async function downloadBfg(context: vscode.ExtensionContext): Promise<string | null> {
    const config = vscode.workspace.getConfiguration()
    const userBfgPath = config.get<string>('cody.experimental.cody-engine.path')
    if (userBfgPath) {
        const bfgStat = await fspromises.stat(userBfgPath)
        if (!bfgStat.isFile()) {
            throw new Error(`not a file: ${userBfgPath}`)
        }
        logDebug('CodyEngine', `using user-provided path: ${userBfgPath} ${bfgStat.isFile()}`)
        return userBfgPath
    }

    const osArch = getOSArch()
    if (!osArch) {
        logDebug('CodyEngine', 'getOSArch returned nothing')
        return null
    }
    const { platform, arch } = osArch

    if (!arch) {
        logDebug('CodyEngine', 'getOSArch returned undefined arch')
        return null
    }

    if (!platform) {
        logDebug('CodyEngine', 'getOSArch returned undefined platform')
        return null
    }
    // Rename returned architecture to match RFC 795 conventions
    // https://docs.google.com/document/d/11cw-7dAp93JmasITNSNCtx31xrQsNB1L2OoxVE6zrTc/edit
    const archRenames = new Map([
        ['aarch64', 'arm64'],
        ['x86_64', 'x64'],
    ])
    const rfc795Arch = archRenames.get(arch ?? '') ?? arch

    const bfgContainingDir = path.join(context.globalStorageUri.fsPath, 'cody-engine')
    const bfgVersion = config.get<string>('cody.experimental.cody-engine.version', defaultBfgVersion)
    await fspromises.mkdir(bfgContainingDir, { recursive: true })
    const bfgFilename = `cody-engine-${bfgVersion}-${platform}-${rfc795Arch}`
    const bfgPath = path.join(bfgContainingDir, bfgFilename)
    const isAlreadyDownloaded = await fileExists(bfgPath)
    if (isAlreadyDownloaded) {
        logDebug('CodyEngine', `using downloaded path "${bfgPath}"`)
        return bfgPath
    }

    const bfgURL = `https://github.com/sourcegraph/bfg/releases/download/v${bfgVersion}/bfg-${platform}-${rfc795Arch}.zip`
    try {
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Window,
                title: 'Downloading cody-engine',
                cancellable: false,
            },
            async progress => {
                progress.report({ message: 'Downloading cody-engine' })
                const bfgZip = path.join(bfgContainingDir, 'bfg.zip')
                await downloadBfgBinary(bfgURL, bfgZip)
                await unzipBfg(bfgZip, bfgContainingDir)
                logDebug('CodyEngine', bfgPath)
                // The zip file contains a binary named `bfg` or `bfg.exe`. We unzip it with that name first and then rename into
                // a version-specific binary so that we can delete old versions of bfg.
                const unzipPath = platform === 'windows' ? 'bfg.exe' : 'bfg'
                await fspromises.rename(path.join(bfgContainingDir, unzipPath), bfgPath)
                await fspromises.chmod(bfgPath, 0o755)
                await fspromises.rm(bfgZip)
                logDebug('CodyEngine', `downloaded cody-engine to ${bfgPath}`)
            }
        )
        void removeOldBfgBinaries(bfgContainingDir, bfgFilename)
    } catch (error) {
        void vscode.window.showErrorMessage(`Failed to download bfg from URL ${bfgURL}: ${error}`)
        return null
    }
    return bfgPath
}

async function unzipBfg(zipFile: string, destinationDir: string): Promise<void> {
    const zip = fs.createReadStream(zipFile).pipe(unzipper.Parse({ forceStream: true }))
    for await (const entry of zip) {
        if (entry.path.endsWith('/')) {
            continue
        }
        entry.pipe(fs.createWriteStream(path.join(destinationDir, entry.path)))
    }
}

async function downloadBfgBinary(url: string, destination: string): Promise<void> {
    logDebug('CodyEngine', `downloading from URL ${url}`)
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        maxRedirects: 10,
    })

    const stream = fs.createWriteStream(destination)
    response.data.pipe(stream)

    await new Promise((resolve, reject) => {
        stream.on('finish', resolve)
        stream.on('error', reject)
    })
}

async function removeOldBfgBinaries(containingDir: string, currentBfgPath: string): Promise<void> {
    const bfgDirContents = await fspromises.readdir(containingDir)
    const oldBfgBinaries = bfgDirContents.filter(f => f.startsWith('bfg') && f !== currentBfgPath)
    for (const oldBfgBinary of oldBfgBinaries) {
        await fspromises.rm(path.join(containingDir, oldBfgBinary))
    }
}
