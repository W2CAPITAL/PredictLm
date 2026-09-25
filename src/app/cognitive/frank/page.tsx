import {CognitiveLab} from '@/components/CognitiveLab';

export const metadata={
  title:'Frank Stein · Hybrid Brain',
  description:'Chat cognitivo híbrido com múltiplas referências humanas, memória emocional e módulos FlyWire.'
};

export default function FrankCognitivePage(){
  return <CognitiveLab defaultMode="frank"/>;
}
