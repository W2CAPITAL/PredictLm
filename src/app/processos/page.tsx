import type {Metadata} from 'next';
import './processos.css';
import {ProcessIntelligenceCenter} from '@/components/ProcessIntelligenceCenter';

export const metadata:Metadata={
  title:'Processos · PredictLM',
  description:'Central de inteligência processual com DataJud, DJEN, carteira, tarefas, retornos e IA.'
};

export default function ProcessosPage(){
  return <ProcessIntelligenceCenter/>;
}
