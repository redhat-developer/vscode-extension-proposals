import { TelemetryService } from "@redhat-developer/vscode-redhat-telemetry/lib";
import { ExtensionContext } from "vscode";
import { RecommendationServiceImpl } from "./impl/recommendationServiceImpl";
import { IRecommendationService } from "./recommendationService";
export class RecommendationCore {
    public static getService(context: ExtensionContext, telemetryService?: TelemetryService): IRecommendationService {
        return new RecommendationServiceImpl(context, telemetryService);
    }
}