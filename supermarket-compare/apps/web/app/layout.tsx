import type { Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
export const viewport: Viewport = {width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#f5f6f2'};
export const metadata = { title: 'تسعيرة | قارن أسعار مشترياتك', description:'قارن أسعار المقاضي ومنتجات الصيدليات، في بحث واحد. نفس احتياجك، خيارات أكثر، قرار أوضح.' };
export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="ar" dir="rtl"><body>{children}</body></html>;
}
