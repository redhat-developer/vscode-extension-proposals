import * as fs from 'fs';
import path from "path";
import { Recommendation } from "./recommendation";
import { IStorageService } from "./storageService";

export class fsStorageService implements IStorageService {
    
    private storagePath: string;

    constructor(storagePath: string) {
        this.storagePath = storagePath;
        if (!fs.existsSync(storagePath)) {
            fs.mkdirSync(storagePath, { recursive: true });
        }
    }

    async get(key: string): Promise<Recommendation | undefined> {
        const json = await this.readFromFile(key);
        if (json) {
            return JSON.parse(json) as Recommendation;
        }
        return undefined;
    }

    async save(recommendation: Recommendation): Promise<void> {
        const json = JSON.stringify(recommendation);
        await this.writeToFile(recommendation.id, json);
    }

    private readFromFile(key: string): Promise<string | undefined> {
        const filePath = path.resolve(this.storagePath, `${key}.json`);
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(filePath)) {
                resolve(undefined);
                return;
            }
            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    resolve(undefined);
                    return;
                }
                resolve(data);
            });
        });
    }

    private writeToFile(key: string, value: string): Promise<boolean> {
        const filePath = path.resolve(this.storagePath, `${key}.json`);
        return new Promise((resolve, reject) => {
            fs.writeFile(filePath, value, (err) => {
                if (err) {
                    resolve(false);
                }
                resolve(true);
            });
        });
    }

}