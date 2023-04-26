[![npm](https://img.shields.io/npm/v/@redhat-developer/vscode-extension-proposals?color=brightgreen)](https://www.npmjs.com/package/@redhat-developer/vscode-extension-proposals)

# Extension Recommender

This library helps manage Visual Studio Code extension recommendations, and allows extensions to inform users of other extensions that they work well with.

# How to use this library

## Add the `@redhat-developer/vscode-extension-proposals` dependency

In order to install [`@redhat-developer/vscode-extension-proposals`](https://github.com/redhat-developer/vscode-extension-proposals/) in your VS Code extension, open a terminal and execute:

```
npm i @redhat-developer/vscode-extension-proposals
```

# API / Use Cases

## API Entry Points
The primary entry point is called the `IRecommendationService`, which can discovered by by calling `RecommendationCore.getService(etc)`. Once a client has a recommendation service, they can use this service to create individual recommendations via a convenience utility function, and then register these recommendations in the data store. Registered recommendations can be set to be displayed on startup, or not displayed on startup. 

A client can also request a given recommendation be displayed immediately, assuming the recommendation has already been registered in the model. This is useful if a user interacts with some context menu action and, as a result of this action, some type of interaction with another extension is expected to show up at that time. When the client discovers that the expected extension is not present, it is reasonable for a client to display the recommendation directly at that time. Because the nature of the recommendation may change from a general message (`We recommend you install xyz debugger`) to a specific message (`The xyz action you have clicked is expecting an abc debugger to be installed`), the API allows for the client to override the description for this display. 

The API contains optional integrations with the Red Hat Telemetry Service, though providing this parameter is not required for clients. 

### The API
#### RecommendationCore
The primary entrypoint for clients is `RecommendationCore`. This class has one static function. 
```
export class RecommendationCore {
    public static getService(context: ExtensionContext, telemetryService?: TelemetryService): IRecommendationService;
}
```

#### IRecommendationService

```
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
```



## Example extension using this library
Below is an example extension making use of this library and registering a recommendation 
on two different extensions. 

```
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    myContext = context;
    const recommendService: IRecommendationService = 
        RecommendationCore.getService(context);
    const r1 = recommendService.create("abcde", "Abcde Tools", "Installing Abcde is critical", true);
    const r2 = recommendService.create("redhat.java", "Language Support for Java by Red Hat", "This extension is recommended in order to perform the function in some cases.", true);
    recommendService.register([r1, r2]);
}
```
