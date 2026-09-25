import type { Metadata, Viewport } from 'next';
import './globals.css';
import { NeuralWarmup } from '@/components/NeuralWarmup';
export const metadata:Metadata={title:'PredictLM Studio',description:'API-first multimodal assistant with agent skills, research, build and local auxiliary runtimes.',icons:{icon:'/icon.svg'}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#0d0d0d'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body><NeuralWarmup/>{children}</body></html>}
