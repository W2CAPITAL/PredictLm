import type { Metadata, Viewport } from 'next';
import './globals.css';
import { NeuralWarmup } from '@/components/NeuralWarmup';

export const metadata:Metadata={title:'PredictLM Studio',description:'API-first multimodal assistant with agent skills, research, build and local auxiliary runtimes.',icons:{icon:'/icon.svg'}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#0d0d0d'};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="pt-BR">
    <head>
      <script id="predictlm-chunk-recovery" dangerouslySetInnerHTML={{__html:"(function(){\n    var KEY='predictlm_chunk_recovery_v1';\n    function recover(reason){\n      try{\n        if(sessionStorage.getItem(KEY)==='1')return;\n        sessionStorage.setItem(KEY,'1');\n      }catch(e){}\n      var u=new URL(location.href);\n      u.searchParams.set('__predict_refresh',Date.now().toString());\n      location.replace(u.toString());\n    }\n    window.addEventListener('error',function(event){\n      var target=event&&event.target;\n      var src=target&&target.src?String(target.src):'';\n      if(src.indexOf('/_next/static/')!==-1)recover('asset-error');\n      var message=event&&event.message?String(event.message):'';\n      if(/ChunkLoadError|Loading chunk .* failed|Failed to fetch dynamically imported module/i.test(message))recover('chunk-error');\n    },true);\n    window.addEventListener('unhandledrejection',function(event){\n      var message=String(event&&event.reason&&(event.reason.message||event.reason)||'');\n      if(/ChunkLoadError|Loading chunk .* failed|Failed to fetch dynamically imported module/i.test(message))recover('chunk-rejection');\n    });\n    window.addEventListener('pageshow',function(){\n      try{sessionStorage.removeItem(KEY)}catch(e){}\n    },{once:true});\n  })();"}}/>
    </head>
    <body><NeuralWarmup/>{children}</body>
  </html>;
}
