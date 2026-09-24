export interface DeterministicMathAnswer{
  value:number;
  normalized:string;
  engine:'predict-deterministic-math';
}

type Token={type:'number'|'id'|'op';value:string};

function tokenize(input:string):Token[]|null{
  const raw=input
    .trim()
    .replace(/^(?:calcule|calcular|quanto\s+(?:é|e)|compute|solve)\s*[:=]?\s*/i,'')
    .replace(/[?=]+$/g,'')
    .replace(/,/g,',');
  if(raw.length>300)return null;
  const parts=raw.match(/\d+(?:\.\d+)?(?:e[+\-]?\d+)?|[A-Za-z_]+|[()+\-*/%^!,]/g);
  if(!parts)return null;
  const compact=raw.replace(/\s+/g,'');
  if(parts.join('')!==compact)return null;
  return parts.map(value=>({
    type:/^\d/.test(value)?'number':/^[A-Za-z_]+$/.test(value)?'id':'op',
    value
  }));
}

function factorial(n:number){
  if(!Number.isInteger(n)||n<0||n>170)throw new Error('factorial-range');
  let out=1;
  for(let i=2;i<=n;i++)out*=i;
  return out;
}

function callFn(name:string,args:number[]){
  const f=name.toLowerCase();
  if(f==='sqrt'&&args.length===1)return Math.sqrt(args[0]);
  if(f==='abs'&&args.length===1)return Math.abs(args[0]);
  if(f==='sin'&&args.length===1)return Math.sin(args[0]);
  if(f==='cos'&&args.length===1)return Math.cos(args[0]);
  if(f==='tan'&&args.length===1)return Math.tan(args[0]);
  if(f==='asin'&&args.length===1)return Math.asin(args[0]);
  if(f==='acos'&&args.length===1)return Math.acos(args[0]);
  if(f==='atan'&&args.length===1)return Math.atan(args[0]);
  if((f==='ln'||f==='log')&&args.length===1)return Math.log(args[0]);
  if(f==='log10'&&args.length===1)return Math.log10(args[0]);
  if(f==='exp'&&args.length===1)return Math.exp(args[0]);
  if(f==='pow'&&args.length===2)return Math.pow(args[0],args[1]);
  if(f==='min'&&args.length)return Math.min(...args);
  if(f==='max'&&args.length)return Math.max(...args);
  if(f==='sum'&&args.length)return args.reduce((a,b)=>a+b,0);
  if(f==='mean'&&args.length)return args.reduce((a,b)=>a+b,0)/args.length;
  if(f==='median'&&args.length){
    const a=[...args].sort((x,y)=>x-y);
    const m=Math.floor(a.length/2);
    return a.length%2?a[m]:(a[m-1]+a[m])/2;
  }
  if((f==='std'||f==='stdev')&&args.length){
    const mean=args.reduce((a,b)=>a+b,0)/args.length;
    return Math.sqrt(args.reduce((s,x)=>s+(x-mean)**2,0)/args.length);
  }
  throw new Error('function');
}

export function deterministicMathResult(input:string):DeterministicMathAnswer|null{
  const tokens=tokenize(input);
  if(!tokens||!tokens.length)return null;
  let i=0;

  const primary=():number=>{
    const token=tokens[i++];
    if(!token)throw new Error('token');
    if(token.value==='('){
      const v=expr();
      if(tokens[i]?.value!==')')throw new Error('paren');
      i++;
      return v;
    }
    if(token.value==='-')return -primary();
    if(token.value==='+')return primary();
    if(token.type==='number')return Number(token.value);
    if(token.type==='id'){
      const id=token.value.toLowerCase();
      if(tokens[i]?.value!=='('){
        if(id==='pi')return Math.PI;
        if(id==='e')return Math.E;
        throw new Error('constant');
      }
      i++;
      const args:number[]=[];
      if(tokens[i]?.value!==')'){
        while(true){
          args.push(expr());
          if(tokens[i]?.value===','){i++;continue}
          break;
        }
      }
      if(tokens[i]?.value!==')')throw new Error('call-paren');
      i++;
      return callFn(id,args);
    }
    throw new Error('primary');
  };

  const postfix=()=>{
    let v=primary();
    while(tokens[i]?.value==='!'){i++;v=factorial(v)}
    return v;
  };
  const power=()=>{
    let v=postfix();
    if(tokens[i]?.value==='^'){i++;v=Math.pow(v,power())}
    return v;
  };
  const term=()=>{
    let v=power();
    while(['*','/','%'].includes(tokens[i]?.value||'')){
      const op=tokens[i++].value;
      const r=power();
      v=op==='*'?v:op==='/'?v/r:v%r;
    }
    return v;
  };
  const expr=()=>{
    let v=term();
    while(['+','-'].includes(tokens[i]?.value||'')){
      const op=tokens[i++].value;
      const r=term();
      v=op==='+'?v+r:v-r;
    }
    return v;
  };

  try{
    const value=expr();
    if(i!==tokens.length||!Number.isFinite(value))return null;
    return {value,normalized:tokens.map(x=>x.value).join(''),engine:'predict-deterministic-math'};
  }catch{return null}
}
