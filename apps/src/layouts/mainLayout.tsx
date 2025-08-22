import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/common/app-sidebar';
import { Outlet } from 'react-router-dom';
// import { Button } from "@/components/ui/button"

export default function MainLayout() {
  return (
    <SidebarProvider
      id="prodivder"
      style={
        {
          '--sidebar-width': '14rem',
          paddingTop: '1rem',
          display: 'flex',
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <main className="gap-2 flex justify-center w-[3rem]">
        <SidebarTrigger />
      </main>

      <div className="flex flex-col flex-auto pr-[1rem]">
        <Outlet />
      </div>
    </SidebarProvider>
  );
}
