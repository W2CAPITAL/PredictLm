import type { WorkspaceFile } from './types';

export function buildPreview(files: WorkspaceFile[]) {
  const app = files.find(f => /(^|\/)App\.(tsx|jsx|js|ts)$/.test(f.path))?.content || '';
  const css = files.find(f => /styles?\.css$|globals\.css$/.test(f.path))?.content || '';
  const stripped = app
    .replace(/^\s*['"]use client['"];?\s*/,'')
    .replace(/import[\s\S]*?from\s+['"][^'"]+['"];?\n?/g,'')
    .replace(/export\s+default\s+function\s+App/g,'function App')
    .replace(/export\s+default\s+App;?/g,'');
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><script src="https://unpkg.com/react@18/umd/react.development.js"></script><script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script><script src="https://unpkg.com/@babel/standalone/babel.min.js"></script><style>${css}</style></head><body><div id="root"></div><script type="text/babel">const {useState,useEffect,useMemo,useRef}=React;${stripped};ReactDOM.createRoot(document.getElementById('root')).render(<App/>);</script></body></html>`;
}
