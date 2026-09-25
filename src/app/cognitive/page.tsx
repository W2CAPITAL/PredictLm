import {CognitiveLab} from '@/components/CognitiveLab';

export const metadata={
  title:'PredictLM Cognitive Lab',
  description:'Frank Stein hybrid cognitive laboratory using human atlases, FlyWire, memory, emotion and virtual neuronal microcircuits.'
};

export default function CognitivePage(){
  return <CognitiveLab defaultMode="frank"/>;
}
