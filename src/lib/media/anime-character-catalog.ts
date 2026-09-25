import {compactText} from '@/lib/token-budget';
import {extractRequestedNamedSubject,isAnimeFranchisePrompt} from '@/lib/media/media-fidelity';

export interface AnimeCharacterCatalogHit{
  provider:'anilist';
  id:number;
  name:string;
  nativeName:string;
  aliases:string[];
  imageUrl:string;
  siteUrl:string;
  mediaTitles:string[];
  score:number;
}

function normalize(input:string){
  return String(input||'')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ')
    .trim();
}

export function animeCharacterSearchTerms(input:string){
  const raw=String(input||'').trim();
  const p=normalize(raw);
  const terms:string[]=[];

  const push=(value:string)=>{const v=value.trim();if(v&&!terms.some(x=>normalize(x)===normalize(v)))terms.push(v)};

  if(/\bnaruto\b/.test(p))push('Naruto Uzumaki');
  if(/\bsasuke\b/.test(p))push('Sasuke Uchiha');
  if(/\bkurama\b|\bkyuubi\b|\bkyubi\b|\bnine tails\b|\bnove caudas\b/.test(p))push('Kurama');
  if(/\b(freeza|frieza)\b/.test(p))push('Frieza');
  if(/\bvegeta\b/.test(p))push('Vegeta');
  if(/\bbroly\b/.test(p))push('Broly');
  if(/\bgohan\b/.test(p))push('Gohan');
  if(/\bgoku\b/.test(p)&&!/\b(bijuu|besta de caudas|quatro caudas|four tails)\b/.test(p))push('Son Goku');
  if(/\b(bijuu|besta de caudas|quatro caudas|four tails)\b/.test(p)&&/\bnaruto\b/.test(p))push('Son Goku');
  if(/\bpikachu\b/.test(p))push('Pikachu');

  if(!terms.length&&isAnimeFranchisePrompt(raw)){
    const named=extractRequestedNamedSubject(raw);
    if(named)push(named);
  }

  return terms.slice(0,5);
}

function franchiseHints(input:string){
  const p=normalize(input);
  const hints:string[]=[];
  if(/\bnaruto\b|\bsasuke\b|\bkurama\b|\bsusanoo\b|\bbijuu\b|\buzumaki\b|\buchiha\b/.test(p))hints.push('naruto');
  if(/\bdragon ball\b|\bfreeza\b|\bfrieza\b|\bvegeta\b|\bbroly\b|\bgohan\b|\boozaru\b|\bgreat ape\b/.test(p))hints.push('dragon ball');
  if(/\bpokemon\b|\bpikachu\b/.test(p))hints.push('pokemon');
  return hints;
}

async function searchAniListCharacter(term:string,input:string):Promise<AnimeCharacterCatalogHit[]>{
  const query=`
    query PredictLMCharacterSearch($search: String) {
      Page(page: 1, perPage: 8) {
        characters(search: $search, sort: [SEARCH_MATCH]) {
          id
          name { full native alternative }
          image { large medium }
          siteUrl
          media(perPage: 8, sort: [POPULARITY_DESC]) {
            nodes {
              id
              title { romaji english native }
            }
          }
        }
      }
    }
  `;

  const response=await fetch('https://graphql.anilist.co',{
    method:'POST',
    headers:{'Content-Type':'application/json','Accept':'application/json'},
    body:JSON.stringify({query,variables:{search:term}}),
    cache:'no-store',
    signal:AbortSignal.timeout(8500)
  });
  if(!response.ok)throw new Error('AniList '+response.status);
  const data=await response.json().catch(()=>({}));
  const rows=Array.isArray(data?.data?.Page?.characters)?data.data.Page.characters:[];
  const hints=franchiseHints(input);

  return rows.map((row:any)=>{
    const name=String(row?.name?.full||term).trim();
    const nativeName=String(row?.name?.native||'').trim();
    const aliases=(Array.isArray(row?.name?.alternative)?row.name.alternative:[])
      .map((x:any)=>String(x||'').trim()).filter(Boolean).slice(0,12);
    const mediaTitles=(Array.isArray(row?.media?.nodes)?row.media.nodes:[])
      .flatMap((m:any)=>[m?.title?.english,m?.title?.romaji,m?.title?.native])
      .map((x:any)=>String(x||'').trim()).filter(Boolean);
    const imageUrl=String(row?.image?.large||row?.image?.medium||'').trim();
    const siteUrl=String(row?.siteUrl||('https://anilist.co/character/'+row?.id)).trim();
    const hay=normalize([name,nativeName,...aliases,...mediaTitles].join(' '));
    const termTokens=normalize(term).split(/\s+/).filter(Boolean);
    let score=termTokens.reduce((sum,t)=>sum+(hay.includes(t)?2:0),0);
    for(const hint of hints)if(hay.includes(hint))score+=5;
    if(normalize(name)===normalize(term))score+=5;
    if(imageUrl)score+=2;
    return {
      provider:'anilist' as const,
      id:Number(row?.id)||0,
      name,nativeName,aliases,imageUrl,siteUrl,mediaTitles,score
    };
  }).filter((x:AnimeCharacterCatalogHit)=>x.id&&x.imageUrl)
    .sort((a:AnimeCharacterCatalogHit,b:AnimeCharacterCatalogHit)=>b.score-a.score);
}

export async function resolveAnimeCharacterCatalog(input:string){
  const terms=animeCharacterSearchTerms(input);
  if(!terms.length)return {terms,hits:[] as AnimeCharacterCatalogHit[],warnings:[] as string[]};

  const warnings:string[]=[];
  const settled=await Promise.allSettled(terms.map(term=>searchAniListCharacter(term,input)));
  const hits:AnimeCharacterCatalogHit[]=[];
  settled.forEach((result,index)=>{
    if(result.status==='fulfilled'&&result.value.length){
      hits.push(result.value[0]);
    }else if(result.status==='rejected'){
      warnings.push('AniList · '+terms[index]+': '+String((result.reason as any)?.message||result.reason||'indisponível'));
    }
  });

  const seen=new Set<number>();
  return {
    terms,
    hits:hits.filter(hit=>{
      if(seen.has(hit.id))return false;
      seen.add(hit.id);
      return true;
    }).slice(0,5),
    warnings
  };
}

export function animeCatalogGroundingText(hits:AnimeCharacterCatalogHit[]){
  if(!hits.length)return '';
  return compactText([
    'ANIME CHARACTER CATALOG IDENTITY:',
    ...hits.map((hit,index)=>{
      const aliases=[hit.nativeName,...hit.aliases].filter(Boolean).slice(0,5).join(', ');
      const media=hit.mediaTitles.slice(0,5).join(', ');
      return `CAT[${index+1}] ${hit.name}${aliases?' · aliases: '+aliases:''}${media?' · media: '+media:''} · AniList #${hit.id}`;
    }),
    'Use catalog identity only to disambiguate names/franchise and select visual references; generated pixels still require semantic verification.'
  ].join('\n'),1800);
}
