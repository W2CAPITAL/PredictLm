import type { Metadata } from 'next';
import './globals.css';
import { NeuralWarmup } from '@/components/NeuralWarmup';
export const metadata:Metadata={title:'PredictLM Studio',description:'Local-first agentic app builder for web, desktop, media and automation.',icons:{icon:'/icon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body><NeuralWarmup/>{children}</body></html>}
