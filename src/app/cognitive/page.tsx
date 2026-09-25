import Link from 'next/link';
import {CognitiveLab} from '@/components/CognitiveLab';

export const metadata={
  title:'PredictLM Cognitive Lab',
  description:'Isolated dual-connectome cognitive laboratory using FlyWire and H01-derived control layers.'
};

export default function CognitivePage(){
  return (
    <>
      <div className="fixed right-4 top-4 z-50 flex gap-2">
        <Link href="/cognitive/observatory" className="rounded-full border border-white/15 bg-black/70 px-4 py-2 text-sm text-white backdrop-blur hover:bg-white/10">
          Observatório
        </Link>
        <Link href="/" className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black">
          Chat normal
        </Link>
      </div>
      <CognitiveLab/>
    </>
  );
}
