import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/common/app-sidebar"
// import { Button } from "@/components/ui/button"


export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider id="prodivder"
      style={{
        "--sidebar-width": "14rem",
        paddingTop: "1rem",
      }}
    >
      <AppSidebar />
      <main className="gap-2 flex justify-center w-[3rem]">
        <SidebarTrigger />
        {/* <div className="flex min-h-svh flex-col flex-auto items-center justify-center">
          <Button>Click me</Button>
        </div> */}
      </main>

      <div className="flex flex-col flex-auto pr-[1rem]">
        {children}
      </div>

    </SidebarProvider>
  )
}
