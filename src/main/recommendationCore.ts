/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the EPL v2.0 License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import { TelemetryService } from "@redhat-developer/vscode-redhat-telemetry/lib";
import { ExtensionContext } from "vscode";
import { RecommendationServiceImpl } from "./impl/recommendationServiceImpl";
import { IRecommendationService } from "./recommendationService";
export class RecommendationCore {
    public static getService(context: ExtensionContext, telemetryService?: TelemetryService): IRecommendationService {
        return new RecommendationServiceImpl(context, telemetryService);
    }
}