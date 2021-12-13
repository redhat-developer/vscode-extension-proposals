import { Recommendation } from "./recommendation";

export interface IStorageService {
    get(key: string): Promise<Recommendation|undefined>;
    save(recommendation: Recommendation): Promise<void>;
}