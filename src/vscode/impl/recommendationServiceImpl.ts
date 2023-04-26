import { TelemetryService } from "@redhat-developer/vscode-redhat-telemetry/lib";
import path from "path";
import { ExtensionContext, commands, window, Uri } from "vscode";
import { Recommendation, RecommendationModel, UserChoice } from "../recommendationModel";
import { IRecommendationService } from "../recommendationService";
import { IStorageService } from "../storageService";
import { StorageServiceImpl } from "./storageServiceImpl";
import { getInstalledExtensionName, isExtensionInstalled, promptUserUtil, installExtensionUtil } from "./vscodeUtil";

export const filterUnique = (value: any, index: number, self: any[]): boolean => self.indexOf(value) === index;

/**
* Command string to render markdown string to html string
*/
export const COMMAND_MARKDOWN_API_RENDER = 'markdown.api.render';

export class RecommendationServiceImpl implements IRecommendationService {
    private storageService: IStorageService;
    private extensionContext: ExtensionContext;
    private telemetryService: TelemetryService | undefined;
    constructor(context: ExtensionContext, telemetryService?: TelemetryService) {
        this.extensionContext = context;
        this.telemetryService = telemetryService;
        this.storageService = this.createStorageService(context);
    }

    protected createStorageService(context: ExtensionContext): IStorageService {
        const storagePath = this.getRecommendationWorkingDir(context);
        return new StorageServiceImpl(storagePath);
    }
    protected getRecommendationWorkingDir(context: ExtensionContext): string {
        return path.resolve(context.globalStorageUri.fsPath, '..', 'vscode-extension-recommender');
    }

    public async register(toAdd: Recommendation[]): Promise<void> {
        const newSession: boolean = await this.addRecommendationsToModel(toAdd);
        if( newSession ) {
            // Return fast (ie, don't await) so as not to slow down caller
            this.showStartupRecommendations();
        }
    }

    public create(extensionId: string, 
        extensionDisplayName: string,
        description: string, 
        shouldShowOnStartup: boolean): Recommendation {
            return {
                sourceId: this.extensionContext.extension.id,
                extensionId: extensionId, 
                extensionDisplayName: extensionDisplayName,
                description: description, 
                shouldShowOnStartup: shouldShowOnStartup,
                timestamp: Date.now(),
                userIgnored: false
            };
        }


    public async addRecommendationsToModel(toAdd: Recommendation[]): Promise<boolean> {
        const newSession = await this.storageService.runWithLock(async (model: RecommendationModel): Promise<RecommendationModel> => {
            const current: Recommendation[] = model.recommendations;
            const newRecs: Recommendation[] = [];
            const toAddAlreadyAdded: Recommendation[] = [];
            for( let i = 0; i < current.length; i++ ) {
                const beingAdded = this.findRecommendation(current[i].sourceId, current[i].extensionId, toAdd);
                if( beingAdded ) {
                    beingAdded.userIgnored = current[i].userIgnored;
                    newRecs.push(beingAdded);
                    toAddAlreadyAdded.push(beingAdded);
                } else {
                    newRecs.push(current[i]);
                }
            }

            for( let i = 0; i < toAdd.length; i++ ) {
                if( !toAddAlreadyAdded.includes(toAdd[i])) {
                    newRecs.push(toAdd[i]);
                }
            }
            
            model.recommendations = newRecs;
            return model;
        });
        return newSession;
    }

    protected findRecommendation(needleFrom: string, needleTo: string, haystack: Recommendation[]): Recommendation | undefined {
        for( let i = 0; i < haystack.length; i++ ) {
            if( haystack[i].sourceId === needleFrom && 
                haystack[i].extensionId === needleTo ) {
                return haystack[i];
            }
        }
        return undefined;
    }
    
    public async show(fromExtension: string, toExtension: string, overrideDescription?: string): Promise<void> {
        // Show a single recommendation immediately, if certain conditions are met
        // Specifically, if the recommender is installed, and the recommended is not installed, 
        // and the recommended has not been timelocked in this session
        if(isExtensionInstalled(fromExtension) && !isExtensionInstalled(toExtension)) {
            const model: RecommendationModel|undefined = await this.storageService.readRecommendationModel();
            if( model && !model.timelocked.includes(toExtension) ) {
                const rec: Recommendation | undefined = model.recommendations.find((x) => x.extensionId === toExtension && x.sourceId === fromExtension);
                if( rec ) {
                    const displayName = rec.extensionDisplayName || rec.extensionId;
                    const recToUse: Recommendation = {...rec};
                    if( overrideDescription ) {
                        recToUse.description = overrideDescription;
                    }
                    const recommendationsForId: Recommendation[] = 
                        model.recommendations.filter((x: Recommendation) => x.extensionId === toExtension)
                        .filter((x: Recommendation) => isExtensionInstalled(x.sourceId));
        
                    const msg = this.collectShowNowMessage(toExtension, displayName, recToUse, recommendationsForId);
                    this.displaySingleRecommendation(toExtension, displayName, [recToUse.sourceId], msg);
                }
            }
        }
    }

    public async showStartupRecommendations(): Promise<void> {
        // wait 6 seconds for other tools to start up
        await new Promise(resolve => setTimeout(resolve, 6000));
        // Then show the dialogs
        const model: RecommendationModel|undefined = await this.storageService.readRecommendationModel();        
        if( model ) {
            const recommendedExtension: string[] = model.recommendations
                .map((x) => x.extensionId)
                .filter(filterUnique)
                .filter((x) => !isExtensionInstalled(x));
            for( let i = 0; i < recommendedExtension.length; i++ ) {
                this.showStartupRecommendationsForSingleExtension(model, recommendedExtension[i]);
            }
        }
    }

    protected async showStartupRecommendationsForSingleExtension( model: RecommendationModel, id: string): Promise<void> {
        const recommendationsForId: Recommendation[] = 
            model.recommendations.filter((x: Recommendation) => x.extensionId === id)
            .filter((x: Recommendation) => isExtensionInstalled(x.sourceId));
        const ignoredCount = recommendationsForId.filter((x) => x.userIgnored === true).length;
        const allIgnored: boolean = recommendationsForId.length === ignoredCount;
        const count = recommendationsForId.length;
        if( count === 0 || allIgnored) 
            return;
        const displayName = this.findMode(recommendationsForId.map((x) => x.extensionDisplayName)) || id;
        const msg = this.collectMessage(id, displayName, recommendationsForId);
        this.displaySingleRecommendation(id, displayName, recommendationsForId.map((x) => x.sourceId), msg);
    }

    protected safeDescriptionWithPeriod(description: string): string {
        const trimmed = description.trim();
        const lastChar = trimmed.charAt(trimmed.length - 1);
        if( ![".","!","?"].includes(lastChar)) {
            return trimmed + ".";
        }
        return description;
    }

    protected linkToMore(id: string): string {
        const obj = {
            id: id
        };
        const encoded = encodeURIComponent(JSON.stringify(obj));
        const tellMeMore1 = `[Learn More...](command:${this.getSingleMarkdownCommandId()}?${encoded})`;
        return tellMeMore1;
    }
    protected collectMessage(id: string, displayName: string, recommendationsForId: Recommendation[]): string {
        const count = recommendationsForId.length;
        if( count === 1 ) {
            const fromExtensionId = recommendationsForId[0].sourceId;
            const fromExtensionName = getInstalledExtensionName(fromExtensionId) || fromExtensionId;
            const safeDesc = this.safeDescriptionWithPeriod(recommendationsForId[0].description);
            const msg: string = `${fromExtensionName} recommends you install "${displayName}":\n${safeDesc} `
            return msg;
        } else if( count > 1 ) {
            return this.collectMultiCountMessage(id, displayName, recommendationsForId);
        } else {
            return "An unknown extension recommends that you also install \"" + displayName + "\".";
        }
    }

    protected collectShowNowMessage(id: string, displayName: string, primary: Recommendation, recommendationsForId: Recommendation[]): string {
        const fromExtensionId = primary.sourceId;
        const fromExtensionName = getInstalledExtensionName(fromExtensionId) || fromExtensionId;
        const msg: string = `"${fromExtensionName}" recommends you install "${displayName}":\n${recommendationsForId[0].description}`

        const count = recommendationsForId.length;
        if( count === 1 ) {
            return msg;
        } else if( count > 1 ) {
            const clone = [...recommendationsForId].filter((x) => x.sourceId !== primary.sourceId || x.extensionId !== primary.extensionId);
            return this.collectMultiCountMessage(id, displayName, clone);
        } else {
            return "An unknown extension recommends that you also install \"" + displayName + "\".";
        }
    }

    protected collectMultiCountMessage(id: string, displayName: string, recommendationsForId: Recommendation[]) : string {
        const ignoredList = recommendationsForId.filter((x)=>x.userIgnored);
        const notIgnoredList = recommendationsForId.filter((x) => x.userIgnored === false);
        const ignoredCount = ignoredList.length;
        const notIgnoredCount = notIgnoredList.length;

        let countMessage = "";
        if( ignoredCount === 0 && notIgnoredCount > 0 ) {
            const singlePlural = notIgnoredCount > 1 ? "extensions recommend" : "extension recommends";
            countMessage = `${notIgnoredCount} ${singlePlural} you install "${displayName}". `;
        } else if( notIgnoredCount === 0 && ignoredCount > 0 ) {
            // TODO this really should never happen. If they're all ignored it shouldn't show. 
            const singlePlural = ignoredCount > 1 ? "extensions recommend" : "extension recommends";
            countMessage = `${ignoredCount} previously ignored ${singlePlural} you install "${displayName}". `;
        } else {
            // one or more of ignored and not-ignored / new recommendations
            const rec = recommendationsForId.length > 1 ? "recommend" : "recommends";
            const spNotIgnored = notIgnoredCount > 1 ? "extensions" : "extension";
            const spIgnored = ignoredCount > 1 ? "extensions" : "extension";
            countMessage = `${notIgnoredCount} new ${spNotIgnored} and ${ignoredCount} previously ignored ${spIgnored} ${rec} you install "${displayName}". `;
        }

        const recommenderNames: string[] = recommendationsForId.map((x) => {
            const fromExtensionId = x.sourceId;
            const fromExtensionName = getInstalledExtensionName(fromExtensionId) || fromExtensionId;
            return fromExtensionName;

        });
        const lastName: string = "\"" + recommenderNames[recommenderNames.length-1] + "\"";
        const withoutLast: string[] = recommenderNames.slice(0, -1).map((x) => "\"" + x + "\"");
        const withoutLastAddCommas: string = withoutLast.join(", ");
        const finalMsg = countMessage + "The recommending extensions are " + withoutLastAddCommas + " and " + lastName + ". ";
        return finalMsg + this.linkToMore(id);;
    }

    protected findMode(arr: string[]) {
        return arr.sort((a,b) =>
            arr.filter(v => v===a).length - arr.filter(v => v===b).length
        ).pop();
    }

    protected async displaySingleRecommendation(id: string, extensionDisplayName: string, 
        recommenderList: string[], msg: string) {
        // Ensure command is registered before prompting the user
        this.registerSingleMarkdownCommand();
        const choice = await promptUserUtil(msg);

        // Timelock this regardless of what the user selects.
        await this.timelockRecommendationFor(id);
        if (choice) {
            this.fireTelemetrySuccess(id, recommenderList, choice);
    
            if( choice === UserChoice.Never) {
                await this.markIgnored(id);
            } else {
                if (choice === UserChoice.Install) {
                    await installExtensionUtil(id, extensionDisplayName, 30000);
                }
            }
        }
    }

    protected async timelockRecommendationFor(id: string): Promise<void> {
        await this.storageService.runWithLock(async (model: RecommendationModel): Promise<RecommendationModel | undefined> => {
            if( !model.timelocked.includes(id)) {
                model.timelocked.push(id);
                return model;
            }
            return undefined;
        });
    }


    protected async registerSingleMarkdownCommand() {
        const commandId = this.getSingleMarkdownCommandId();
        const ret: string[] = await commands.getCommands();
        if( !ret.includes(commandId)) {
            try {
                const cmdResult = commands.registerCommand(commandId, async (param: any) => {
                    if( param && param.id) {
                        this.runShowMarkdownCommand(param.id);
                    } else {
                        window.showInformationMessage("Unable to show recommendation report for extension 'undefined'.");
                    }
                });
                this.extensionContext.subscriptions.push(cmdResult);
            } catch( err ) {
                // Do nothing, might be a race condition / duplicate
            }
        }
    }
    
    protected getSingleMarkdownCommandId() {
        return "_vscode-extension-recommender.showMarkdown";
    }


    protected async runShowMarkdownCommand(id: string) {
        const model: RecommendationModel|undefined = await this.storageService.readRecommendationModel();        
        if( model ) {
            const recommendedExtension: Recommendation[] = model.recommendations
                .filter((x) => x.extensionId === id)
                .filter(filterUnique)
                .filter((x) => !isExtensionInstalled(x.extensionId));
            const displayName = this.findMode(recommendedExtension.map((x) => x.extensionDisplayName)) || id;
            const sorted: Recommendation[] = recommendedExtension.sort((x, y) => x.userIgnored === y.userIgnored ? 0 : x.userIgnored ? 1 : -1)
            const header = `# Extensions recommending "${displayName}"\n`;
            const lines: string[] = [];
            for( let i = 0; i < sorted.length; i++ ) {
                const r = sorted[i];
                lines.push("## " + getInstalledExtensionName(r.sourceId));
                lines.push(r.description);
                if( r.userIgnored ) {
                    lines.push("This recommendation was previously ignored by user.");
                }
            }
            const mdString = header + lines.join("\n");
            // TODO
            // Could persist this mdString into a special file and just open it 
            // via the following:
            const path = await this.storageService.writeKey(id, mdString);
            if(path)
                commands.executeCommand("markdown.showPreview", Uri.parse(path));
            else {
                // idk, show warning?
            }
            //new MarkdownWebviewUtility().show(mdString, "Recommendations: " + displayName);
        }

    }

    protected async markIgnored(id: string) {
        // Mark all CURRENT (not future, from a new unknown extension) 
        // recommendations to the given id. 
        const newSession = await this.storageService.runWithLock(async (model: RecommendationModel): Promise<RecommendationModel> => {
            const current: Recommendation[] = model.recommendations;
            for( let i = 0; i < current.length; i++ ) {
                if( current[i].extensionId === id ) {
                    current[i].userIgnored = true;
                }
            }
            return model;
        });
    }

    protected async fireTelemetrySuccess(target: string, recommenderList: string[], choice: string) {
        if( this.telemetryService ) {
            this.telemetryService.send({
                name: "recommendation",
                properties: {
                    recommendation: target,
                    recommenders: recommenderList,
                    choice: choice.toString()
                }
            });
        }
    }

    // private async fireTelemetryFail(target: string, recommenderCount: number, errorCode: number) {
    //     if( this.telemetryService ) {
    //         this.telemetryService.send({
    //             name: "recommendation",
    //             properties: {
    //                 recommendation: target,
    //                 recommenderCount: recommenderCount,
    //                 fail: true,
    //                 code: errorCode
    //             }
    //         });
    //     }
    // }
}
