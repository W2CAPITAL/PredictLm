import { isNarutoKuramaVsSasukeSusanooPrompt } from '@/lib/media/canonical-matchup';
import { ENTITY_REFERENCE_IMAGE } from '@/lib/entity-self-model';
import { compactText } from '@/lib/token-budget';
import { buildDefaultNegativePrompt, buildLiteralImagePrompt, chooseImagePromptMode, expandImagePromptForParity, parityCaptionPtBr, type ImagePromptMode } from '@/lib/media/grok-imagine-parity';
import { INVALID_IMAGE_PROVIDER_MESSAGE, mediaErrorText } from '@/lib/media/media-errors';
import { mediaPostprocessPlan, mediaQualityDirectives } from '@/lib/media/postprocess-pipeline';
import { buildDisplayTitle, buildSafeCaptionPtBr, recommendedImageStyle, shouldForceLiteralMode } from '@/lib/media/media-fidelity';
import {callVisionProviders,parseVisionJson} from '@/lib/server/vision-provider';
import {comfyImageConfig,runComfyImageWorkflow} from '@/lib/media/comfy-image';
import {unityFabricContext} from '@/lib/unity-fabric';
import { buildBestImagePlan, candidateVariationDirective } from '@/lib/media/best-image-orchestrator';
import { identityProviderDecision } from '@/lib/media/identity-provider-policy';
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

function referenceCoverageBucket(prompt:string,ref:{title:string;query:string;site?:string}){
  const hay=(String(ref.title||'')+' '+String(ref.query||'')+' '+String(ref.site||''))
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,' ');
  if(isNarutoKuramaVsSasukeSusanooPrompt(prompt)){
    if(/susanoo/.test(hay))return 'sasuke-susanoo';
    if(/kurama|kyuubi|kyubi|nine[- ]?tails|nove caudas/.test(hay))return 'naruto-kurama';
    if(/sasuke|uchiha/.test(hay))return 'sasuke';
    if(/naruto|uzumaki/.test(hay))return 'naruto';
    if(/battle|versus|vs\.?|fight|final/.test(hay))return 'battle';
  }
  return hay.split(/\s+/).filter(Boolean).slice(0,3).join('-')||'other';
}

function selectReferenceCoverage<T extends {ref:{title:string;query:string;site?:string};review:{confidence?:number;useful?:boolean}}>(
  prompt:string,
  items:T[],
  max:number
){
  const ranked=[...items].sort((a,b)=>(Number(b.review?.confidence)||0)-(Number(a.review?.confidence)||0));
  if(!isNarutoKuramaVsSasukeSusanooPrompt(prompt))return ranked.slice(0,max);

  const order=['sasuke-susanoo','naruto-kurama','naruto','sasuke','battle'];
  const selected:T[]=[];
  const used=new Set<T>();
  for(const bucket of order){
    const item=ranked.find(x=>!used.has(x)&&referenceCoverageBucket(prompt,x.ref)===bucket);
    if(item){
      selected.push(item);
      used.add(item);
      if(selected.length>=max)return selected;
    }
  }
  for(const item of ranked){
    if(used.has(item))continue;
    selected.push(item);
    if(selected.length>=max)break;
  }
  return selected;
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
    const bestImagePlan=buildBestImagePlan(sourcePrompt,style);
    const candidateIndex=Math.max(0,Math.min(4,Math.floor(Number(body?.candidateIndex)||0)));
    const candidateCount=Math.max(1,Math.min(4,Math.floor(Number(body?.candidateCount)||bestImagePlan.candidateCount)));
    const candidateDirective=candidateVariationDirective(candidateIndex,candidateCount);
    const avoidProviders=new Set<string>((Array.isArray(body?.avoidProviders)?body.avoidProviders:[]).map((x:any)=>String(x||'').trim().toLowerCase()).filter(Boolean));
    const strictIdentityProvider=body?.strictIdentityProvider!==false;
    const attempt=Math.max(0,Math.min(20,Math.floor(Number(body?.attempt)||0)));
    const requestedPromptMode=(['auto','literal','imagine'].includes(String(body?.promptMode||'auto').toLowerCase())
      ? String(body?.promptMode||'auto').toLowerCase()
      : 'auto') as ImagePromptMode;
    const effectivePromptMode=isNarutoKuramaVsSasukeSusanooPrompt(sourcePrompt)?'literal':chooseImagePromptMode(requestedPromptMode,shouldForceLiteralMode(sourcePrompt));
    const userNegative=compactText(String(body?.negativePrompt||'').trim(),500);
    const negativePrompt=buildDefaultNegativePrompt(sourcePrompt,userNegative);
    const referenceMode=String(body?.referenceMode||'auto').toLowerCase();
    const referencePlan=referenceMode==='off'
      ? {query:'',queries:[] as string[],references:[],warnings:[] as string[],candidatesFound:0,searchRounds:0,catalogCharacters:[] as any[]}
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
    const groundedPrompt=[compiledPrompt,bestImagePlan.promptContract,candidateDirective,correction?'SEMANTIC REPAIR — correct the visible mismatch without changing the requested subject: '+correction:''].filter(Boolean).join('\n\n');

    const userInline=(Array.isArray(body?.referenceImages)?body.referenceImages:[])
      .slice(0,3)
      .map((x:any)=>inlineImageFromDataUrl(String(x||'')))
      .filter(Boolean) as {mimeType:string;data:string}[];
    const identityMemoryInline=(Array.isArray(body?.identityReferenceImages)?body.identityReferenceImages:[])
      .slice(0,1)
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

    const approvedDownloaded=selectReferenceCoverage(
      sourcePrompt,
      reviewable.filter(item=>item.review.useful!==false),
      Math.max(0,3-userInline.length-identityMemoryInline.length)
    );

    const searchedInline=approvedDownloaded.map(x=>x.inline);
    const searchedReferenceUrls=approvedDownloaded.map(x=>x.ref.imageUrl);
    const inlineReferences=[...userInline,...identityMemoryInline,...searchedInline].slice(0,3);
    const referenceEvidenceAvailable=inlineReferences.length>0||referencePlan.references.length>0;
    const requireReferenceTransport=body?.requireReferenceTransport===true||(needsStrongIdentity&&strictIdentityProvider&&referenceEvidenceAvailable);
    const referenceReview={
      candidatesFound:Number(referencePlan.candidatesFound||referencePlan.references.length),
      urlsDownloaded:downloadCandidates.length,
      visuallyReviewed:reviewable.filter(x=>x.review.status==='reviewed').length,
      visuallyApproved:approvedDownloaded.length,
      providers:[...new Set(reviewable.map(x=>x.review.provider).filter(Boolean))],
      subjects:[...new Set(reviewable.flatMap(x=>x.review.subjects||[]))].slice(0,10),
      queries:referencePlan.queries||[referencePlan.query].filter(Boolean),
      searchRounds:Number(referencePlan.searchRounds||1),
      catalogCharacters:Array.isArray(referencePlan.catalogCharacters)?referencePlan.catalogCharacters:[]
    };
    const postprocessPlan=mediaPostprocessPlan({
      kind:'image',
      prompt:sourcePrompt,
      style,
      identitySensitive:needsStrongIdentity,
      hasReferences:inlineReferences.length>0||referencePlan.references.length>0
    });
    const unityImageGuidance=/\b(unity|unity3d|game environment|game scene|voxel|3d scene|level design|game asset)\b/i.test(sourcePrompt)
      ? '\n\n3D SCENE CONTRACT:\n'+unityFabricContext()
      : '';
    const providerPrompt=groundedPrompt+
      (userInline.length
        ? '\n\nUSER-SUPPLIED REFERENCE LOCK: '+userInline.length+' reference image(s) were supplied directly by the user. They have the highest visual priority for identity, face/body design, costume, colors, silhouette and requested form.'
        : '')+
      (identityMemoryInline.length
        ? '\n\nPERSISTENT VISUAL ID MEMORY: '+identityMemoryInline.length+' previously approved PredictLM generation is attached. Preserve the same identity/form traits across the new scene while obeying the new action/composition.'
        : '')+
      (searchedInline.length
        ? '\n\nAUTOMATIC VISUAL GROUNDING: '+searchedInline.length+' downloaded reference image(s) passed the automatic usefulness filter and should control canonical identity/forms more strongly than textual style expansion.'
        : '')+
      unityImageGuidance+'\n\n'+mediaQualityDirectives({
          kind:'image',
          prompt:sourcePrompt,
          style,
          identitySensitive:needsStrongIdentity,
          hasReferences:inlineReferences.length>0||referencePlan.references.length>0
        });

    const mediaBase=String(process.env.MEDIA_IMAGE_BASE_URL||'').trim();
    const mediaKey=String(process.env.MEDIA_IMAGE_API_KEY||'').trim();
    const gatewayKey=String(process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN||'').trim();
    const gatewayBase=String(process.env.AI_GATEWAY_BASE_URL||'https://ai-gateway.vercel.sh/v1').trim().replace(/\/$/,'');
    const gatewayImageModels=String(process.env.PREDICTLM_GATEWAY_IMAGE_MODELS||'google/gemini-3.1-flash-image,spacexai/grok-imagine-image')
      .split(',').map(x=>x.trim()).filter(Boolean);
    const mediaReferenceField=String(process.env.MEDIA_IMAGE_REFERENCE_FIELD||'').trim();
    const mediaNegativeField=String(process.env.MEDIA_IMAGE_NEGATIVE_FIELD||'').trim();
    const geminiKey=String(process.env.GEMINI_API_KEY||'').trim();
    const geminiBase=String(process.env.GEMINI_IMAGE_BASE_URL||'https://generativelanguage.googleapis.com/v1beta').trim().replace(/\/$/,'');
    const geminiModel=String(process.env.GEMINI_IMAGE_MODEL||'gemini-3.1-flash-image').trim();
    const nanoKey=String(process.env.NANO_BANANA_API_KEY||'').trim();
    const nanoBase=String(process.env.NANO_BANANA_BASE_URL||'https://nanobanana.aikit.club').trim();
    const requestedModel=String(body?.model||process.env.MEDIA_IMAGE_MODEL||'flux').trim();
    const nanoModel=String(process.env.NANO_BANANA_MODEL||'nano-banana').trim();
    const order=String(process.env.PREDICTLM_IMAGE_PROVIDER_ORDER||'gemini,vercel-gateway,comfyui,nano,configured')
      .split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
    if(geminiKey&&!order.includes('gemini'))order.unshift('gemini');

    // Vercel-hosted PredictLM can use the automatically injected OIDC token
    // for AI Gateway image generation. Multimodal Gemini uses Chat Completions
    // for text-to-image; image-only models use Images; both can use /images/edits
    // when visual references are available.
    if(order.includes('vercel-gateway')&&gatewayKey&&!avoidProviders.has('vercel-gateway-image')){
      const gatewayReferenceValues=[
        ...userInline.map(x=>'data:'+x.mimeType+';base64,'+x.data),
        ...identityMemoryInline.map(x=>'data:'+x.mimeType+';base64,'+x.data),
        ...referencePlan.references.map(x=>x.imageUrl)
      ].filter(Boolean).slice(0,4);

      for(const gatewayModel of gatewayImageModels){
        try{
          const isGeminiMultimodal=/^google\/gemini-3\.1-flash-image(?:$|[-/])/i.test(gatewayModel);
          const canEdit=/^(?:google\/gemini-3\.1-flash-image|spacexai\/grok-imagine-image|openai\/gpt-image-2|bfl\/flux-kontext)/i.test(gatewayModel);
          let endpoint='/images/generations';
          let requestBody:any={
            model:gatewayModel,
            prompt:providerPrompt,
            n:1,
            response_format:'b64_json'
          };

          if(gatewayReferenceValues.length&&canEdit){
            endpoint='/images/edits';
            requestBody={
              model:gatewayModel,
              prompt:providerPrompt,
              images:gatewayReferenceValues.map(image_url=>({image_url}))
            };
          }else if(isGeminiMultimodal){
            endpoint='/chat/completions';
            requestBody={
              model:gatewayModel,
              messages:[{role:'user',content:providerPrompt}]
            };
          }

          const upstream=await fetch(gatewayBase+endpoint,{
            method:'POST',
            headers:{
              'Content-Type':'application/json',
              'Authorization':'Bearer '+gatewayKey
            },
            body:JSON.stringify(requestBody),
            signal:AbortSignal.timeout(90000)
          });
          const data=await upstream.json().catch(()=>({}));
          if(!upstream.ok)continue;

          let imageUrl='';
          if(endpoint==='/chat/completions'){
            const images=Array.isArray(data?.choices?.[0]?.message?.images)?data.choices[0].message.images:[];
            imageUrl=String(images?.[0]?.image_url?.url||images?.[0]?.url||'');
          }else{
            const first=data?.data?.[0]||{};
            imageUrl=first?.b64_json?'data:image/png;base64,'+first.b64_json:String(first?.url||data?.url||'');
          }
          if(!imageUrl)continue;

          const referenceImagesPassed=endpoint==='/images/edits'?gatewayReferenceValues.length:0;
          return Response.json({
            url:imageUrl,
            provider:'vercel-gateway-image',
            model:gatewayModel,
            width,height,seed,
            identityLocked:true,
            referenceQuery:referencePlan.query||null,
            referencesUsed:referencePlan.references.map(x=>({provider:x.provider,title:x.title,sourceUrl:x.sourceUrl,site:x.site})),
            referenceImagesPassed,
            userReferenceCount:userInline.length,
            identityMemoryReferenceCount:identityMemoryInline.length,
            searchedReferenceCount:searchedInline.length,
            bestImagePlan:{identityKey:bestImagePlan.identityKey,subjects:bestImagePlan.subjects.map(x=>x.label),candidateIndex,candidateCount},
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
            fidelityLimited:needsStrongIdentity&&referenceImagesPassed===0,
            providerWarning:needsStrongIdentity&&referenceImagesPassed===0
              ? 'AI Gateway gerou a imagem sem consumir pixels de referência nesta tentativa; a revisão semântica decide a identidade.'
              : null,
            postprocessPlan
          });
        }catch{
          // Try the next Gateway image model, then the remaining providers.
        }
      }
    }

    const comfy=comfyImageConfig();
    const comfyReferenceTransportPotential=inlineReferences.length>0&&(
      comfy.workflow.includes('{{REFERENCE_1_FILENAME}}')||
      comfy.workflow.includes('{{IMAGE_FILENAME}}')
    );
    const comfyDecision=identityProviderDecision({
      providerId:'comfyui',
      identitySensitive:needsStrongIdentity,
      strictIdentityProvider,
      requireReferenceTransport,
      referenceEvidenceAvailable,
      canTransportReferences:comfyReferenceTransportPotential,
      avoidProviders
    });
    const comfyBlockedByIdentity=!comfyDecision.allowed;
    if(order.includes('comfyui')&&comfy.enabled&&!comfyBlockedByIdentity){
      try{
        const comfyResult=await runComfyImageWorkflow({
          prompt:providerPrompt,
          negativePrompt,
          width,
          height,
          seed,
          references:inlineReferences,
          timeoutMs:42000
        });
        const comfyReferenceTransport=comfyReferenceTransportPotential;
        const fidelityWarning=needsStrongIdentity
          ? referencePlan.references.length===0&&userInline.length===0
            ? 'Pedido de alta fidelidade sem referência visual disponível; o workflow ComfyUI depende do modelo e do prompt.'
            : inlineReferences.length>0&&!comfyReferenceTransport
              ? 'Referências foram preparadas, mas o workflow ComfyUI não expõe token de imagem de referência; o grounding ficou textual.'
              : ''
          : '';
        return Response.json({
          url:comfyResult.dataUrl,
          provider:'comfyui',
          model:String(process.env.COMFYUI_IMAGE_MODEL||requestedModel||'workflow'),
          workflowPromptId:comfyResult.promptId,
          width,height,seed,
          identityLocked:true,
          referenceQuery:referencePlan.query||null,
          referencesUsed:referencePlan.references.map(x=>({provider:x.provider,title:x.title,sourceUrl:x.sourceUrl,site:x.site})),
          referenceImagesPassed:comfyReferenceTransport?inlineReferences.length:0,
          userReferenceCount:userInline.length,
          identityMemoryReferenceCount:identityMemoryInline.length,
          searchedReferenceCount:searchedInline.length,
          bestImagePlan:{identityKey:bestImagePlan.identityKey,subjects:bestImagePlan.subjects.map(x=>x.label),candidateIndex,candidateCount},
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
          providerWarning:fidelityWarning||null,
          postprocessPlan
        });
      }catch{
        // ComfyUI is optional. Continue through the remaining providers.
      }
    }

    const providers=[
      ...(order.includes('gemini')&&geminiKey?[{id:'gemini-nano-banana-2',base:geminiBase,key:geminiKey,model:geminiModel,nano:false,gemini:true}]:[]),
      ...(order.includes('nano')&&nanoKey?[{id:'nano-banana',base:nanoBase,key:nanoKey,model:nanoModel,nano:true,gemini:false}]:[]),
      ...(order.includes('configured')&&mediaBase?[{id:'configured-image',base:mediaBase,key:mediaKey,model:requestedModel,nano:false,gemini:false}]:[])
    ].filter(provider=>!avoidProviders.has(provider.id));

    for(const provider of providers){
      try{
        const url=provider.gemini
          ? provider.base+'/models/'+encodeURIComponent(provider.model)+':generateContent'
          : provider.base.replace(/\/$/,'')+(provider.base.endsWith('/v1')?'/images/generations':'/v1/images/generations');

        const configuredReferenceValues=[
          ...userInline.map(x=>'data:'+x.mimeType+';base64,'+x.data),
          ...referencePlan.references.map(x=>x.imageUrl)
        ].slice(0,4);
        const canTransportReferences=provider.gemini
          ? inlineReferences.length>0
          : provider.id==='configured-image'&&!!mediaReferenceField&&configuredReferenceValues.length>0;
        const providerDecision=identityProviderDecision({
          providerId:provider.id,
          identitySensitive:needsStrongIdentity,
          strictIdentityProvider,
          requireReferenceTransport,
          referenceEvidenceAvailable,
          canTransportReferences,
          avoidProviders
        });
        if(!providerDecision.allowed)continue;

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
            identityMemoryReferenceCount:identityMemoryInline.length,
            searchedReferenceCount:searchedInline.length,
            bestImagePlan:{identityKey:bestImagePlan.identityKey,subjects:bestImagePlan.subjects.map(x=>x.label),candidateIndex,candidateCount},
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
            providerWarning:fidelityWarning||null,
            postprocessPlan
          });
        }
      }catch{
        // Continue to the next configured provider; public fallback remains available.
      }
    }

    // O fallback textual continua recebendo o identity lock. Referências visuais reais
    // exigem Gemini multimodal ou um provider configurado com MEDIA_IMAGE_REFERENCE_FIELD.
    const automaticReferenceUrls=[...new Set([
      ...searchedReferenceUrls,
      ...referencePlan.references.map(x=>x.imageUrl).filter(Boolean)
    ])].slice(0,3);
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
      identityMemoryReferenceCount:identityMemoryInline.length,
      bestImagePlan:{identityKey:bestImagePlan.identityKey,subjects:bestImagePlan.subjects.map(x=>x.label),candidateIndex,candidateCount},
      identityProviderPolicy:{requireReferenceTransport,strictIdentityProvider,blockedTextOnlyNano:needsStrongIdentity&&strictIdentityProvider},
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
      postprocessPlan,
      providerWarning:referenceCapableFallback
        ? 'Fallback de personagem usa modelo image-to-image com transporte de referência configurado; a revisão semântica valida o resultado antes de persistir.'
        : wantsReferenceFallback
          ? 'O PredictLM encontrou referências e tentou um modelo image-to-image, mas não há transporte de referência autenticado/configurado para afirmar que o provider consumiu esses pixels; a revisão semântica decide se o resultado é aceitável.'
          : 'Fallback público ativo e nenhuma referência visual automática utilizável foi recuperada nesta tentativa.'
    });
  }catch(error:any){
    return Response.json({
      error:INVALID_IMAGE_PROVIDER_MESSAGE,
      detail:mediaErrorText(error,'Falha ao gerar imagem.')
    },{status:500});
  }
}
