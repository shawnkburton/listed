import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata={title:'Listed · A home that feels like you',description:'A personalized home discovery prototype for Greater Victoria. Fictional sample listings.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en-CA"><body>{children}</body></html>;}
