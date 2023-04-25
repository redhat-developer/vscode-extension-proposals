import { Recommendation } from "./recommendationModel";

export interface IRecommendationService {
    /**
     * Register a recommendation in the model
     */
    register(recommendations: Recommendation[]): Promise<void>;

    /**
     * Show an already-registered recommendation immediately
     */
    show(fromExtension: string, toExtension: string, overrideDescription?: string): Promise<void>;

    /**
     * Convenience function to help create a recommendation
     * @param extensionId 
     * @param extensionDisplayName 
     * @param description 
     * @param shouldShowOnStartup 
     */
    create( extensionId: string, 
        extensionDisplayName: string,
        description: string, 
        shouldShowOnStartup: boolean): Recommendation; 
}