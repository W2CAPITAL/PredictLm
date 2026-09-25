export interface LegalTribunalOption{
  sigla:string;
  alias:string;
  group:'superior'|'federal'|'estadual'|'trabalho'|'eleitoral'|'militar';
}

const state=[
  ['TJAC','tjac'],['TJAL','tjal'],['TJAM','tjam'],['TJAP','tjap'],['TJBA','tjba'],['TJCE','tjce'],
  ['TJDFT','tjdft'],['TJES','tjes'],['TJGO','tjgo'],['TJMA','tjma'],['TJMG','tjmg'],['TJMS','tjms'],
  ['TJMT','tjmt'],['TJPA','tjpa'],['TJPB','tjpb'],['TJPE','tjpe'],['TJPI','tjpi'],['TJPR','tjpr'],
  ['TJRJ','tjrj'],['TJRN','tjrn'],['TJRO','tjro'],['TJRR','tjrr'],['TJRS','tjrs'],['TJSC','tjsc'],
  ['TJSE','tjse'],['TJSP','tjsp'],['TJTO','tjto']
] as const;

const tre=[
  ['TREAC','treac'],['TREAL','treal'],['TREAM','tream'],['TREAP','treap'],['TREBA','treba'],['TRECE','trece'],
  ['TREDF','tredf'],['TREES','trees'],['TREGO','trego'],['TREMA','trema'],['TREMG','tremg'],['TREMS','trems'],
  ['TREMT','tremt'],['TREPA','trepa'],['TREPB','trepb'],['TREPE','trepe'],['TREPI','trepi'],['TREPR','trepr'],
  ['TRERJ','trerj'],['TRERN','trern'],['TRERO','trero'],['TRERR','trerr'],['TRERS','trers'],['TRESC','tresc'],
  ['TRESE','trese'],['TRESP','tresp'],['TRETO','treto']
] as const;

export const LEGAL_TRIBUNALS:LegalTribunalOption[]=[
  ...[['STF','stf'],['STJ','stj'],['TST','tst'],['TSE','tse'],['STM','stm']].map(([sigla,alias])=>({sigla,alias,group:'superior' as const})),
  ...Array.from({length:6},(_,i)=>({sigla:'TRF'+(i+1),alias:'trf'+(i+1),group:'federal' as const})),
  ...state.map(([sigla,alias])=>({sigla,alias,group:'estadual' as const})),
  ...Array.from({length:24},(_,i)=>({sigla:'TRT'+(i+1),alias:'trt'+(i+1),group:'trabalho' as const})),
  ...tre.map(([sigla,alias])=>({sigla,alias,group:'eleitoral' as const})),
  {sigla:'TJMMG',alias:'tjmmg',group:'militar'},
  {sigla:'TJMRS',alias:'tjmrs',group:'militar'},
  {sigla:'TJMSP',alias:'tjmsp',group:'militar'}
];

export function legalTribunal(siglaOrAlias:string){
  const v=String(siglaOrAlias||'').toLowerCase();
  return LEGAL_TRIBUNALS.find(x=>x.sigla.toLowerCase()===v||x.alias===v)||null;
}
