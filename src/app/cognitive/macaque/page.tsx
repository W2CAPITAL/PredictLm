import {CognitiveLab} from '@/components/CognitiveLab';

export const metadata={
  title:'PredictLM Macaque Core',
  description:'Chat isolado guiado pelo atlas cortical espacial/transcriptômico de macaque como referência de primata não-humano.'
};

export default function MacaqueCognitivePage(){
  return <CognitiveLab defaultMode="macaque"/>;
}
