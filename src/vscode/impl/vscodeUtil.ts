/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the EPL v2.0 License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import {commands, Disposable, extensions, window, workspace} from 'vscode';
import { Level, UserChoice } from '../recommendationModel';
import path from 'path';
import { existsSync } from 'fs';
import { readFile } from './util/fsUtil';

export const promptUserUtil = async (message: string, level: Level, hideNever: boolean): Promise<UserChoice | undefined> => {
    const actions: Array<string> = Object.keys(UserChoice).filter((x) => x !== UserChoice.Never || !hideNever);
    let choice = undefined;
    if( level === Level.Info ) {
        choice = await window.showInformationMessage(message, ...actions);
    } else if( level === Level.Warn ) {
        choice = await window.showWarningMessage(message, ...actions);
    } else if( level === Level.Error ) {
        choice = await window.showErrorMessage(message, ...actions);
    }
    if (choice) {
        return choice as UserChoice;
    }
    return undefined;
}

export const isExtensionInstalled = (id: string): boolean => {
    return !!extensions.getExtension(id);
}

export const getInstalledExtensionName = (id: string): string | undefined => {
    if( isExtensionInstalled(id)) {
        const e = extensions.getExtension(id);
        if( e ) {
            return e.packageJSON.displayName || e.packageJSON.extensionDisplayName;
        }
    }
    return undefined;
}

/**
 * Install an extension
 *
 * @returns when the extension is installed
 * @throws if the user refuses to install the extension, or if the extension does not get installed within a timeout period
 */
 export const installExtensionUtil = async (id: string, extensionDisplayName: string, timeout: number): Promise<void> => {
    let installListenerDisposable: Disposable;
    return new Promise<void>((resolve, reject) => {
        installListenerDisposable = extensions.onDidChange(() => {
            if (isExtensionInstalled(id)) {
                resolve();
            }
        });
        commands.executeCommand("workbench.extensions.installExtension", id)
                .then((_unused: any) => { }, reject);
        setTimeout(reject, timeout, new Error(`'${extensionDisplayName}' installation is taking a while, Cancelling!`));
    }).finally(() => {  
        installListenerDisposable.dispose();
    });
 }

 export const getExtensionConfigurationFile = (): string | undefined => {
    if (workspace.workspaceFolders !== undefined) {
        if (workspace.workspaceFolders.length == 1) {
            const file = path.resolve(workspace.workspaceFolders[0].uri.path, '.vscode', 'extensions.json');
            if (existsSync(file)) {
                return file;
            }
        } else {
            const file = workspace.workspaceFile?.path;
            if (file !== undefined && existsSync(file)) {
                return file;
            }
        }
    }
    return undefined;
 }

export const readExtensionConfigurationFile = async (): Promise<string | undefined> => {
    const extensionConfigFile = getExtensionConfigurationFile();
    if (extensionConfigFile !== undefined) {
        try {
            const jsonData = await readFile(extensionConfigFile);
            return jsonData;
        } catch (err) {
            // continue
        }
    }
    return undefined;
}

export const isUnwantedRecommendation = async (toExtension: string, data?: string): Promise<boolean> => {
    let jsonData;
    if (data) {
        jsonData = data;
    } else {
        jsonData = await readExtensionConfigurationFile();
    }

    if (jsonData !== undefined) {
        let json = JSON.parse(jsonData);
        if (workspace.workspaceFile?.path !== undefined) {
            json = json['extensions'];
        }
        const unwantedRecommendations = json['unwantedRecommendations'];
        return !!unwantedRecommendations && unwantedRecommendations.length > 0 && unwantedRecommendations.includes(toExtension);
    }
    return false;
}
