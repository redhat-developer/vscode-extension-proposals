import { Recommendation, RecommendationModel } from "./recommendationModel";

export interface IStorageService {
    /**
     * Return the recommendation model from the backing store, 
     * or undefined if it does not exist
     */
    readRecommendationModel(): Promise<RecommendationModel|undefined>;

    /**
     * Run the given runnable while locking write access to the model.
     * Persist changes to the model in the backing store.
     * @param runnable - A runnable that may make changes and persist them to the recommendation model
     * @returns boolean - true if this is a new workspace session, false otherwise
     */
    runWithLock(runnable: (model: RecommendationModel) => Promise<RecommendationModel | undefined>): Promise<boolean>;


    /**
     * Write contents to an arbitrary key
     * @param key The key to write to
     * @param contents  The contents
     * @returns A file-system path to the output file in question. 
     */
    writeKey(key: string, contents: string): Promise<string|undefined>;

}