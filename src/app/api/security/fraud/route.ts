import { assessFraudRisk } from '@/lib/security/fraud-defense';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function POST(req:Request){
  try{
    const body=await req.json();
    const texts=Array.isArray(body?.texts)?body.texts.map(String):body?.text?[String(body.text)]:[];
    const urls=Array.isArray(body?.urls)?body.urls.map(String):[];
    const transactions=Array.isArray(body?.transactions)?body.transactions:[];
    if(!texts.length&&!urls.length&&!transactions.length){
      return Response.json({error:'texts, urls or transactions are required'},{status:400});
    }
    return Response.json({
      assessment:assessFraudRisk({texts,urls,transactions}),
      policy:{
        purpose:'defensive fraud/scam triage',
        proofRule:'signals are not proof of fraud, authorship or crime',
        offensiveAutomation:false
      }
    },{headers:{'Cache-Control':'no-store'}});
  }catch(error:any){
    return Response.json({error:String(error?.message||error)},{status:400,headers:{'Cache-Control':'no-store'}});
  }
}
