import type { BreadcrumbItem } from '@/types';
import Header from './Header';

interface AppHeaderLayoutProps {
  breadcrumbs?: BreadcrumbItem[];
  children: React.ReactNode;
}

/**
 * Layout sans sidebar — header seul + contenu.
 * À utiliser pour les pages qui n'ont pas besoin de navigation latérale.
 */
export default function AppHeaderLayout({ breadcrumbs = [], children }: AppHeaderLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-surface-container-lowest">
      <Header breadcrumbs={breadcrumbs} />
      <main className="flex-1 p-6 md:p-8">{children}</main>
    </div>
  );
}
