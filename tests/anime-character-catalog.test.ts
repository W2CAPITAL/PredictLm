import test from 'node:test';
import assert from 'node:assert/strict';
import {animeCharacterSearchTerms,resolveAnimeCharacterCatalog} from '../src/lib/media/anime-character-catalog';

test('anime catalog decomposes Naruto matchup into separate character identities',()=>{
  const terms=animeCharacterSearchTerms('Naruto modo Kurama vs Sasuke Susanoo perfeito');
  assert.deepEqual(terms,['Naruto Uzumaki','Sasuke Uchiha','Kurama']);
});

test('anime catalog canonicalizes Freeza to AniList Frieza search',()=>{
  assert.deepEqual(animeCharacterSearchTerms('crie o Freeza de Dragon Ball'),['Frieza']);
});

test('AniList resolver uses franchise context to disambiguate homonymous characters',async()=>{
  const originalFetch=globalThis.fetch;
  globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
    const url=String(input);
    assert.equal(url,'https://graphql.anilist.co');
    const body=JSON.parse(String(init?.body||'{}'));
    const term=String(body?.variables?.search||'');
    if(term==='Kurama'){
      return Response.json({data:{Page:{characters:[
        {
          id:1,
          name:{full:'Kurama',native:'蔵馬',alternative:['Shuichi Minamino']},
          image:{large:'https://s4.anilist.co/file/anilistcdn/character/large/b1.jpg'},
          siteUrl:'https://anilist.co/character/1/Kurama',
          media:{nodes:[{id:10,title:{english:'Yu Yu Hakusho',romaji:'Yuu Yuu Hakusho',native:''}}]}
        },
        {
          id:2,
          name:{full:'Kurama',native:'九喇嘛',alternative:['Nine-Tails']},
          image:{large:'https://s4.anilist.co/file/anilistcdn/character/large/b2.jpg'},
          siteUrl:'https://anilist.co/character/2/Kurama',
          media:{nodes:[{id:20,title:{english:'Naruto Shippuden',romaji:'Naruto: Shippuuden',native:'ナルト'}}]}
        }
      ]}}});
    }
    const id=term==='Naruto Uzumaki'?3:4;
    return Response.json({data:{Page:{characters:[{
      id,
      name:{full:term,native:'',alternative:[]},
      image:{large:'https://s4.anilist.co/file/anilistcdn/character/large/b'+id+'.jpg'},
      siteUrl:'https://anilist.co/character/'+id,
      media:{nodes:[{id:30,title:{english:'Naruto Shippuden',romaji:'Naruto: Shippuuden',native:''}}]}
    }]}}});
  }) as typeof fetch;

  try{
    const result=await resolveAnimeCharacterCatalog('Naruto modo Kurama vs Sasuke Susanoo');
    assert.equal(result.hits.length,3);
    const kurama=result.hits.find(x=>x.name==='Kurama');
    assert.equal(kurama?.id,2);
    assert.ok(kurama?.mediaTitles.some(x=>/Naruto/i.test(x)));
  }finally{
    globalThis.fetch=originalFetch;
  }
});
