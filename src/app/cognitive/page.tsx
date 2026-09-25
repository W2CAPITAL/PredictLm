import {CognitiveLab} from '@/components/CognitiveLab';

export const metadata={
  title:'PredictLM Cognitive Lab',
  description:'Isolated dual-connectome cognitive laboratory using FlyWire and H01-derived control layers.'
};

export default function CognitivePage(){
  return <CognitiveLab/>;
}
