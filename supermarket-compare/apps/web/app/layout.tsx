import type { Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import './redesign.css';
import './shopping-cart.css';
import {ShoppingCartProvider} from './shopping-cart';
export const viewport: Viewport = {width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#f4f7fc'};
export const metadata = { title: 'تسعيرة | قارن أسعار مشترياتك', description:'قارن أسعار المقاضي والعناية والجمال ومنتجات الصيدليات، في بحث واحد. نفس احتياجك، خيارات أكثر، قرار أوضح.' };
export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="ar" dir="rtl"><body><ShoppingCartProvider>{children}</ShoppingCartProvider></body></html>;
}
