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

export enum Level {
    Info = "Info",
    Warn = "Warn",
    Error = "Error",
}

export enum UserChoice {
	Install = "Install",
	Never = "Never",
	Later = "Later",
}

/**
 * Telemetry Event
 */
export interface RecommendationTelemetryEvent {
    type?: string;
    name: string;
    properties?: any;
    measures?: any;
    traits?: any;
    context?: any;
}
/**
 * Service for sending Telemetry events
 */
export interface RecommendationsTelemetryService {
    /**
     * Sends the Telemetry event
     */
    send(event: RecommendationTelemetryEvent): Promise<void>;
}
