import { PageContainer } from '@/components/layout/PageContainer';

export default function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <PageContainer variant="fluid" className="p-0">
        <main className="flex-1 flex flex-col gap-8 min-w-0 px-8 pt-6 pb-12">{children}</main>
      </PageContainer>
    </div>
  );
}
