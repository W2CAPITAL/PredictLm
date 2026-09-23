import type { WorkspaceFile } from './types';

export function buildPreview(files: WorkspaceFile[]) {
  const app = files.find(f => /(^|\/)App\.(tsx|jsx|js|ts)$/.test(f.path))?.content || '';
  const css = files.find(f => /styles?\.css$|globals\.css$/.test(f.path))?.content || '';
  const stripped = app
    .replace(/^\s*['"]use client['"];?\s*/,'')
    .replace(/import[\s\S]*?from\s+['"][^'"]+['"];?\n?/g,'')
    .replace(/export\s+default\s+function\s+App/g,'function App')
    .replace(/export\s+default\s+App;?/g,'');

  const inspectScript = [
    '(function(){',
    'let enabled=false,last=null;',
    'function clear(){if(!last)return;last.style.outline=last.dataset.predictOutline||"";last.style.outlineOffset=last.dataset.predictOutlineOffset||"";last=null;}',
    'window.addEventListener("message",function(ev){if(ev.data&&ev.data.type==="predictlm:set-inspect"){enabled=!!ev.data.enabled;if(!enabled)clear();}});',
    'document.addEventListener("mouseover",function(ev){if(!enabled)return;const el=ev.target;if(!(el instanceof HTMLElement))return;if(last!==el){clear();el.dataset.predictOutline=el.style.outline||"";el.dataset.predictOutlineOffset=el.style.outlineOffset||"";el.style.outline="2px solid #7c5cff";el.style.outlineOffset="2px";last=el;}},true);',
    'document.addEventListener("click",function(ev){if(!enabled)return;const el=ev.target;if(!(el instanceof HTMLElement))return;ev.preventDefault();ev.stopPropagation();const r=el.getBoundingClientRect();parent.postMessage({type:"predictlm:inspect",payload:{tag:el.tagName.toLowerCase(),id:el.id||"",classes:Array.from(el.classList).slice(0,12),text:(el.innerText||el.textContent||"").trim().slice(0,180),rect:{x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)}}},"*");},true);',
    '})();'
  ].join('');

  return '<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><script src="https://unpkg.com/react@18/umd/react.development.js"></script><script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script><script src="https://unpkg.com/@babel/standalone/babel.min.js"></script><style>'+css+'</style></head><body><div id="root"></div><script type="text/babel">const {useState,useEffect,useMemo,useRef}=React;'+stripped+';ReactDOM.createRoot(document.getElementById("root")).render(<App/>);</script><script>'+inspectScript+'</script></body></html>';
}
