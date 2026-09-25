import type {Metadata} from 'next';
import './processos.css';
import {LegalModule} from '@/components/LegalModule';

export const metadata:Metadata={
  title:'Consulta de Processos · PredictLM',
  description:'Consulta processual por número CNJ com DataJud, DJEN, linha do tempo e análise do PredictLM.'
};

export default function ProcessosPage(){
  return <LegalModule/>;
}
