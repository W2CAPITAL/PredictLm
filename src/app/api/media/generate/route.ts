import { isNarutoKuramaVsSasukeSusanooPrompt } from '@/lib/media/canonical-matchup';
import { ENTITY_REFERENCE_IMAGE } from '@/lib/entity-self-model';
import { compactText } from '@/lib/token-budget';
import { buildDefaultNegativePrompt, buildLiteralImagePrompt, chooseImagePromptMode, expandImagePromptForParity, parityCaptionPtBr, type ImagePromptMode } from '@/lib/media/grok-imagine-parity';
import { mediaErrorText } from '@/lib/media/media-errors';
import { buildDisplayTitle, buildSafeCaptionPtBr, recommendedImageStyle, shouldForceLiteralMode } from '@/lib/media/media-fidelity';
import {callVisionProviders,parseVisionJson} from '@/lib/server/vision-provider';
import {
  buildReferenceEvidencePrompt,
  buildVisualIdentityLock,
  fetchReferenceInlineData,
  inlineImageFromDataUrl,
  isPersistentSelfPortraitRequest,
  resolveVisualReferences
} from '@/lib/media/visual-reference';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clamp(value:number,min:number,max:number){
  return Math.max(min,Math.min(max,Math.round(value||0)));
}

function geminiAspectRatio(width:number,height:number){
  const ratio=width/Math.max(1,height);
  if(ratio>1.45)return '16:9';
  if(ratio<0.72)return '9:16';
  if(ratio>1.18)return '4:3';
  if(ratio<0.86)return '3:4';
  return '1:1';
}

function providerImageSize(width:number,height:number,nano:boolean){
  if(!nano)return width+'x'+height;
  const ratio=width/Math.max(1,height);
  if(ratio>1.3)return '1792x1024';
  if(ratio<0.77)return '1024x1792';
  return '1024x1024';
}

async function reviewReferenceUsefulness(
  prompt:string,
  ref:{title:string;site:string;query:string},
  inline:{mimeType:string;data:string}
){
  try{
    const instruction=[
      'You are validating a candidate visual reference before image generation.',
      'Target request: '+prompt,
      'Candidate search query: '+ref.query,
      'Candidate title/site: '+ref.title+' · '+ref.site,
      'Inspect the pixels. The reference is useful if it clearly depicts at least one requested named character/form/object or the requested canonical scene/setting.',
      'A single-character reference is useful even when the final request contains multiple characters.',
      'Reject unrelated characters, fan art with contradictory identity, memes, collages dominated by text, logos-only images, merchandise photos that hide the design, or visibly wrong forms.',
      'Return JSON only: {"useful":true,"confidence":0.0,"subjects":["visible requested identity"],"reason":"short reason"}.'
    ].join('\n');
    const vision=await callVisionProviders(
      instruction,
      'data:'+inline.mimeType+';base64,'+inline.data,
      {timeoutMs:11000,maxProviders:2}
    );
    const parsed=parseVisionJson<any>(vision.text);
    if(!parsed||typeof parsed.useful!=='boolean')return {status:'unavailable' as const,useful:true,confidence:0,subjects:[] as string[],provider:'',model:''};
    return {
      status:'reviewed' as const,
      useful:parsed.useful===true,
      confidence:Math.max(0,Math.min(1,Number(parsed.confidence)||0)),
      subjects:Array.isArray(parsed.subjects)?parsed.subjects.map((x:any)=>String(x||'').trim()).filter(Boolean).slice(0,5):[],
      reason:String(parsed.reason||'').trim().slice(0,280),
      provider:vision.provider,
      model:vision.model
    };
  }catch{
    return {status:'unavailable' as const,useful:true,confidence:0,subjects:[] as string[],provider:'',model:''};
  }
}

function localRenderUrl(
  prompt:string,width:number,height:number,seed:number,model:string,enhance:boolean,
  referenceUrls:string[]=[]
){
  const q=new URLSearchParams({
    prompt,
    width:String(width),
    height:String(height),
    seed:String(seed),
    model:model||'flux',
    enhance:enhance?'true':'false'
  });
  for(const url of referenceUrls.slice(0,3))q.append('reference',url);
  return '/api/media/render?'+q.toString();
}

export async function POST(req:Request){
  try{
    const body=await req.json().catch(()=>({}));
    const rawPrompt=String(body?.prompt||'').trim();
    const originalPrompt=String(body?.originalPrompt||rawPrompt).trim();
    if(!rawPrompt||!originalPrompt)return Response.json({error:'Descreva a imagem.'},{status:400});

    const width=clamp(Number(body?.width)||1024,256,2048);
    const height=clamp(Number(body?.height)||1024,256,2048);
    const seed=Math.max(1,Math.min(2147483646,Math.floor(Number(body?.seed)||1)));

    // A autoimagem persistente não sofre reimaginação/drift do provider.
    if(isPersistentSelfPortraitRequest(originalPrompt)){
      return Response.json({
        url:ENTITY_REFERENCE_IMAGE,
        provider:'entity-self-reference',
        model:'predict-persistent-identity',
        width,
        height,
        seed,
        identityLocked:true,
        exactReference:true,
        referencesUsed:[],
        originalPrompt,
        expandedPrompt:originalPrompt,
        caption:buildSafeCaptionPtBr(originalPrompt,parityCaptionPtBr(originalPrompt)),
        displayTitle:buildDisplayTitle(originalPrompt)
      });
    }

    const preparedPrompt=compactText(rawPrompt,1100);
    const sourcePrompt=compactText(originalPrompt,700);
    const directorBrief=compactText(String(body?.directorBrief||'').trim(),620);
    const requestedStyle=String(body?.style||'Cinematic').trim()||'Cinematic';
    const styleLocked=!!body?.styleLocked;
    const style=styleLocked?requestedStyle:recommendedImageStyle(sourcePrompt,requestedStyle);
    const attempt=Math.max(0,Math.min(20,Math.floor(Number(body?.attempt)||0)));
    const requestedPromptMode=(['auto','literal','imagine'].includes(String(body?.promptMode||'auto').toLowerCase())
      ? String(body?.promptMode||'auto').toLowerCase()
      : 'auto') as ImagePromptMode;
    const effectivePromptMode=isNarutoKuramaVsSasukeSusanooPrompt(sourcePrompt)?'literal':chooseImagePromptMode(requestedPromptMode,shouldForceLiteralMode(sourcePrompt));
    const userNegative=compactText(String(body?.negativePrompt||'').trim(),500);
    const negativePrompt=buildDefaultNegativePrompt(sourcePrompt,userNegative);
    const referenceMode=String(body?.referenceMode||'auto').toLowerCase();
    const referencePlan=referenceMode==='off'
      ? {query:'',queries:[] as string[],references:[],warnings:[] as string[],candidatesFound:0,searchRounds:0}
      : await resolveVisualReferences(sourcePrompt);
    const identityLock=buildVisualIdentityLock(sourcePrompt);
    const evidencePrompt=buildReferenceEvidencePrompt(referencePlan.references);
    const needsStrongIdentity=shouldForceLiteralMode(sourcePrompt);
    const compiledPrompt=effectivePromptMode==='literal'
      ? buildLiteralImagePrompt({
          originalPrompt:sourcePrompt,
          style,
          identityLock,
          referenceEvidence:[evidencePrompt,directorBrief?('API VISUAL DIRECTOR LOCK: '+directorBrief):''].filter(Boolean).join('\n'),
          negativePrompt
        })
      : expandImagePromptForParity({
          originalPrompt:sourcePrompt,
          preparedPrompt,
          style,
          width,
          height,
          attempt,
          identityLock,
          referenceEvidence:[evidencePrompt,directorBrief?('API VISUAL DIRECTOR NOTES: '+directorBrief):''].filter(Boolean).join('\n')
        })+'\n\nNEGATIVE CONSTRAINTS: '+negativePrompt+'.';

    const genericRepair=compactText(String(body?.semanticRepairHints||'').trim(),520);
    const canonicalRepair=body?.semanticRepair===true&&isNarutoKuramaVsSasukeSusanooPrompt(sourcePrompt)
      ? 'Reduce central explosion. Increase readability of Kurama and Perfect Susanoo. Show both full avatars clearly. Preserve the requested setting and statues.'
      : '';
    const correction=genericRepair||canonicalRepair;
    const groundedPrompt=compiledPrompt+(correction?'\n\nSEMANTIC REPAIR — correct the visible mismatch without changing the requested subject: '+correction:'');

    const userInline=(Array.isArray(body?.referenceImages)?body.referenceImages:[])
      .slice(0,3)
      .map((x:any)=>inlineImageFromDataUrl(String(x||'')))
      .filter(Boolean) as {mimeType:string;data:string}[];

    const downloadCandidates=(await Promise.all(
      referencePlan.references.slice(0,8).map(async ref=>({
        ref,
        inline:await fetchReferenceInlineData(ref)
      }))
    )).filter(x=>x.inline) as {ref:(typeof referencePlan.references)[number];inline:{mimeType:string;data:string}}[];

    const reviewable=needsStrongIdentity
      ? await Promise.all(downloadCandidates.slice(0,5).map(async item=>({
          ...item,
          review:await reviewReferenceUsefulness(sourcePrompt,item.ref,item.inline)
        })))
      : downloadCandidates.map(item=>({...item,review:{status:'skipped' as const,useful:true,confidence:0,subjects:[] as string[],provider:'',model:''}}));

    const approvedDownloaded=reviewable
      .filter(item=>item.review.useful!==false)
      .sort((a,b)=>(b.review.confidence||0)-(a.review.confidence||0))
      .slice(0,Math.max(0,3-userInline.length));

    const searchedInline=approvedDownloaded.map(x=>x.inline);
    const searchedReferenceUrls=approvedDownloaded.map(x=>x.ref.imageUrl);
    const inlineReferences=[...userInline,...searchedInline].slice(0,3);
    const referenceReview={
      candidatesFound:Number(referencePlan.candidatesFound||referencePlan.references.length),
      urlsDownloaded:downloadCandidates.length,
      visuallyReviewed:reviewable.filter(x=>x.review.status==='reviewed').length,
      visuallyApproved:approvedDownloaded.length,
      providers:[...new Set(reviewable.map(x=>x.review.provider).filter(Boolean))],
      subjects:[...new Set(reviewable.flatMap(x=>x.review.subjects||[]))].slice(0,10),
      queries:referencePlan.queries||[referencePlan.query].filter(Boolean),
      searchRounds:Number(referencePlan.searchRounds||1)
    };
    const providerPrompt=groundedPrompt+(userInline.length
      ? '\n\nUSER-SUPPLIED REFERENCE LOCK: '+userInline.length+' reference image(s) were supplied directly by the user. They have the highest visual priority for identity, face/body design, costume, colors, silhouette and requested form. Search references are secondary. Preserve the requested action/composition but do not drift away from the uploaded subject.'
      : searchedInline.length
        ? '\n\nAUTOMATIC VISUAL GROUNDING: '+searchedInline.length+' downloaded reference image(s) passed the automatic usefulness filter and should control canonical identity/forms more strongly than textual style expansion.'
        : '');

    const mediaBase=String(process.env.MEDIA_IMAGE_BASE_URL||'').trim();
    const mediaKey=String(process.env.MEDIA_IMAGE_API_KEY||'').trim();
    const mediaReferenceField=String(process.env.MEDIA_IMAGE_REFERENCE_FIELD||'').trim();
    const mediaNegativeField=String(process.env.MEDIA_IMAGE_NEGATIVE_FIELD||'').trim();
    const geminiKey=String(process.env.GEMINI_API_KEY||'').trim();
    const geminiBase=String(process.env.GEMINI_IMAGE_BASE_URL||'https://generativelanguage.googleapis.com/v1beta').trim().replace(/\/$/,'');
    const geminiModel=String(process.env.GEMINI_IMAGE_MODEL||'gemini-3.1-flash-image').trim();
    const nanoKey=String(process.env.NANO_BANANA_API_KEY||'').trim();
    const nanoBase=String(process.env.NANO_BANANA_BASE_URL||'https://nanobanana.aikit.club').trim();
    const requestedModel=String(body?.model||process.env.MEDIA_IMAGE_MODEL||'flux').trim();
    const nanoModel=String(process.env.NANO_BANANA_MODEL||'nano-banana').trim();
    const order=String(process.env.PREDICTLM_IMAGE_PROVIDER_ORDER||'gemini,nano,configured')
      .split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
    if(geminiKey&&!order.includes('gemini'))order.unshift('gemini');
    const providers=[
      ...(order.includes('gemini')&&geminiKey?[{id:'gemini-nano-banana-2',base:geminiBase,key:geminiKey,model:geminiModel,nano:false,gemini:true}]:[]),
      ...(order.includes('nano')&&nanoKey?[{id:'nano-banana',base:nanoBase,key:nanoKey,model:nanoModel,nano:true,gemini:false}]:[]),
      ...(order.includes('configured')&&mediaBase?[{id:'configured-image',base:mediaBase,key:mediaKey,model:requestedModel,nano:false,gemini:false}]:[])
    ];

    for(const provider of providers){
      try{
        const url=provider.gemini
          ? provider.base+'/models/'+encodeURIComponent(provider.model)+':generateContent'
          : provider.base.replace(/\/$/,'')+(provider.base.endsWith('/v1')?'/images/generations':'/v1/images/generations');

        const configuredReferenceValues=[
          ...userInline.map(x=>'data:'+x.mimeType+';base64,'+x.data),
          ...referencePlan.references.map(x=>x.imageUrl)
        ].slice(0,4);

        const providerBody=provider.gemini?{
          contents:[{
            parts:[
              ...inlineReferences.map(x=>({inlineData:{mimeType:x.mimeType,data:x.data}})),
              {text:providerPrompt}
            ]
          }],
          generationConfig:{responseModalities:['TEXT','IMAGE'],imageConfig:{aspectRatio:geminiAspectRatio(width,height),imageSize:'2K'}}
        }:{
          model:provider.model,
          prompt:providerPrompt,
          size:providerImageSize(width,height,provider.nano),
          n:1,
          quality:'high',
          ...(provider.id==='configured-image'&&mediaReferenceField&&configuredReferenceValues.length
            ? {[mediaReferenceField]:configuredReferenceValues}
            : {}),
          ...(provider.id==='configured-image'&&mediaNegativeField&&negativePrompt
            ? {[mediaNegativeField]:negativePrompt}
            : {})
        };

        const upstream=await fetch(url,{
          method:'POST',
          headers:provider.gemini
            ? {'Content-Type':'application/json','x-goog-api-key':provider.key}
            : {'Content-Type':'application/json',...(provider.key?{'Authorization':'Bearer '+provider.key}:{})},
          body:JSON.stringify(providerBody),
          signal:AbortSignal.timeout(90000)
        });
        const data=await upstream.json().catch(()=>({}));
        if(!upstream.ok)continue;
        const first=data?.data?.[0]||{};
        const parts=Array.isArray(data?.candidates?.[0]?.content?.parts)?data.candidates[0].content.parts:[];
        const inline=parts.find((x:any)=>x?.inlineData?.data||x?.inline_data?.data);
        const remoteUrl=first.url||data?.url||null;
        const b64=inline?.inlineData?.data||inline?.inline_data?.data||first.b64_json||data?.b64_json||null;
        const mime=inline?.inlineData?.mimeType||inline?.inline_data?.mime_type||'image/png';
        const dataUrl=b64?'data:'+mime+';base64,'+b64:null;
        if(remoteUrl||dataUrl){
          const referenceImagesPassed=provider.gemini?inlineReferences.length:(provider.id==='configured-image'&&mediaReferenceField?configuredReferenceValues.length:0);
          const fidelityWarning=needsStrongIdentity
            ? referencePlan.references.length===0
              ? 'Pedido de alta fidelidade sem referência visual recuperada; a identidade depende do conhecimento do modelo.'
              : referenceImagesPassed===0
                ? 'Referências visuais foram encontradas, mas este provider não recebeu as imagens; o grounding ficou textual.'
                : ''
            : '';
          return Response.json({
            url:remoteUrl||dataUrl,
            provider:provider.id,
            model:provider.model,
            width,height,seed,
            identityLocked:true,
            referenceQuery:referencePlan.query||null,
            referencesUsed:referencePlan.references.map(x=>({provider:x.provider,title:x.title,sourceUrl:x.sourceUrl,site:x.site})),
            referenceImagesPassed,
            userReferenceCount:userInline.length,
            searchedReferenceCount:searchedInline.length,
            referenceReview,
            referenceWarnings:referencePlan.warnings,
            originalPrompt:sourcePrompt,
            expandedPrompt:providerPrompt,
            caption:buildSafeCaptionPtBr(sourcePrompt),
            displayTitle:buildDisplayTitle(sourcePrompt),
            parityContract:'grok-imagine-parity',
            promptMode:effectivePromptMode,
            negativePrompt,
            style,
            styleLocked,
            fidelityLimited:!!fidelityWarning,
            providerWarning:fidelityWarning||null
          });
        }
      }catch{
        // Continue to the next configured provider; public fallback remains available.
      }
    }

    // O fallback textual continua recebendo o identity lock. Referências visuais reais
    // exigem Gemini multimodal ou um provider configurado com MEDIA_IMAGE_REFERENCE_FIELD.
    const automaticReferenceUrls=searchedReferenceUrls.slice(0,3);
    const wantsReferenceFallback=needsStrongIdentity&&automaticReferenceUrls.length>0;
    const fallbackModel=wantsReferenceFallback
      ? String(process.env.PREDICTLM_REFERENCE_IMAGE_MODEL||'kontext').trim()
      : requestedModel;
    const referenceTransportVerified=Boolean(
      String(process.env.POLLINATIONS_API_KEY||'').trim()||
      String(process.env.PREDICT_PUBLIC_IMAGE_URL||'').trim()
    );
    const referenceCapableFallback=wantsReferenceFallback&&referenceTransportVerified;
    return Response.json({
      url:localRenderUrl(providerPrompt,width,height,seed,fallbackModel,effectivePromptMode!=='literal',automaticReferenceUrls),
      provider:'pollinations-proxy',
      model:fallbackModel,
      width,
      height,
      seed,
      identityLocked:true,
      referenceQuery:referencePlan.query||null,
      referencesUsed:referencePlan.references.map(x=>({provider:x.provider,title:x.title,sourceUrl:x.sourceUrl,site:x.site})),
      referenceImagesPassed:referenceCapableFallback?automaticReferenceUrls.length:0,
      automaticReferenceCount:automaticReferenceUrls.length,
      userReferenceCount:userInline.length,
      searchedReferenceCount:searchedInline.length,
      referenceReview,
      referenceWarnings:referencePlan.warnings,
      originalPrompt:sourcePrompt,
      expandedPrompt:providerPrompt,
      caption:buildSafeCaptionPtBr(sourcePrompt),
      displayTitle:buildDisplayTitle(sourcePrompt),
      parityContract:'grok-imagine-parity',
      promptMode:effectivePromptMode,
      negativePrompt,
      style,
      styleLocked,
      fidelityLimited:true,
      providerWarning:referenceCapableFallback
        ? 'Fallback de personagem usa modelo image-to-image com transporte de referência configurado; a revisão semântica valida o resultado antes de persistir.'
        : wantsReferenceFallback
          ? 'O PredictLM encontrou referências e tentou um modelo image-to-image, mas não há transporte de referência autenticado/configurado para afirmar que o provider consumiu esses pixels; a revisão semântica decide se o resultado é aceitável.'
          : 'Fallback público ativo e nenhuma referência visual automática utilizável foi recuperada nesta tentativa.'
    });
  }catch(error:any){
    return Response.json({error:mediaErrorText(error,'Falha ao gerar imagem.')},{status:500});
  }
}
