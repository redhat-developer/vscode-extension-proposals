/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the EPL v2.0 License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
export interface RecommendationModel {
    lastUpdated: number,
    sessionId: string,
    sessionTimestamp: number,
    recommendations: Recommendation[],
    timelocked: string[]
}

export interface Recommendation {
    sourceId: string,
    extensionId: string, 
    extensionDisplayName: string,
    description: string, 
    shouldShowOnStartup: boolean,
    timestamp: number,
    userIgnored: boolean,
}


export enum UserChoice {
	Install = "Install",
	Never = "Never",
	Later = "Later",
}