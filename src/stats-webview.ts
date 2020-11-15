import * as vscode from 'vscode';
import * as path from 'path';
import * as dbgFile from './debug-file';
import * as fs from 'fs';
import * as util from 'util';
import { EventEmitter } from 'events';

export class StatsWebview {
	private static _currentPanel: StatsWebview | undefined;
	private static _runAhead : ImageData;
	private static _current: ImageData;
	private static _emitter: EventEmitter = new EventEmitter();

	public static readonly viewType = 'statsWebview';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionPath: string;
    private _disposables: vscode.Disposable[] = [];

    public static update(runAhead?: ImageData, current?: ImageData) {
        StatsWebview._runAhead = runAhead || StatsWebview._runAhead;
        StatsWebview._current = current || StatsWebview._current;
        if(StatsWebview._currentPanel && StatsWebview._runAhead) {
            StatsWebview._currentPanel._panel.webview.postMessage({
				runAhead: StatsWebview._runAhead,
				current: StatsWebview._current,
			});
        }
	}
	
	public static addEventListener(event: string, cb: (...args: any[]) => void) {
		StatsWebview._emitter.addListener(event, cb);
	}

	public static maybeCreate(extensionPath: string) {
		if (StatsWebview._currentPanel) {
			return;
		}

		const panel = vscode.window.createWebviewPanel(
			StatsWebview.viewType,
			'CC65 - Run',
			vscode.ViewColumn.Two,
			{
				retainContextWhenHidden: true,
				enableScripts: true,
				localResourceRoots: [vscode.Uri.file(path.join(extensionPath, 'dist'))]
			}
		);

		panel.webview.onDidReceiveMessage((evt) => {
			const r = evt.request;
			if(r == 'keydown') {
				StatsWebview._emitter.emit(r, evt);
			}
			else if(r == 'keyup') {
				StatsWebview._emitter.emit(r, evt);
			}
		});

        StatsWebview._currentPanel = new StatsWebview(panel, extensionPath);

        StatsWebview.update(StatsWebview._runAhead, StatsWebview._current);
	}

	public static revive(panel: vscode.WebviewPanel, extensionPath: string) {
		StatsWebview._currentPanel = new StatsWebview(panel, extensionPath);
	}

	private constructor(panel: vscode.WebviewPanel, extensionPath: string) {
		this._panel = panel;
		this._extensionPath = extensionPath;

        this._init();

		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
	}

	public dispose() {
		StatsWebview._currentPanel = undefined;

		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
    }

	private _init() {
		const webview = this._panel.webview;

		this._panel.title = 'CC65 - Run';
        this._panel.webview.html = this._getHtmlForWebview(webview);

    }

	private _getHtmlForWebview(webview: vscode.Webview) {
		const scriptPathOnDisk = vscode.Uri.file(
			path.join(this._extensionPath, 'dist', 'webviews.js')
		);
		const cssPathOnDisk = vscode.Uri.file(
			path.join(this._extensionPath, 'dist', 'styles.css')
		);

		const scriptUri = webview.asWebviewUri(scriptPathOnDisk);
		const cssUri = webview.asWebviewUri(cssPathOnDisk);

		const nonce = getNonce();

		return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src-elem ${webview.cspSource} ; img-src blob: ${webview.cspSource} https:; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link rel="stylesheet" type="text/css" href="${cssUri}" />
                <title>Jimmy Eat World</title>
            </head>
            <body>
                <div id="content"></div>
                <script nonce="${nonce}" type="text/javascript" src="${scriptUri}"></script>
                <script nonce="${nonce}" type="text/javascript">
                    webviews.statsWebviewContent();
                </script>
            </body>
            </html>`;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}