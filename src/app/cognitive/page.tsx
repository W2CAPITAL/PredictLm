import {CognitiveLab} from '@/components/CognitiveLab';

export const metadata={
  title:'PredictLM Cognitive Lab',
  description:'Laboratório cognitivo multiespécies com FlyWire, H01 humano e atlas cortical de macaque, mantendo proveniência separada.'
};

export default function CognitivePage(){
  return <CognitiveLab/>;
}
