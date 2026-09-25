import {CognitiveLab} from '@/components/CognitiveLab';

export const metadata={
  title:'Mosca Predict · Fly Core',
  description:'Chat isolado controlado pelo Fly Core derivado do connectoma FlyWire FAFB v783.'
};

export default function FlyCognitivePage(){
  return <CognitiveLab defaultMode="fly"/>;
}
