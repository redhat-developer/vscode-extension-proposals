import path from "path";
import { TelemetryService } from "@redhat-developer/vscode-redhat-telemetry";
import { commands, Disposable, ExtensionContext, extensions, window } from "vscode";
import { fsStorageService } from './fsStorageService';
import { UserChoice } from './recommendation';

type Options = {
    timeout?: number,
    onlyFromSameSource: boolean,
    quietPeriod?: number,
}

const DEFAULT_TIMEOUT = 1000 * 60; // 1 minute
const DEFAULT_QUIET_PERIOD = 1000 * 60 * 60 * 24; // 24 hours

export class RecommendationService {
    
    private source: string;
    private storageService: fsStorageService;

    constructor(context: ExtensionContext, private telemetryService?: TelemetryService, private options?: Options) {
        this.source = context.extension.id;
        const storagePath = getRecommendationWorkingDir(context);
        this.storageService = new fsStorageService(storagePath);
    }

    public async recommend(id: string, label: string, message: string) {
        const canRecommend = await this.canRecommend(id);
        if (!canRecommend) {
            return;
        }
        const choice = await this.promptUser(message);

        if (choice) {
            this.telemetryService?.send({
                name: "recommendation",
                properties: {
                    recommendation: id,
                    choice: choice.toString()
                }
            });
            await this.saveRecommendation(id, label, message, this.source, choice);
            if (choice === UserChoice.Install) {
                await this.installExtension(id, label);
            }
        }
    }
    
    private saveRecommendation(id: string, label: string, message: string, source: string, choice: UserChoice) {
        const recommendation = {
            id: id,
            label: label,
            message: message,
            source: source,
            timestamp: Date.now(),
            choice: choice
        };
        return this.storageService.save(recommendation);
    }

    public async canRecommend(id: string): Promise<boolean> {
        if (this.isInstalled(id)) {
            return false;
        }
        const recommendation = await this.storageService.get(id);
        if (recommendation == null) {
            return true;
        }
        return (recommendation.choice != UserChoice.Never && !this.isQuietPeriod(recommendation.timestamp));
	}

    public isInstalled(id: string): boolean {
        return !!extensions.getExtension(id);
    }

    async promptUser(message: string): Promise<UserChoice | undefined> {
        const actions: Array<string> = Object.keys(UserChoice);
		const choice = await window.showInformationMessage(message, ...actions);
        if (choice) {
            return choice as UserChoice;
        }
        return undefined;
    }

    /**
     * Install an extension
     *
     * @returns when the extension is installed
     * @throws if the user refuses to install the extension, or if the extension does not get installed within a timeout period
     */
     public async installExtension(id: string, label: string): Promise<void> {
        let installListenerDisposable: Disposable;
        return new Promise<void>((resolve, reject) => {
            installListenerDisposable = extensions.onDidChange(() => {
                if (this.isInstalled(id)) {
                    resolve();
                }
            });
            commands.executeCommand("workbench.extensions.installExtension", id)
                    .then((_unused: any) => { }, reject);
            const timeout = (this.options ||{}).timeout || DEFAULT_TIMEOUT;
            setTimeout(reject, timeout, new Error(`'${label}' installation is taking a while, Cancelling!`));
        }).finally(() => {  
            installListenerDisposable.dispose();
        });
    }

    private isQuietPeriod(timestamp: number) : boolean {
        const quietPeriod = (this.options ||{}).quietPeriod || DEFAULT_QUIET_PERIOD;
        const now = Date.now();
        return Date.now() < (timestamp + quietPeriod);
    }

}

function getRecommendationWorkingDir(context: ExtensionContext): string {
    return path.resolve(context.globalStorageUri.fsPath, '..', 'vscode-extension-recommender');
}


