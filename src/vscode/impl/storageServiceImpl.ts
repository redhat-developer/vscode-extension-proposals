/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the EPL v2.0 License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import path from "path";
import { env } from "vscode";
import { RecommendationModel } from '../recommendationModel';
import { IStorageService } from '../storageService';
import { deleteFile, exists, mkdir, readFile, writeFile } from './util/fsUtil';

export class StorageServiceImpl implements IStorageService {
    private static PERSISTENCE_FILENAME: string = 'extension-recommender.model.json';
    private static LOCK_FILENAME: string = 'extension-recommender.lock';
    
    private storagePath: string;

    constructor(storagePath: string) {
        this.storagePath = storagePath;
    }

    private async delay(ms: number): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Run a given runnable while ensuring only 1 client can write to the data store at a time.
     * I am not convinced the lock mechanism is perfect.
     * @returns boolean - whether vscode is in a new session vs what the data store thought but only when a change to the model occurs. False otherwise
     */
    public async runWithLock(runnable: (model: RecommendationModel) => Promise<RecommendationModel | undefined>): Promise<boolean> {
        await this.ensureStorageFolderExists();
        const acquired = await this.acquireLock(15);
        if( !acquired ) {
            return Promise.reject("Unable to acquire a lock to modify the recommendation model.");
        }
        try {
            const model: RecommendationModel = await this.loadOrDefaultRecommendationModel();
            const now = Date.now();
            let newSession = false;
            if( env.sessionId !== model.sessionId) {
                model.sessionId = env.sessionId;
                model.sessionTimestamp = now;
                model.timelocked = [];
                newSession = true;
            }
            model.lastUpdated = now;    
            const model2 = await runnable(model);
            if( model2 ) {
                model.lastUpdated = Date.now();
                await this.save(model2);
            }
            return newSession;
        } finally {
            this.unlock();
        }
    }

    private async acquireLock(seconds: number): Promise<boolean> {
        const endTime = Date.now() + (1000*seconds);
        while(Date.now() <= endTime) {
            const ret: boolean = await this.acquireLockOneTry(endTime);
            if( ret ) {
                return true;
            }
        }
        return false;
    }
        
    private async acquireLockOneTry(endTime: number): Promise<boolean> {
        await this.deleteOldLockFile();
        const file = this.resolvePath(StorageServiceImpl.LOCK_FILENAME);
        while( (await exists(file)) && Date.now() < endTime) {
            await this.delay(25);
        }
        if( Date.now() >= endTime) {
            // Took too long
            return false;
        }
        // We have a chance to write a lock. Let's try it. 
        const nonce = generateNonce();
        const contents = Date.now() + "\n" + nonce;
        await this.writeToFile(file, contents);
        // Give some time for someone else to try to write to the file / race condition
        await this.delay(100);
        // verify we are still the nonce in the file
        const nonce2 = await this.getNonceFromLockFile();
        if( nonce2 && nonce2 === nonce) {
            return true;
        }
        return false;
    }

    private async getTimeFromLockFile(): Promise<number | undefined> {
        const existsVar: boolean = await exists(this.resolvePath(StorageServiceImpl.LOCK_FILENAME));
        if( existsVar ) {
            const s: string | undefined = await this.readFromFileOrUndefined(StorageServiceImpl.LOCK_FILENAME);
            if( s ) {
                const lines: string[] = s.split("\n");
                if( lines && lines.length === 2 && lines[0]) {
                    return parseInt(lines[0]);
                }
            }
        }
        return undefined;
    }

    private async getNonceFromLockFile(): Promise<string | undefined> {
        const existsVar: boolean = await exists(this.resolvePath(StorageServiceImpl.LOCK_FILENAME));
        if( existsVar ) {
            const s: string | undefined = await this.readFromFileOrUndefined(StorageServiceImpl.LOCK_FILENAME);
            if( s ) {
                const lines: string[] = s.split("\n");
                if( lines && lines.length === 2 && lines[0]) {
                    return lines[1];
                }
            }
        }
        return undefined;
    }

    private async deleteOldLockFile() {
        const tooOld = Date.now() - (1000 * 30); // 30 seconds lock is too long, man
        const ts = await this.getTimeFromLockFile();
        if( ts ) {
            if( ts < tooOld ) {
                this.unlock();
            }
        }
    }

    private async unlock(): Promise<void> {
        try {
            const file = this.resolvePath(StorageServiceImpl.LOCK_FILENAME);
            await deleteFile(file);
        } catch( err ) {
            // File did not exist probably, ignore
        }
    }

    public async readRecommendationModel(): Promise<RecommendationModel | undefined> {
        await this.ensureStorageFolderExists();
        return this.loadRecommendationModel();
    }

    private async loadRecommendationModel(): Promise<RecommendationModel | undefined> {
        const json = await this.readFromFileOrUndefined(StorageServiceImpl.PERSISTENCE_FILENAME);
        if (json) {
            return JSON.parse(json) as RecommendationModel;
        }
        return undefined;
    }
    private async loadOrDefaultRecommendationModel(): Promise<RecommendationModel> {
        const def: RecommendationModel = {
            lastUpdated: Date.now(),
            sessionId: "",
            sessionTimestamp: Date.now(),
            recommendations: [],
            timelocked: []
        }
        let ret = await this.loadRecommendationModel();
        if( !ret ) {
            return def;
        }
        return ret;
    }

    public async writeKey(key: string, contents: string): Promise<string|undefined> {
        // Add a prefix so no one can overwrite the core model or lock file
        const resolved = this.resolvePath("rec_" + key);
        await writeFile(resolved, contents);
        return resolved;
    }

    private resolvePath(filename: string): string {
        return path.resolve(this.storagePath, filename);
    }

    private async save(model: RecommendationModel): Promise<void> {
        const json = JSON.stringify(model);
        await this.writeToFile(StorageServiceImpl.PERSISTENCE_FILENAME, json);
    }

    private async readFromFile(filename: string): Promise<string | undefined> {
        const filePath = this.resolvePath(filename);
        return await readFile(filePath);
    }
    private async readFromFileOrUndefined(filename: string): Promise<string | undefined> {
        try {
            return await this.readFromFile(filename);
        } catch( err ) {
            return undefined;
        }
    }

    private async writeToFile(filename: string, value: string): Promise<void> {
        await writeFile(this.resolvePath(filename), value);
    }

    private async ensureStorageFolderExists(): Promise<void> {
        await mkdir(this.storagePath);
    }
}
export const generateNonce = () => {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
