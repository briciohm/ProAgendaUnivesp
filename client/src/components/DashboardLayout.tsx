import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { CalendarDays, LayoutDashboard, LogOut, PanelLeft, Scissors, Users } from "lucide-react";
import { CSSProperties, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "Visão geral", path: "/" },
  { icon: CalendarDays, label: "Agenda", path: "/agenda" },
  { icon: Users, label: "Clientes", path: "/clientes" },
  { icon: Scissors, label: "Serviços", path: "/servicos" },
];

const SIDEBAR_WIDTH_KEY = "proagenda-sidebar-width";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : 248;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f5f1eb] px-6 py-16 text-[#17212b]">
        <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl bg-white p-10 text-center shadow-[0_24px_80px_rgba(23,33,43,0.12)]">
          <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-[#b65f3a] text-xl font-bold text-white">PA</div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-[#b65f3a]">ProAgenda</p>
          <h1 className="text-3xl font-semibold tracking-tight">Sua rotina, no lugar certo.</h1>
          <p className="mt-3 text-sm leading-6 text-[#66727d]">Entre para organizar clientes, serviços e horários em uma agenda centralizada.</p>
          <Button onClick={() => startLogin()} size="lg" className="mt-8 w-full bg-[#17212b] text-white hover:bg-[#293845]">Entrar no sistema</Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent user={user} setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({ children, user, setSidebarWidth }: { children: React.ReactNode; user: NonNullable<ReturnType<typeof useAuth>["user"]>; setSidebarWidth: (width: number) => void }) {
  const { logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const activeMenuItem = menuItems.find(item => item.path === location) ?? menuItems[0];

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-[#e4ddd5] bg-[#fbfaf8]">
        <SidebarHeader className="h-20 justify-center border-b border-[#e4ddd5]">
          <div className="flex items-center gap-3 px-2">
            <button onClick={toggleSidebar} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#17212b] text-white transition hover:bg-[#293845] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b65f3a]" aria-label="Recolher menu">
              <PanelLeft className="h-4 w-4" />
            </button>
            {!isCollapsed && <div className="min-w-0"><p className="truncate text-[15px] font-bold tracking-tight text-[#17212b]">ProAgenda</p><p className="truncate text-[11px] text-[#8b9298]">gestão sem complicação</p></div>}
          </div>
        </SidebarHeader>
        <SidebarContent className="gap-0 py-4">
          <p className="px-4 pb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#9ba1a5] group-data-[collapsible=icon]:hidden">Workspace</p>
          <SidebarMenu className="gap-1 px-2">
            {menuItems.map(item => {
              const isActive = location === item.path;
              return <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={isActive} onClick={() => setLocation(item.path)} tooltip={item.label} className={`h-11 rounded-xl px-3 text-[13px] transition-all ${isActive ? "bg-[#f2e3da] font-semibold text-[#a14f2f] hover:bg-[#f2e3da]" : "text-[#67717a] hover:bg-[#f4f1ed] hover:text-[#17212b]"}`}><item.icon className="h-[17px] w-[17px]" /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>;
            })}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="border-t border-[#e4ddd5] p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left transition hover:bg-[#f4f1ed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b65f3a] group-data-[collapsible=icon]:justify-center">
                <Avatar className="h-9 w-9 shrink-0 border border-[#e4ddd5] bg-[#f2e3da]"><AvatarFallback className="bg-[#f2e3da] text-xs font-bold text-[#a14f2f]">{user.name?.charAt(0).toUpperCase() ?? "P"}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-xs font-semibold text-[#17212b]">{user.name || "Profissional"}</p><p className="mt-0.5 truncate text-[11px] text-[#8b9298]">{user.email || "Conta ProAgenda"}</p></div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48"><DropdownMenuItem onClick={() => void logout()} className="cursor-pointer text-[#b65f3a]"><LogOut className="mr-2 h-4 w-4" /><span>Sair da conta</span></DropdownMenuItem></DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-[#f5f1eb]">
        <div className="flex min-h-14 items-center gap-3 border-b border-[#e4ddd5] bg-[#fbfaf8]/90 px-4 backdrop-blur md:hidden"><SidebarTrigger className="h-9 w-9 rounded-xl bg-white" /><span className="text-sm font-semibold text-[#17212b]">{activeMenuItem.label}</span></div>
        <main className="min-h-[calc(100vh-3.5rem)] p-4 sm:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </>
  );
}
