export type ApiSpendMode='safe'|'balanced'|'quality';
export type ApiSpendSurface='chat'|'stream'|'cognitive'|'clean-chat'|'vision'|'image'|'media-director';

function intEnv(name:string,fallback:number,min=0,max=20){
  const raw=Number(process.env[name]);
  if(!Number.isFinite(raw))return fallback;
  return Math.max(min,Math.min(max,Math.floor(raw)));
}

export function apiSpendMode():ApiSpendMode{
  const raw=String(process.env.PREDICTLM_API_SPEND_MODE||'safe').trim().toLowerCase();
  return raw==='quality'?'quality':raw==='balanced'?'balanced':'safe';
}

const DEFAULTS:Record<ApiSpendMode,Record<ApiSpendSurface,number>>={
  safe:{
    chat:2,
    stream:2,
    cognitive:2,
    'clean-chat':1,
    vision:1,
    image:2,
    'media-director':1
  },
  balanced:{
    chat:3,
    stream:3,
    cognitive:3,
    'clean-chat':2,
    vision:2,
    image:3,
    'media-director':2
  },
  quality:{
    chat:4,
    stream:4,
    cognitive:4,
    'clean-chat':3,
    vision:3,
    image:4,
    'media-director':3
  }
};

const ENV_BY_SURFACE:Record<ApiSpendSurface,string>={
  chat:'PREDICTLM_CHAT_PROVIDER_ATTEMPTS',
  stream:'PREDICTLM_STREAM_PROVIDER_ATTEMPTS',
  cognitive:'PREDICTLM_COGNITIVE_PROVIDER_ATTEMPTS',
  'clean-chat':'PREDICTLM_CLEAN_PROVIDER_ATTEMPTS',
  vision:'PREDICTLM_VISION_PROVIDER_ATTEMPTS',
  image:'PREDICTLM_IMAGE_PROVIDER_ATTEMPTS',
  'media-director':'PREDICTLM_MEDIA_DIRECTOR_PROVIDER_ATTEMPTS'
};

export function providerAttemptLimit(surface:ApiSpendSurface){
  const fallback=DEFAULTS[apiSpendMode()][surface];
  return intEnv(ENV_BY_SURFACE[surface],fallback,1,8);
}

export function mediaReferenceReviewLimit(){
  const fallback=apiSpendMode()==='quality'?2:1;
  return intEnv('PREDICTLM_VISUAL_REFERENCE_REVIEW_MAX',fallback,0,3);
}

export function mediaCandidateLimit(){
  const fallback=apiSpendMode()==='quality'?2:1;
  return intEnv('PREDICTLM_MEDIA_CANDIDATE_LIMIT',fallback,1,3);
}

export function mediaAutoRepairLimit(){
  const fallback=apiSpendMode()==='quality'?1:0;
  return intEnv('PREDICTLM_MEDIA_AUTO_REPAIR_LIMIT',fallback,0,2);
}

export function cleanRepairEnabled(){
  const explicit=String(process.env.PREDICTLM_CLEAN_REPAIR||'').trim().toLowerCase();
  if(explicit)return /^(1|true|yes|on)$/.test(explicit);
  return apiSpendMode()==='quality';
}

export function agenticReviewEnabled(deep:boolean){
  const explicit=String(process.env.PREDICTLM_AGENTIC_REVIEW||'').trim().toLowerCase();
  if(explicit)return /^(1|true|yes|on)$/.test(explicit);
  return apiSpendMode()==='quality'&&deep;
}

export function remoteCaptionEnabled(){
  return /^(1|true|yes|on)$/i.test(String(process.env.PREDICTLM_REMOTE_MEDIA_CAPTIONS||'false'));
}

export function backgroundRemoteCallsEnabled(){
  return /^(1|true|yes|on)$/i.test(String(process.env.PREDICTLM_BACKGROUND_REMOTE_CALLS||'false'));
}

export function spendPolicySnapshot(){
  return {
    mode:apiSpendMode(),
    attempts:{
      chat:providerAttemptLimit('chat'),
      stream:providerAttemptLimit('stream'),
      cognitive:providerAttemptLimit('cognitive'),
      cleanChat:providerAttemptLimit('clean-chat'),
      vision:providerAttemptLimit('vision'),
      image:providerAttemptLimit('image'),
      mediaDirector:providerAttemptLimit('media-director')
    },
    media:{
      referenceReviews:mediaReferenceReviewLimit(),
      candidates:mediaCandidateLimit(),
      autoRepairs:mediaAutoRepairLimit(),
      remoteCaptions:remoteCaptionEnabled()
    },
    cleanRepair:cleanRepairEnabled(),
    backgroundRemoteCalls:backgroundRemoteCallsEnabled()
  };
}
