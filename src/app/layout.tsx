import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'AppForge — AI App Generator',
  description: 'Forging modern apps with AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased bg-[#09090b] text-[#e4e4e7] overflow-hidden`}>
        {children}
      </body>
    </html>
  );
}
