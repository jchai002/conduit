export interface WebviewHtmlOptions {
  scriptUri: string;
  styleUri: string;
  nonce: string;
  cspSource: string;
}

export function getWebviewHtml(opts: WebviewHtmlOptions): string {
  return /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
      style-src ${opts.cspSource};
      script-src 'nonce-${opts.nonce}';">
  <link rel="stylesheet" href="${opts.styleUri}">
</head>
<body>
  <div id="root"></div>
  <script nonce="${opts.nonce}" src="${opts.scriptUri}"></script>
</body>
</html>`;
}
