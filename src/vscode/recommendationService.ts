/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the EPL v2.0 License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import { Level, Recommendation, UserChoice } from "./recommendationModel";

export interface IRecommendationService {
    /**
     * Register a recommendation in the model
     */
    register(recommendations: Recommendation[]): Promise<void>;

    /**
     * Show an already-registered recommendation immediately
     * @param toExtension the extension being recommended
     * @param force show this message even if the recommended extension 
     *                       is timelocked / not supposed to be shown. This should only
     *                       be shown in very important situatons, 
     *                       and is likely to annoy users if overused.
     * @param overrideDescription Customize the description / message and override the default for this recommendation
     * @param level a level for the message, one of info, warn, error
     * @param hideNever Hide the 'never' option
     * @returns What the user choice was.
     */
    show(toExtension: string, force?: boolean, overrideDescription?: string, level?: Level, hideNever?: boolean): Promise<UserChoice | undefined>;

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