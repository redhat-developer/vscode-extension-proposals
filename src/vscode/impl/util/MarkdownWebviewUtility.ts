import { commands, Disposable, ViewColumn, Webview, WebviewPanel, window } from "vscode";
import { COMMAND_MARKDOWN_API_RENDER } from "../recommendationServiceImpl";

const MARKDOWN_WEBVIEW_UTIL_BODY = "MARKDOWN_WEBVIEW_UTIL_BODY";
const MARKDOWN_WEBVIEW_UTIL_NONCE = "MARKDOWN_WEBVIEW_UTIL_NONCE";
const MARKDOWN_WEBVIEW_UTIL_SECTION = "MARKDOWN_WEBVIEW_UTIL_SECTION";
export class MarkdownWebviewUtility implements Disposable {
    private panel: WebviewPanel | undefined;
    private disposables: Disposable[] = [];

    public async show(markdownString: string, title: string, section?: string): Promise<void> {
        if (!this.panel) {
            this.panel = window.createWebviewPanel('vscode-extension-recommenders.markdownPreview', title, ViewColumn.Active, {
                retainContextWhenHidden: true,
                enableFindWidget: true,
                enableScripts: true,
            });
        }

        this.disposables.push(this.panel.onDidDispose(() => {
            this.panel = undefined;
        }));

        //this.panel.iconPath = Uri.file(path.join(context.extensionPath, 'icons', 'icon128.png'));
        this.panel.webview.html = await this.getHtmlContent(this.panel.webview, markdownString, section || undefined);
        this.panel.title = title;
        this.panel.reveal(this.panel.viewColumn);
    }

    protected async getHtmlContent(webview: Webview, markdownString: string, section?: string): Promise<string> {
        const nonce: string = generateNonce();
        const body: string | undefined = await commands.executeCommand(COMMAND_MARKDOWN_API_RENDER, markdownString);
        const template = this.getFilledTemplate(webview, body || "", nonce, section);
        return template;
    }

    private getFilledTemplate(webview: Webview, body: string, nonce: string, section?: string) {
        const raw = this.getRawTemplate(webview);
        const withBody = raw.replace(MARKDOWN_WEBVIEW_UTIL_BODY, body);
        const withNonce = withBody.replace(MARKDOWN_WEBVIEW_UTIL_NONCE, nonce);
        const withSection = section ? withBody.replace(MARKDOWN_WEBVIEW_UTIL_SECTION, section) : withNonce;
        return withSection;        
    }

    dispose() {
    }

    private getRawTemplate(webview: Webview): string {
        // ${styles}
        // <base href="${webview.asWebviewUri(Uri.file(markdownFilePath))}">

        
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src 'self' ${webview.cspSource} https: data:; script-src 'nonce-${MARKDOWN_WEBVIEW_UTIL_NONCE}';"/>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
            html, body {
                font-family: var(--vscode-markdown-font-family, -apple-system, BlinkMacSystemFont, "Segoe WPC", "Segoe UI", "Ubuntu", "Droid Sans", sans-serif);
                font-size: var(--vscode-markdown-font-size, 14px);
                padding: 0 26px;
                line-height: var(--vscode-markdown-line-height, 22px);
                word-wrap: break-word;
            }
            
            #code-csp-warning {
                position: fixed;
                top: 0;
                right: 0;
                color: white;
                margin: 16px;
                text-align: center;
                font-size: 12px;
                font-family: sans-serif;
                background-color:#444444;
                cursor: pointer;
                padding: 6px;
                box-shadow: 1px 1px 1px rgba(0,0,0,.25);
            }
            
            #code-csp-warning:hover {
                text-decoration: none;
                background-color:#007acc;
                box-shadow: 2px 2px 2px rgba(0,0,0,.25);
            }
            
            body.scrollBeyondLastLine {
                margin-bottom: calc(100vh - 22px);
            }
            
            body.showEditorSelection .code-line {
                position: relative;
            }
            
            body.showEditorSelection .code-active-line:before,
            body.showEditorSelection .code-line:hover:before {
                content: "";
                display: block;
                position: absolute;
                top: 0;
                left: -12px;
                height: 100%;
            }
            
            body.showEditorSelection li.code-active-line:before,
            body.showEditorSelection li.code-line:hover:before {
                left: -30px;
            }
            
            .vscode-light.showEditorSelection .code-active-line:before {
                border-left: 3px solid rgba(0, 0, 0, 0.15);
            }
            
            .vscode-light.showEditorSelection .code-line:hover:before {
                border-left: 3px solid rgba(0, 0, 0, 0.40);
            }
            
            .vscode-light.showEditorSelection .code-line .code-line:hover:before {
                border-left: none;
            }
            
            .vscode-dark.showEditorSelection .code-active-line:before {
                border-left: 3px solid rgba(255, 255, 255, 0.4);
            }
            
            .vscode-dark.showEditorSelection .code-line:hover:before {
                border-left: 3px solid rgba(255, 255, 255, 0.60);
            }
            
            .vscode-dark.showEditorSelection .code-line .code-line:hover:before {
                border-left: none;
            }
            
            .vscode-high-contrast.showEditorSelection .code-active-line:before {
                border-left: 3px solid rgba(255, 160, 0, 0.7);
            }
            
            .vscode-high-contrast.showEditorSelection .code-line:hover:before {
                border-left: 3px solid rgba(255, 160, 0, 1);
            }
            
            .vscode-high-contrast.showEditorSelection .code-line .code-line:hover:before {
                border-left: none;
            }
            
            img {
                max-width: 100%;
                max-height: 100%;
            }
            
            a {
                text-decoration: none;
            }
            
            a:hover {
                text-decoration: underline;
            }
            
            a:focus,
            input:focus,
            select:focus,
            textarea:focus {
                outline: 1px solid -webkit-focus-ring-color;
                outline-offset: -1px;
            }
            
            hr {
                border: 0;
                height: 2px;
                border-bottom: 2px solid;
            }
            
            h1 {
                padding-bottom: 0.3em;
                line-height: 1.2;
                border-bottom-width: 1px;
                border-bottom-style: solid;
            }
            
            h1, h2, h3 {
                font-weight: normal;
            }
            
            table {
                border-collapse: collapse;
            }
            
            table > thead > tr > th {
                text-align: left;
                border-bottom: 1px solid;
            }
            
            table > thead > tr > th,
            table > thead > tr > td,
            table > tbody > tr > th,
            table > tbody > tr > td {
                padding: 5px 10px;
            }
            
            table > tbody > tr + tr > td {
                border-top: 1px solid;
            }
            
            blockquote {
                margin: 0 7px 0 5px;
                padding: 0 16px 0 10px;
                border-left-width: 5px;
                border-left-style: solid;
            }
            
            code {
                font-family: Menlo, Monaco, Consolas, "Droid Sans Mono", "Courier New", monospace, "Droid Sans Fallback";
                font-size: 1em;
                line-height: 1.357em;
            }
            
            body.wordWrap pre {
                white-space: pre-wrap;
            }
            
            pre:not(.hljs),
            pre.hljs code > div {
                padding: 16px;
                border-radius: 3px;
                overflow: auto;
            }
            
            pre code {
                color: var(--vscode-editor-foreground);
                tab-size: 4;
            }
            
            /** Theming */
            
            .vscode-light pre {
                background-color: rgba(220, 220, 220, 0.4);
            }
            
            .vscode-dark pre {
                background-color: rgba(10, 10, 10, 0.4);
            }
            
            .vscode-high-contrast pre {
                background-color: rgb(0, 0, 0);
            }
            
            .vscode-high-contrast h1 {
                border-color: rgb(0, 0, 0);
            }
            
            .vscode-light table > thead > tr > th {
                border-color: rgba(0, 0, 0, 0.69);
            }
            
            .vscode-dark table > thead > tr > th {
                border-color: rgba(255, 255, 255, 0.69);
            }
            
            .vscode-light h1,
            .vscode-light hr,
            .vscode-light table > tbody > tr + tr > td {
                border-color: rgba(0, 0, 0, 0.18);
            }
            
            .vscode-dark h1,
            .vscode-dark hr,
            .vscode-dark table > tbody > tr + tr > td {
                border-color: rgba(255, 255, 255, 0.18);
            }
            .btn {
                border: 0;
                color: var(--vscode-button-foreground);
                background-color: var(--vscode-button-background);
            }
            
            .btn svg {
                fill: var(--vscode-button-foreground);
            }
            
            .btn:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
            
            .floating-bottom-right {
                position: fixed;
                bottom: 1rem;
                right: 1rem;
            }
            button {
                display: inline-block;
                border: none;
                padding: 12px 16px;
                margin: 0;
                text-decoration: none;
                background: var(--vscode-button-background);
                color: #ffffff;
                font-family: sans-serif;
                font-size: 14px;
                cursor: pointer;
                text-align: center;
            }
            
            button:hover,
            button:focus {
                background: var(--vscode-button-hoverBackground);
            }
            button:focus {
                outline: 1px solid var(--vscode-button-hoverBackground);
                /* outline-offset: -4px; */
            }
            
            .center {
                text-align: center;
                margin: 0;
                position: absolute;
                top: 50%;
                left: 50%;
                -ms-transform: translate(-50%, -50%);
                transform: translate(-50%, -50%);
            }
            .hljs-keyword,
            .hljs-literal,
            .hljs-symbol,
            .hljs-name {
                color: #569CD6;
            }
            .hljs-link {
                color: #569CD6;
                text-decoration: underline;
            }
            
            .hljs-built_in,
            .hljs-type {
                color: #4EC9B0;
            }
            
            .hljs-number,
            .hljs-class {
                color: #B8D7A3;
            }
            
            .hljs-string,
            .hljs-meta-string {
                color: #D69D85;
            }
            
            .hljs-regexp,
            .hljs-template-tag {
                color: #9A5334;
            }
            
            .hljs-subst,
            .hljs-function,
            .hljs-title,
            .hljs-params,
            .hljs-formula {
                color: #DCDCDC;
            }
            
            .hljs-comment,
            .hljs-quote {
                color: #57A64A;
                font-style: italic;
            }
            
            .hljs-doctag {
                color: #608B4E;
            }
            
            .hljs-meta,
            .hljs-meta-keyword,
            .hljs-tag {
                color: #9B9B9B;
            }
            
            .hljs-variable,
            .hljs-template-variable {
                color: #BD63C5;
            }
            
            .hljs-attr,
            .hljs-attribute,
            .hljs-builtin-name {
                color: #9CDCFE;
            }
            
            .hljs-section {
                color: gold;
            }
            
            .hljs-emphasis {
                font-style: italic;
            }
            
            .hljs-strong {
                font-weight: bold;
            }
            
            /*.hljs-code {
                font-family:'Monospace';
            }*/
            
            .hljs-bullet,
            .hljs-selector-tag,
            .hljs-selector-id,
            .hljs-selector-class,
            .hljs-selector-attr,
            .hljs-selector-pseudo {
                color: #D7BA7D;
            }
            
            .hljs-addition {
                background-color: var(--vscode-diffEditor-insertedTextBackground, rgba(155, 185, 85, 0.2));
                color: rgb(155, 185, 85);
                display: inline-block;
                width: 100%;
            }
            
            .hljs-deletion {
                background: var(--vscode-diffEditor-removedTextBackground, rgba(255, 0, 0, 0.2));
                color: rgb(255, 0, 0);
                display: inline-block;
                width: 100%;
            }
            
            
            /*
            From https://raw.githubusercontent.com/isagalaev/highlight.js/master/src/styles/vs.css
            */
            /*
            
            Visual Studio-like style based on original C# coloring by Jason Diamond <jason@diamond.name>
            
            */
            
            .vscode-light .hljs-function,
            .vscode-light .hljs-params,
            .vscode-light .hljs-number,
            .vscode-light .hljs-class  {
                color: inherit;
            }
            
            .vscode-light .hljs-comment,
            .vscode-light .hljs-quote,
            .vscode-light .hljs-number,
            .vscode-light .hljs-class,
            .vscode-light .hljs-variable {
                color: #008000;
            }
            
            .vscode-light .hljs-keyword,
            .vscode-light .hljs-selector-tag,
            .vscode-light .hljs-name,
            .vscode-light .hljs-tag {
                color: #00f;
            }
            
            .vscode-light .hljs-built_in,
            .vscode-light .hljs-builtin-name {
                color: #007acc;
            }
            
            .vscode-light .hljs-string,
            .vscode-light .hljs-section,
            .vscode-light .hljs-attribute,
            .vscode-light .hljs-literal,
            .vscode-light .hljs-template-tag,
            .vscode-light .hljs-template-variable,
            .vscode-light .hljs-type {
                color: #a31515;
            }
            
            .vscode-light .hljs-selector-attr,
            .vscode-light .hljs-selector-pseudo,
            .vscode-light .hljs-meta,
            .vscode-light .hljs-meta-keyword {
                color: #2b91af;
            }
            
            .vscode-light .hljs-title,
            .vscode-light .hljs-doctag {
                color: #808080;
            }
            
            .vscode-light .hljs-attr {
                color: #f00;
            }
            
            .vscode-light .hljs-symbol,
            .vscode-light .hljs-bullet,
            .vscode-light .hljs-link {
                color: #00b0e8;
            }
            
            
            .vscode-light .hljs-emphasis {
                font-style: italic;
            }
            
            .vscode-light .hljs-strong {
                font-weight: bold;
            }
            </style>
        </head>
        <body class="vscode-body scrollBeyondLastLine wordWrap showEditorSelection">
            ${MARKDOWN_WEBVIEW_UTIL_BODY}
            <!--
            <button class="btn floating-bottom-right" id="back-to-top-btn">
                <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M8 6.04042L3.02022 11.0202L2.31311 10.3131L7.64644 4.97976L8.35355 4.97976L13.6869 10.3131L12.9798 11.0202L8 6.04042Z"/>
                </svg>
            </button>
            -->
            <script nonce="${MARKDOWN_WEBVIEW_UTIL_NONCE}">
                (function() {
                    if( "${MARKDOWN_WEBVIEW_UTIL_SECTION}" !== "") {
                        var element = document.querySelector('[id^="${MARKDOWN_WEBVIEW_UTIL_SECTION}"]');
                        if (element) {
                            element.scrollIntoView(true);
                        }
                    }
                    var backToTopBtn = document.getElementById('back-to-top-btn');
                    if (backToTopBtn) {
                        backToTopBtn.onclick = () => document.documentElement.scrollTop = 0;
                    }
                })();
            </script>
        </body>
        </html>
    `;
    }
}

export const generateNonce = () => {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
