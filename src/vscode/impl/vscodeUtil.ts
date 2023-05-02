/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the EPL v2.0 License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import {commands, Disposable, extensions, window} from 'vscode';
import { Level, UserChoice } from '../recommendationModel';

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
