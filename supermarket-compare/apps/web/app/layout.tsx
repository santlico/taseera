import type { ReactNode } from 'react';
import './globals.css';
export const metadata = { title: 'تسعيرة | قارن أسعار مشترياتك', description:'بحث واحد في متاجرك المفضلة، بأسعار وروابط المنتجات الأصلية.' };
export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="ar" dir="rtl"><body>{children}</body></html>;
}
