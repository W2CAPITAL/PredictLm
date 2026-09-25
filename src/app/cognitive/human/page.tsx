import {CognitiveLab} from '@/components/CognitiveLab';

export const metadata={
  title:'PredictLM Human Core',
  description:'Chat isolado do Human Core: H01 humano direto com proxy cortical de macaque explicitamente marcado onde a cobertura H01 é incompleta.'
};

export default function HumanCognitivePage(){
  return <CognitiveLab defaultMode="human"/>;
}
