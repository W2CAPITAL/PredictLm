import type { WorkspaceFile } from './types';
import { repairLegacyEscapedNewlines } from './workspace-repair';

export function buildPreview(files: WorkspaceFile[]) {
  const rawApp = files.find(f => /(^|\/)App\.(tsx|jsx|js|ts)$/.test(f.path))?.content || '';
  const app = repairLegacyEscapedNewlines(rawApp);
  const css = files.find(f => /styles?\.css$|globals\.css$/.test(f.path))?.content || '';
  const stripped = app
    .replace(/^\s*['"]use client['"];?\s*/,'')
    .replace(/import[\s\S]*?from\s+['"][^'"]+['"];?\n?/g,'')
    .replace(/export\s+default\s+function\s+App/g,'function App')
    .replace(/export\s+default\s+App;?/g,'');

  const source = 'const {useState,useEffect,useMemo,useRef}=React;\n'+stripped+'\n;ReactDOM.createRoot(document.getElementById("root")).render(<App/>);';

  const inspectScript = [
    '(function(){',
    'let enabled=false,last=null;',
    'function clear(){if(!last)return;last.style.outline=last.dataset.predictOutline||"";last.style.outlineOffset=last.dataset.predictOutlineOffset||"";last=null;}',
    'window.addEventListener("message",function(ev){if(ev.data&&ev.data.type==="predictlm:set-inspect"){enabled=!!ev.data.enabled;if(!enabled)clear();}});',
    'document.addEventListener("mouseover",function(ev){if(!enabled)return;const el=ev.target;if(!(el instanceof HTMLElement))return;if(last!==el){clear();el.dataset.predictOutline=el.style.outline||"";el.dataset.predictOutlineOffset=el.style.outlineOffset||"";el.style.outline="2px solid #7c5cff";el.style.outlineOffset="2px";last=el;}},true);',
    'document.addEventListener("click",function(ev){if(!enabled)return;const el=ev.target;if(!(el instanceof HTMLElement))return;ev.preventDefault();ev.stopPropagation();const r=el.getBoundingClientRect();parent.postMessage({type:"predictlm:inspect",payload:{tag:el.tagName.toLowerCase(),id:el.id||"",classes:Array.from(el.classList).slice(0,12),text:(el.innerText||el.textContent||"").trim().slice(0,180),rect:{x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)}}},"*");},true);',
    '})();'
  ].join('');

  const runtime = [
    '(function(){',
    'const overlay=document.getElementById("predict-error");',
    'function showError(error){',
    ' const message=(error&&error.message)||String(error||"Unknown preview error");',
    ' const stack=(error&&error.stack)||"";',
    ' overlay.style.display="block";',
    ' overlay.querySelector("strong").textContent="Preview error";',
    ' overlay.querySelector("pre").textContent=message+(stack?"\\n\\n"+stack:"");',
    ' parent.postMessage({type:"predictlm:preview-error",payload:{message:message,stack:stack}},"*");',
    '}',
    'window.addEventListener("error",function(e){showError(e.error||e.message)});',
    'window.addEventListener("unhandledrejection",function(e){showError(e.reason)});',
    'try{',
    ' const compiled=Babel.transform('+JSON.stringify(source)+',{presets:["react"],sourceType:"script"}).code;',
    ' new Function("React","ReactDOM",compiled)(React,ReactDOM);',
    '}catch(error){showError(error)}',
    '})();'
  ].join('');

  const safeRuntime=runtime.replace(/<\/script/gi,'<\\/script');
  return '<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>'+
    '<script src="https://unpkg.com/react@18/umd/react.development.js"></script>'+
    '<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>'+
    '<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>'+
    '<style>'+css+'#predict-error{display:none;position:fixed;inset:16px;z-index:99999;background:#111318;color:#e7e9ee;border:1px solid #592d38;border-radius:14px;padding:16px;box-shadow:0 20px 70px rgba(0,0,0,.55);font-family:ui-monospace,SFMono-Regular,Menlo,monospace}#predict-error strong{display:block;color:#ff8799;margin-bottom:9px;font-family:Inter,system-ui}#predict-error pre{white-space:pre-wrap;overflow:auto;max-height:70vh;color:#cbd1dc;font-size:12px;line-height:1.55}</style>'+
    '</head><body><div id="root"></div><div id="predict-error"><strong></strong><pre></pre></div><script>'+safeRuntime+'</script><script>'+inspectScript+'</script></body></html>';
}
