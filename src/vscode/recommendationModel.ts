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