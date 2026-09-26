export type InfluencerPostKind='PHOTO'|'CAROUSEL'|'REEL'|'STORY';

export interface VirtualInfluencerProfile{
  id:string;
  displayName:string;
  adultAge:number;
  identityRule:string;
  visualAnchors:string[];
  palette:string[];
  wardrobe:string[];
  makeup:string[];
  voice:string[];
  tone:string[];
  disclosure:string;
  handleCandidates:string[];
  bio:string;
}

export interface InfluencerCampaignInput{
  prompt?:string;
  days?:number;
  locale?:string;
  referenceImageCount?:number;
}

export interface InfluencerContentItem{
  day:number;
  kind:InfluencerPostKind;
  pillar:string;
  hook:string;
  concept:string;
  generationPrompt:string;
  captionAngle:string;
  cta:string;
  aiDisclosure:boolean;
}

export const LUXURY_GOTH_PROFILE:VirtualInfluencerProfile={
  id:'vesper-noire',
  displayName:'Vesper Noire',
  adultAge:23,
  identityRule:'Fictional adult virtual creator. Preserve the same face geometry, hair silhouette, makeup language, body proportions and signature accessories across every post. Use reference images for aesthetic guidance only; do not copy a real person as an exact identity.',
  visualAnchors:[
    'long glossy black hair',
    'straight blunt bangs',
    'porcelain/cool-toned editorial makeup',
    'precise black eyeliner with soft pink lips',
    'black couture silhouette',
    'silver hardware and layered chokers',
    'occasional black-and-white striped sleeve accent',
    'luxury gothic editorial styling'
  ],
  palette:['black','charcoal','silver','deep wine','ivory highlight'],
  wardrobe:[
    'tailored black corset or fitted top',
    'structured black jacket or cape',
    'silver chain and hardware details',
    'platform boots',
    'lace, leather and satin used selectively'
  ],
  makeup:[
    'porcelain matte base',
    'cool pink blush kept subtle',
    'sharp black liner',
    'clean dark lashes',
    'soft rose or muted wine lip'
  ],
  voice:[
    'synthetic or explicitly authorized voice only',
    'Brazilian Portuguese by default',
    'calm low-mid register',
    'elegant, slightly mysterious delivery',
    'natural conversational pacing'
  ],
  tone:['minimal','confident','fashion-forward','slightly mysterious','never robotic'],
  disclosure:'virtual creator / AI-generated media',
  handleCandidates:['@vesper.noire.ai','@vespernoire.virtual','@noire.vesper.ai'],
  bio:'Vesper Noire · virtual creator\nLuxury goth • dark couture • night city\nAI-generated character · BR'
};

function normalize(input:string){
  return String(input||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim();
}

export function isInfluencerStudioRequest(prompt:string){
  const q=normalize(prompt);
  if(!q)return false;
  const social=/\b(instagram|reels?|stories?|tiktok|social media|rede social|influenciador|influenciadora|creator|criadora de conteudo|criador de conteudo|perfil social)\b/.test(q);
  const campaign=/\b(campanha|postar|publicar|conteudo|conteudo viral|engajamento|seguidores|bio|feed|dancinha|trend|viral|alcance)\b/.test(q);
  return social&&(campaign||/\b(crie|criar|monte|configure|automatize|gerencie)\b/.test(q));
}

export function influencerStudioContext(prompt:string){
  if(!isInfluencerStudioRequest(prompt))return '';
  return [
    'AI INFLUENCER STUDIO — social creator orchestration.',
    'Treat the creator as one persistent fictional adult persona, not a rotating set of faces.',
    'Default profile when the user asks for luxury gothic: '+LUXURY_GOTH_PROFILE.displayName+' (23+, fictional virtual creator).',
    'Visual lock: '+LUXURY_GOTH_PROFILE.visualAnchors.join('; ')+'.',
    'Use uploaded references as aesthetic/composition guidance while preserving a distinct fictional identity unless the user explicitly owns/controls the depicted identity and asks for an edit.',
    'Production loop: brand lock -> content idea -> image/video brief -> continuity check -> caption -> optional synthetic voice -> edit -> publishing manifest -> analytics feedback.',
    'For realistic generated posts, mark AI-generated content when the target platform requires disclosure.',
    'Voice must be synthetic or explicitly authorized; never clone an uninvolved real person.',
    'Growth must be organic: useful niche comments, collaborations, remixable formats, trend participation, search/hashtag optimization and cross-posting. Do not automate mass comments, fake engagement, purchased followers or deceptive impersonation.',
    'Use JEV routing/compaction internally: preserve exact identity anchors and current campaign facts; compact only stale/irrelevant campaign history.',
    'Prefer 9:16 for Reels/Stories and 4:5 for feed portraits. Keep the same face/hair/accessories across sequences and vary scene, pose, outfit details and camera language instead of identity.',
    'When publishing is not connected, return a complete review-ready queue and say publishing is pending rather than claiming it happened.',
    'Current request: '+String(prompt||'').slice(0,900)
  ].join('\n');
}

function imagePrompt(concept:string,kind:InfluencerPostKind){
  const ratio=kind==='REEL'||kind==='STORY'?'vertical 9:16':'portrait 4:5';
  return [
    'Photorealistic luxury gothic fashion editorial of one consistent fictional adult woman, age 23.',
    LUXURY_GOTH_PROFILE.identityRule,
    'Identity anchors: '+LUXURY_GOTH_PROFILE.visualAnchors.join(', ')+'.',
    'Palette: '+LUXURY_GOTH_PROFILE.palette.join(', ')+'.',
    'Concept: '+concept+'.',
    'Composition: '+ratio+', premium Instagram photography, realistic skin texture, coherent hands, natural anatomy, controlled highlights, expensive materials, intentional background depth.',
    'Do not change facial identity, hair silhouette or signature silver/choker language between posts. No watermark, no random text, no extra fingers, no duplicate person.'
  ].join(' ');
}

function videoPrompt(concept:string){
  return [
    imagePrompt(concept,'REEL'),
    'Create a 7-12 second coherent fashion Reel with one continuous identity.',
    'Movement: one simple repeatable dance or runway gesture, subtle hair/fabric secondary motion, stable face and hands, no abrupt morphing.',
    'Camera: controlled handheld or slow dolly, one clear hook in the first second, loop-friendly ending.',
    'Audio: choose platform-licensed trending audio at publish time; do not bake copyrighted music into the generated master.'
  ].join(' ');
}

const CONTENT_LIBRARY=[
  {pillar:'Dark couture',hook:'O look parece caro antes mesmo de você ver a etiqueta.',concept:'night lobby of a luxury hotel, black satin and silver hardware, slow confident walk'},
  {pillar:'Night city',hook:'POV: você saiu para comprar café e virou editorial.',concept:'rainy neon city street after midnight, umbrella, reflective pavement, black tailored coat'},
  {pillar:'Beauty',hook:'Gothic makeup, but make it couture.',concept:'close beauty portrait at a marble vanity, eyeliner detail, silver earrings, soft rose lip'},
  {pillar:'Trend Reel',hook:'A trend, só que em versão dark luxury.',concept:'minimal 8-second dance in a black marble corridor, controlled movement, couture styling'},
  {pillar:'Accessories',hook:'O detalhe que muda o look inteiro.',concept:'macro-to-portrait transition featuring choker, rings and silver chains, clean studio lighting'},
  {pillar:'Lifestyle',hook:'Meu tipo de domingo.',concept:'luxury cafe by a window, black knit, silver jewelry, fashion magazine and espresso'},
  {pillar:'Virtual BTS',hook:'Como uma garota virtual escolhe o próximo look?',concept:'editorial dressing-room scene with garment rack, mirror light, dark couture selection'}
] as const;

export function createInfluencerCampaignPlan(input:InfluencerCampaignInput={}){
  const days=Math.max(3,Math.min(30,Math.floor(Number(input.days)||7)));
  const locale=String(input.locale||'pt-BR');
  const prompt=String(input.prompt||'').trim();
  const rows:InfluencerContentItem[]=[];
  for(let i=0;i<days;i++){
    const src=CONTENT_LIBRARY[i%CONTENT_LIBRARY.length];
    const kind:InfluencerPostKind=i%3===0?'REEL':i%3===1?'PHOTO':'CAROUSEL';
    const concept=src.concept+(prompt?' · campaign note: '+prompt.slice(0,220):'');
    rows.push({
      day:i+1,
      kind,
      pillar:src.pillar,
      hook:src.hook,
      concept,
      generationPrompt:kind==='REEL'?videoPrompt(concept):imagePrompt(concept,kind),
      captionAngle:'Short first-person caption in '+locale+', natural and specific; avoid generic AI marketing language.',
      cta:i%2===0?'Pergunta curta e genuína para incentivar comentário.':'CTA leve para salvar/compartilhar, sem pressão.',
      aiDisclosure:true
    });
  }
  return {
    profile:LUXURY_GOTH_PROFILE,
    referenceImageCount:Math.max(0,Number(input.referenceImageCount)||0),
    cadence:{
      reelsPerWeek:5,
      feedPostsPerWeek:4,
      storiesPerDay:'2-4',
      rule:'Quality/identity consistency beats raw volume. Reuse shoots as Story crops and carousel details.'
    },
    content:rows,
    engagement:{
      daily:'10-15 genuinely relevant comments on goth/fashion/alt-makeup/music creator posts; each comment must refer to something specific in the post.',
      collaborations:'Use collab posts, remixes and creator-tagged outfit inspiration when permission/attribution is appropriate.',
      prohibited:['mass automated comments','copy-paste replies','fake likes/followers','engagement pods presented as organic','impersonating a real person']
    },
    publishing:{
      preferredFeedRatio:'4:5',
      preferredReelRatio:'9:16',
      aiDisclosure:true,
      status:'review-ready',
      note:'A connected social publisher is required for automatic posting.'
    }
  };
}

export function buildPublisherManifest(item:InfluencerContentItem,mediaUrl:string,caption:string){
  return {
    provider:'instagram',
    type:item.kind==='PHOTO'||item.kind==='CAROUSEL'?'POST':item.kind,
    media:[String(mediaUrl||'').trim()].filter(Boolean),
    text:String(caption||'').trim(),
    isAiGenerated:true,
    showReelOnFeed:item.kind==='REEL',
    contentPillar:item.pillar,
    identityId:LUXURY_GOTH_PROFILE.id
  };
}
