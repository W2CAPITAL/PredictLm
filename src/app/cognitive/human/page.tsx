import {CognitiveLab} from '@/components/CognitiveLab';

export const metadata={
  title:'PredictLM Human Core',
  description:'Chat isolado controlado pelo Human Core derivado do fragmento cortical H01.'
};

export default function HumanCognitivePage(){
  return <CognitiveLab defaultMode="human"/>;
}
