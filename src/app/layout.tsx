import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'PredictLM Studio',description:'Local-first agentic app builder for web, desktop, media and automation.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
