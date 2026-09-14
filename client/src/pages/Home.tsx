import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Command,
  Edit3,
  Eye,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  Scissors,
  Search,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";

const weekDayLabels = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
const colors = ["#b65f3a", "#4b7590", "#8b6f9b", "#6d8d72", "#c18d45"];

type DialogMode = "client" | "service" | "appointment" | null;
type ClientDraft = { name: string; phone: string; email: string; notes: string };
type ServiceDraft = { name: string; durationMinutes: string; price: string; color: string };
type AppointmentDraft = { clientId: string; serviceId: string; startsAt: string; notes: string };

const emptyClient: ClientDraft = { name: "", phone: "", email: "", notes: "" };
const emptyService: ServiceDraft = { name: "", durationMinutes: "60", price: "", color: colors[0] };
const emptyAppointment: AppointmentDraft = { clientId: "", serviceId: "", startsAt: "", notes: "" };

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(date);
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp));
}

function toLocalInputValue(timestamp: number) {
  const date = new Date(timestamp - new Date(timestamp).getTimezoneOffset() * 60000);
  return date.toISOString().slice(0, 16);
}

function fromLocalInputValue(value: string) {
  return new Date(value).getTime();
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function initials(name?: string | null) {
  return (name || "P").split(" ").slice(0, 2).map(part => part[0]).join("").toUpperCase();
}

function statusLabel(status: string) {
  return { scheduled: "Agendado", confirmed: "Confirmado", completed: "Concluído", cancelled: "Cancelado" }[status] ?? status;
}

export default function Home() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [fontLarge, setFontLarge] = useState(() => localStorage.getItem("proagenda-font-large") === "true");
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [clientDraft, setClientDraft] = useState<ClientDraft>(emptyClient);
  const [serviceDraft, setServiceDraft] = useState<ServiceDraft>(emptyService);
  const [appointmentDraft, setAppointmentDraft] = useState<AppointmentDraft>(emptyAppointment);
  const [selectedWeek, setSelectedWeek] = useState(() => startOfWeek(new Date()));
  const [clientSearch, setClientSearch] = useState("");

  const summaryQuery = trpc.dashboard.summary.useQuery(undefined, { enabled: Boolean(user) });
  const utils = trpc.useUtils();
  const clientMutation = trpc.clients.create.useMutation();
  const updateClientMutation = trpc.clients.update.useMutation();
  const deleteClientMutation = trpc.clients.remove.useMutation();
  const serviceMutation = trpc.services.create.useMutation();
  const updateServiceMutation = trpc.services.update.useMutation();
  const deleteServiceMutation = trpc.services.remove.useMutation();
  const appointmentMutation = trpc.agenda.create.useMutation();
  const updateAppointmentMutation = trpc.agenda.update.useMutation();
  const cancelAppointmentMutation = trpc.agenda.cancel.useMutation();

  const summary = summaryQuery.data;
  const clients = summary?.clients ?? [];
  const services = summary?.services ?? [];
  const appointments = summary?.appointments ?? [];
  const today = new Date();
  const activeAppointments = appointments.filter(item => item.status !== "cancelled");
  const upcomingAppointments = activeAppointments.filter(item => item.startsAt >= Date.now()).slice(0, 5);
  const filteredClients = clients.filter(client => `${client.name} ${client.email ?? ""} ${client.phone ?? ""}`.toLowerCase().includes(clientSearch.toLowerCase()));
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => { const day = new Date(selectedWeek); day.setDate(selectedWeek.getDate() + index); return day; }), [selectedWeek]);

  useEffect(() => {
    localStorage.setItem("proagenda-font-large", String(fontLarge));
  }, [fontLarge]);

  const refresh = async () => {
    await utils.dashboard.summary.invalidate();
  };

  const openClient = (client?: (typeof clients)[number]) => {
    setEditingId(client?.id ?? null);
    setClientDraft(client ? { name: client.name, phone: client.phone ?? "", email: client.email ?? "", notes: client.notes ?? "" } : emptyClient);
    setDialog("client");
  };

  const openService = (service?: (typeof services)[number]) => {
    setEditingId(service?.id ?? null);
    setServiceDraft(service ? { name: service.name, durationMinutes: String(service.durationMinutes), price: String(service.priceCents / 100).replace(".", ","), color: service.color } : emptyService);
    setDialog("service");
  };

  const openAppointment = (appointment?: (typeof appointments)[number]) => {
    setEditingId(appointment?.id ?? null);
    setAppointmentDraft(appointment ? { clientId: String(appointment.clientId), serviceId: String(appointment.serviceId), startsAt: toLocalInputValue(appointment.startsAt), notes: appointment.notes ?? "" } : { ...emptyAppointment, startsAt: toLocalInputValue(Date.now() + 60 * 60 * 1000) });
    setDialog("appointment");
  };

  const closeDialog = () => { setDialog(null); setEditingId(null); };

  const saveClient = async () => {
    try {
      if (editingId) await updateClientMutation.mutateAsync({ id: editingId, data: clientDraft });
      else await clientMutation.mutateAsync(clientDraft);
      toast.success(editingId ? "Cliente atualizado." : "Cliente cadastrado.");
      await refresh();
      closeDialog();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar o cliente."); }
  };

  const saveService = async () => {
    const normalizedPrice = Number(serviceDraft.price.replace(/[^0-9,.-]/g, "").replace(",", "."));
    try {
      const data = { name: serviceDraft.name, durationMinutes: Number(serviceDraft.durationMinutes), priceCents: Number.isFinite(normalizedPrice) ? Math.round(normalizedPrice * 100) : 0, color: serviceDraft.color };
      if (editingId) await updateServiceMutation.mutateAsync({ id: editingId, data });
      else await serviceMutation.mutateAsync(data);
      toast.success(editingId ? "Serviço atualizado." : "Serviço cadastrado.");
      await refresh();
      closeDialog();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar o serviço."); }
  };

  const saveAppointment = async () => {
    try {
      const data = { clientId: Number(appointmentDraft.clientId), serviceId: Number(appointmentDraft.serviceId), startsAt: fromLocalInputValue(appointmentDraft.startsAt), notes: appointmentDraft.notes };
      if (editingId) await updateAppointmentMutation.mutateAsync({ id: editingId, data });
      else await appointmentMutation.mutateAsync(data);
      toast.success(editingId ? "Agendamento atualizado." : "Agendamento criado.");
      await refresh();
      closeDialog();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar o agendamento."); }
  };

  const removeClient = async (id: number) => {
    if (!window.confirm("Remover este cliente?")) return;
    try { await deleteClientMutation.mutateAsync({ id }); await refresh(); toast.success("Cliente removido."); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível remover o cliente."); }
  };

  const removeService = async (id: number) => {
    if (!window.confirm("Remover este serviço?")) return;
    try { await deleteServiceMutation.mutateAsync({ id }); await refresh(); toast.success("Serviço removido."); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível remover o serviço."); }
  };

  const cancelAppointment = async (id: number) => {
    if (!window.confirm("Cancelar este agendamento?")) return;
    try { await cancelAppointmentMutation.mutateAsync({ id }); await refresh(); toast.success("Agendamento cancelado."); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível cancelar o agendamento."); }
  };

  const page = location === "/agenda" ? "agenda" : location === "/clientes" ? "clients" : location === "/servicos" ? "services" : "overview";
  const title = page === "agenda" ? "Agenda" : page === "clients" ? "Clientes" : page === "services" ? "Serviços" : "Visão geral";
  const isSaving = clientMutation.isPending || updateClientMutation.isPending || serviceMutation.isPending || updateServiceMutation.isPending || appointmentMutation.isPending || updateAppointmentMutation.isPending;

  return (
    <DashboardLayout>
      <div className={fontLarge ? "accessibility-large" : ""}>
        <header className="mx-auto mb-8 flex max-w-[1180px] flex-col gap-5 border-b border-[#e4ddd5] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div><div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#b65f3a]"><span className="h-2 w-2 rounded-full bg-[#b65f3a]" /> ProAgenda</div><h1 className="font-[Space_Grotesk] text-3xl font-bold tracking-tight text-[#17212b] sm:text-4xl">{title}</h1><p className="mt-2 text-sm text-[#707a81]">{page === "overview" ? `${formatDate(today)} · aqui está o ritmo do seu trabalho.` : page === "agenda" ? "Veja seus horários e mantenha o dia sob controle." : page === "clients" ? "Um histórico simples para atender melhor." : "Deixe claro o que você oferece e quanto tempo ocupa."}</p></div>
          <div className="flex flex-wrap items-center gap-2"><Button variant="outline" size="sm" onClick={() => setFontLarge(value => !value)} className="gap-2 border-[#d9d0c6] bg-[#fffdfb] text-[#56636d] hover:bg-[#f2e3da]" aria-pressed={fontLarge}><Eye className="h-4 w-4" /> {fontLarge ? "Fonte padrão" : "Aumentar fonte"}</Button>{page === "overview" && <Button size="sm" onClick={() => openAppointment()} className="gap-2 bg-[#b65f3a] text-white shadow-[0_8px_20px_rgba(182,95,58,0.2)] hover:bg-[#9f4f30]"><Plus className="h-4 w-4" /> Novo agendamento</Button>}</div>
        </header>

        {summaryQuery.isLoading ? <LoadingState /> : summaryQuery.error ? <ErrorState onRetry={() => void summaryQuery.refetch()} /> : <>
          {page === "overview" && <Overview summary={summary} appointments={upcomingAppointments} onNewAppointment={() => openAppointment()} onOpenAgenda={() => setLocation("/agenda")} onOpenAppointment={openAppointment} />}
          {page === "agenda" && <AgendaPage appointments={activeAppointments} weekDays={weekDays} selectedWeek={selectedWeek} onPrevious={() => setSelectedWeek(value => new Date(value.getTime() - 7 * 86_400_000))} onNext={() => setSelectedWeek(value => new Date(value.getTime() + 7 * 86_400_000))} onToday={() => setSelectedWeek(startOfWeek(new Date()))} onNew={() => openAppointment()} onEdit={openAppointment} onCancel={cancelAppointment} />}
          {page === "clients" && <ClientsPage clients={filteredClients} search={clientSearch} onSearch={setClientSearch} onNew={() => openClient()} onEdit={openClient} onRemove={removeClient} />}
          {page === "services" && <ServicesPage services={services} onNew={() => openService()} onEdit={openService} onRemove={removeService} />}
        </>}

        <Dialog open={dialog !== null} onOpenChange={open => !open && closeDialog()}>
          <DialogContent className="max-h-[90vh] overflow-y-auto border-[#e4ddd5] bg-[#fffdfb] sm:max-w-lg">
            {dialog === "client" && <ClientForm draft={clientDraft} setDraft={setClientDraft} editing={Boolean(editingId)} saving={isSaving} onSave={() => void saveClient()} onClose={closeDialog} />}
            {dialog === "service" && <ServiceForm draft={serviceDraft} setDraft={setServiceDraft} editing={Boolean(editingId)} saving={isSaving} onSave={() => void saveService()} onClose={closeDialog} />}
            {dialog === "appointment" && <AppointmentForm draft={appointmentDraft} setDraft={setAppointmentDraft} clients={clients} services={services} editing={Boolean(editingId)} saving={isSaving} onSave={() => void saveAppointment()} onClose={closeDialog} />}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

function LoadingState() { return <div className="mx-auto grid max-w-[1180px] place-items-center rounded-3xl border border-dashed border-[#d9d0c6] bg-[#fffdfb] py-32 text-center"><div><div className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-2xl bg-[#f2e3da]" /><p className="text-sm text-[#707a81]">Carregando sua operação…</p></div></div>; }
function ErrorState({ onRetry }: { onRetry: () => void }) { return <div className="mx-auto flex max-w-[1180px] flex-col items-center rounded-3xl border border-[#efc8c2] bg-[#fff8f7] px-6 py-20 text-center"><X className="mb-4 h-8 w-8 text-[#bb4a45]" /><h2 className="font-[Space_Grotesk] text-xl font-bold text-[#54201e]">Não conseguimos carregar seus dados</h2><p className="mt-2 max-w-sm text-sm text-[#8b5550]">Confira sua conexão e tente novamente.</p><Button onClick={onRetry} variant="outline" className="mt-6 border-[#dca9a2] bg-white text-[#8b3f39]">Tentar novamente</Button></div>; }

function Overview({ summary, appointments, onNewAppointment, onOpenAgenda, onOpenAppointment }: { summary: any; appointments: any[]; onNewAppointment: () => void; onOpenAgenda: () => void; onOpenAppointment: (appointment: any) => void }) {
  const active = (summary?.appointments ?? []).filter((item: any) => item.status !== "cancelled");
  const revenue = active.reduce((total: number, item: any) => total + (item.priceCents ?? 0), 0);
  const nextSeven = active.filter((item: any) => item.startsAt < Date.now() + 7 * 86_400_000).length;
  const firstName = summary?.clients?.[0]?.name?.split(" ")[0];
  return <div className="mx-auto max-w-[1180px] space-y-6 fade-up">
    <section className="soft-grid relative overflow-hidden rounded-[28px] bg-[#17212b] px-6 py-8 text-white shadow-[0_20px_60px_rgba(23,33,43,0.16)] sm:px-9 sm:py-10"><div className="relative z-10 max-w-xl"><div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#f4c7b1]"><Sparkles className="h-3.5 w-3.5" /> seu espaço de trabalho</div><h2 className="font-[Space_Grotesk] text-3xl font-bold leading-tight sm:text-4xl">A agenda certa deixa espaço para o que importa.</h2><p className="mt-4 max-w-md text-sm leading-6 text-[#c4cbd0]">Centralize seus atendimentos, clientes e serviços em uma visão limpa para cuidar da sua rotina — e das pessoas que confiam em você.</p><Button onClick={onNewAppointment} className="mt-7 gap-2 bg-[#d8835e] text-[#21150f] hover:bg-[#e49570]"><Plus className="h-4 w-4" /> Agendar atendimento</Button></div><div className="absolute -right-8 -top-12 h-64 w-64 rounded-full border-[30px] border-[#d8835e]/15" /><div className="absolute -bottom-24 right-24 h-52 w-52 rounded-full border-[24px] border-[#d8835e]/10" /></section>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={CalendarDays} label="Atendimentos hoje" value={String(summary?.todayAppointments ?? 0)} detail="na sua agenda" tint="orange" /><Metric icon={Clock3} label="Próximos 7 dias" value={String(nextSeven)} detail="horários previstos" tint="blue" /><Metric icon={Users} label="Clientes ativos" value={String(summary?.clients?.length ?? 0)} detail="pessoas cadastradas" tint="purple" /><Metric icon={Sparkles} label="Valor em agenda" value={formatMoney(revenue)} detail="serviços agendados" tint="green" /> </div>
    <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
      <Card className="border-[#e4ddd5] bg-[#fffdfb] shadow-none"><CardHeader className="flex flex-row items-center justify-between border-b border-[#eee7df] px-6 py-5"><div><CardTitle className="font-[Space_Grotesk] text-lg text-[#17212b]">Próximos atendimentos</CardTitle><p className="mt-1 text-xs text-[#8b9298]">O que vem a seguir na sua rotina</p></div><Button onClick={onOpenAgenda} variant="ghost" size="sm" className="gap-1 text-xs text-[#a14f2f]">Ver agenda <ArrowRight className="h-3.5 w-3.5" /></Button></CardHeader><CardContent className="p-0">{appointments.length === 0 ? <EmptyState icon={CalendarDays} title="Agenda livre por enquanto" description="Crie seu primeiro atendimento para começar." action="Novo agendamento" onAction={onNewAppointment} /> : <div className="divide-y divide-[#eee7df]">{appointments.map(item => <button key={item.id} onClick={() => onOpenAppointment(item)} className="flex w-full items-center gap-4 px-6 py-4 text-left transition hover:bg-[#fbf7f3]"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#f2e3da] text-xs font-bold text-[#a14f2f]"><span>{formatTime(item.startsAt)}</span></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#17212b]">{item.clientName ?? "Cliente"}</p><p className="mt-1 truncate text-xs text-[#8b9298]">{item.serviceName ?? "Serviço"} · {new Date(item.startsAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</p></div><span className="hidden rounded-full bg-[#eef5f0] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#52765b] sm:block">{statusLabel(item.status)}</span><ChevronRight className="h-4 w-4 text-[#b9b2aa]" /></button>)}</div>}</CardContent></Card>
      <Card className="border-[#e4ddd5] bg-[#fffdfb] shadow-none"><CardHeader className="px-6 py-5"><CardTitle className="font-[Space_Grotesk] text-lg text-[#17212b]">Comece por aqui</CardTitle><p className="mt-1 text-xs text-[#8b9298]">Três passos para organizar seu negócio</p></CardHeader><CardContent className="space-y-2 px-6 pb-6"><QuickLink icon={Users} number="01" title="Cadastre seus clientes" description="Tenha informações importantes sempre à mão." onClick={() => window.location.assign("/clientes")} /><QuickLink icon={Scissors} number="02" title="Configure seus serviços" description="Defina duração, valor e identidade de cada um." onClick={() => window.location.assign("/servicos")} /><QuickLink icon={CalendarDays} number="03" title="Abra sua agenda" description="Encontre horários livres sem conflito." onClick={onOpenAgenda} /></CardContent></Card>
    </div>
    <div className="flex items-center justify-between rounded-2xl border border-[#e4ddd5] bg-[#fbfaf8] px-5 py-4 text-xs text-[#8b9298]"><span><Command className="mr-2 inline h-3.5 w-3.5" /> Dica: mantenha os serviços atualizados para calcular seus horários com precisão.</span><span className="hidden sm:inline">{firstName ? `Tudo pronto, ${firstName}.` : "Seu workspace ProAgenda"}</span></div>
  </div>;
}

function Metric({ icon: Icon, label, value, detail, tint }: { icon: typeof CalendarDays; label: string; value: string; detail: string; tint: string }) { const map: Record<string, string> = { orange: "bg-[#f2e3da] text-[#a14f2f]", blue: "bg-[#e6eef2] text-[#4b7590]", purple: "bg-[#eee8f2] text-[#80658e]", green: "bg-[#e6efe8] text-[#5b7e63]" }; return <Card className="border-[#e4ddd5] bg-[#fffdfb] shadow-none"><CardContent className="p-5"><div className={`mb-5 grid h-10 w-10 place-items-center rounded-xl ${map[tint]}`}><Icon className="h-[18px] w-[18px]" /></div><p className="text-xs font-medium text-[#8b9298]">{label}</p><p className="mt-1 font-[Space_Grotesk] text-2xl font-bold tracking-tight text-[#17212b]">{value}</p><p className="mt-1 text-[11px] text-[#a7aaa9]">{detail}</p></CardContent></Card>; }
function QuickLink({ icon: Icon, number, title, description, onClick }: { icon: typeof Users; number: string; title: string; description: string; onClick: () => void }) { return <button onClick={onClick} className="group flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-[#f7f0eb]"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f2e3da] text-[#a14f2f]"><Icon className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="text-[11px] font-bold uppercase tracking-wider text-[#b0aaa3]">{number}</p><p className="mt-0.5 text-sm font-semibold text-[#2c3943]">{title}</p><p className="mt-0.5 truncate text-xs text-[#8b9298]">{description}</p></div><ArrowRight className="h-4 w-4 text-[#c5b9af] transition group-hover:translate-x-1 group-hover:text-[#a14f2f]" /></button>; }

function AgendaPage({ appointments, weekDays, selectedWeek, onPrevious, onNext, onToday, onNew, onEdit, onCancel }: { appointments: any[]; weekDays: Date[]; selectedWeek: Date; onPrevious: () => void; onNext: () => void; onToday: () => void; onNew: () => void; onEdit: (appointment: any) => void; onCancel: (id: number) => void }) { return <div className="mx-auto max-w-[1180px] space-y-5 fade-up"><div className="flex flex-col gap-3 rounded-2xl border border-[#e4ddd5] bg-[#fffdfb] p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><Button variant="outline" size="icon" onClick={onPrevious} aria-label="Semana anterior" className="border-[#d9d0c6]"><ChevronLeft className="h-4 w-4" /></Button><Button variant="outline" size="icon" onClick={onNext} aria-label="Próxima semana" className="border-[#d9d0c6]"><ChevronRight className="h-4 w-4" /></Button><Button variant="ghost" size="sm" onClick={onToday} className="text-[#a14f2f]">Hoje</Button><span className="ml-2 text-sm font-semibold capitalize text-[#17212b]">{new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(selectedWeek)}</span></div><Button onClick={onNew} className="gap-2 bg-[#b65f3a] text-white hover:bg-[#9f4f30]"><Plus className="h-4 w-4" /> Novo agendamento</Button></div><div className="overflow-x-auto rounded-2xl border border-[#e4ddd5] bg-[#fffdfb]"><div className="grid min-w-[920px] grid-cols-7 divide-x divide-[#eee7df]">{weekDays.map((day, index) => { const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0); const dayEnd = dayStart.getTime() + 86_400_000; const dayItems = appointments.filter(item => item.startsAt >= dayStart.getTime() && item.startsAt < dayEnd); const isToday = day.toDateString() === new Date().toDateString(); return <div key={day.toISOString()} className="min-h-[520px] bg-[#fffdfb]"><div className={`border-b border-[#eee7df] px-3 py-4 text-center ${isToday ? "bg-[#f7ece6]" : ""}`}><p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${isToday ? "text-[#b65f3a]" : "text-[#9da19e]"}`}>{weekDayLabels[index]}</p><p className={`mt-1 font-[Space_Grotesk] text-xl font-bold ${isToday ? "text-[#a14f2f]" : "text-[#17212b]"}`}>{day.getDate()}</p></div><div className="space-y-2 p-2">{dayItems.length === 0 ? <div className="pt-9 text-center text-[11px] text-[#c1bbb3]">livre</div> : dayItems.map(item => <button key={item.id} onClick={() => onEdit(item)} className="group w-full rounded-xl border border-[#ead9d0] bg-[#fbf2ed] p-3 text-left transition hover:-translate-y-0.5 hover:border-[#c78265] hover:shadow-sm"><div className="flex items-center justify-between gap-2"><span className="text-[11px] font-bold text-[#a14f2f]">{formatTime(item.startsAt)}</span><MoreHorizontal className="h-3.5 w-3.5 text-[#bc8b76]" /></div><p className="mt-2 truncate text-xs font-bold text-[#293943]">{item.clientName ?? "Cliente"}</p><p className="mt-1 truncate text-[11px] text-[#8a7770]">{item.serviceName ?? "Serviço"}</p><span className="mt-2 inline-block text-[9px] font-bold uppercase tracking-wide text-[#8e9d92]">{statusLabel(item.status)}</span></button>)}</div></div>; })}</div></div><p className="text-xs text-[#8b9298]">Clique em um atendimento para editar ou cancelar. Conflitos de horário são bloqueados automaticamente.</p></div>; }

function ClientsPage({ clients, search, onSearch, onNew, onEdit, onRemove }: { clients: any[]; search: string; onSearch: (value: string) => void; onNew: () => void; onEdit: (client: any) => void; onRemove: (id: number) => void }) { return <div className="mx-auto max-w-[1180px] space-y-5 fade-up"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="relative max-w-sm flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9da19e]" /><Input value={search} onChange={event => onSearch(event.target.value)} placeholder="Buscar por nome, telefone ou e-mail" className="h-11 border-[#d9d0c6] bg-[#fffdfb] pl-10" /></div><Button onClick={onNew} className="gap-2 bg-[#b65f3a] text-white hover:bg-[#9f4f30]"><Plus className="h-4 w-4" /> Novo cliente</Button></div><Card className="border-[#e4ddd5] bg-[#fffdfb] shadow-none"><CardContent className="p-0">{clients.length === 0 ? <EmptyState icon={UserRound} title={search ? "Nenhum cliente encontrado" : "Sua lista começa aqui"} description={search ? "Tente buscar por outro termo." : "Cadastre clientes para agilizar seus próximos atendimentos."} action={search ? undefined : "Cadastrar cliente"} onAction={onNew} /> : <div className="divide-y divide-[#eee7df]">{clients.map(client => <div key={client.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:px-6"><div className="flex min-w-0 flex-1 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#e6eef2] text-xs font-bold text-[#4b7590]">{initials(client.name)}</div><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#17212b]">{client.name}</p><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#8b9298]">{client.phone && <span><Phone className="mr-1 inline h-3 w-3" />{client.phone}</span>}{client.email && <span><Mail className="mr-1 inline h-3 w-3" />{client.email}</span>}</div></div></div><div className="flex items-center gap-2 sm:justify-end"><Button onClick={() => onEdit(client)} variant="outline" size="sm" className="gap-1.5 border-[#d9d0c6] bg-transparent text-[#56636d]"><Edit3 className="h-3.5 w-3.5" /> Editar</Button><Button onClick={() => onRemove(client.id)} variant="ghost" size="icon" className="text-[#a5a19c] hover:bg-[#fff1ef] hover:text-[#bb4a45]" aria-label={`Remover ${client.name}`}><Trash2 className="h-4 w-4" /></Button></div></div>)}</div>}</CardContent></Card></div>; }

function ServicesPage({ services, onNew, onEdit, onRemove }: { services: any[]; onNew: () => void; onEdit: (service: any) => void; onRemove: (id: number) => void }) { return <div className="mx-auto max-w-[1180px] space-y-5 fade-up"><div className="flex items-center justify-between"><p className="text-sm text-[#707a81]">{services.length} {services.length === 1 ? "serviço cadastrado" : "serviços cadastrados"}</p><Button onClick={onNew} className="gap-2 bg-[#b65f3a] text-white hover:bg-[#9f4f30]"><Plus className="h-4 w-4" /> Novo serviço</Button></div>{services.length === 0 ? <Card className="border-[#e4ddd5] bg-[#fffdfb] shadow-none"><CardContent className="p-0"><EmptyState icon={Scissors} title="Defina o que você oferece" description="Serviços com duração e valor deixam sua agenda mais precisa." action="Cadastrar serviço" onAction={onNew} /></CardContent></Card> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{services.map(service => <Card key={service.id} className="group border-[#e4ddd5] bg-[#fffdfb] shadow-none transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(23,33,43,0.07)]"><CardContent className="p-5"><div className="mb-6 flex items-start justify-between"><div className="h-3 w-3 rounded-full" style={{ backgroundColor: service.color }} /><div className="flex gap-1 opacity-60 transition group-hover:opacity-100"><Button onClick={() => onEdit(service)} variant="ghost" size="icon-sm" aria-label={`Editar ${service.name}`}><Edit3 className="h-3.5 w-3.5" /></Button><Button onClick={() => onRemove(service.id)} variant="ghost" size="icon-sm" className="text-[#a5a19c] hover:text-[#bb4a45]" aria-label={`Remover ${service.name}`}><Trash2 className="h-3.5 w-3.5" /></Button></div></div><h3 className="font-[Space_Grotesk] text-lg font-bold text-[#17212b]">{service.name}</h3><div className="mt-3 flex items-center gap-3 text-xs text-[#8b9298]"><span><Clock3 className="mr-1 inline h-3.5 w-3.5" />{service.durationMinutes} min</span><span className="h-1 w-1 rounded-full bg-[#c5b9af]" /><span className="font-semibold text-[#a14f2f]">{formatMoney(service.priceCents)}</span></div></CardContent></Card>)}</div>}</div>; }

function EmptyState({ icon: Icon, title, description, action, onAction }: { icon: typeof CalendarDays; title: string; description: string; action?: string; onAction?: () => void }) { return <div className="flex flex-col items-center px-6 py-16 text-center"><div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[#f2e3da] text-[#b65f3a]"><Icon className="h-5 w-5" /></div><h3 className="font-[Space_Grotesk] text-lg font-bold text-[#293943]">{title}</h3><p className="mt-2 max-w-xs text-sm leading-6 text-[#8b9298]">{description}</p>{action && onAction && <Button onClick={onAction} variant="outline" size="sm" className="mt-5 border-[#d9d0c6] text-[#a14f2f]">{action}</Button>}</div>; }

function ClientForm({ draft, setDraft, editing, saving, onSave, onClose }: { draft: ClientDraft; setDraft: (draft: ClientDraft) => void; editing: boolean; saving: boolean; onSave: () => void; onClose: () => void }) { return <><DialogHeader><DialogTitle className="font-[Space_Grotesk] text-2xl text-[#17212b]">{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle><DialogDescription>Guarde os dados essenciais para um atendimento mais próximo.</DialogDescription></DialogHeader><div className="grid gap-4 py-2"><Field label="Nome completo" required><Input autoFocus value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Ex.: Marina Costa" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Telefone"><Input value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })} placeholder="(11) 99999-9999" /></Field><Field label="E-mail"><Input type="email" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} placeholder="marina@email.com" /></Field></div><Field label="Observações"><Textarea value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} placeholder="Preferências, histórico ou detalhes importantes" /></Field></div><DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={onSave} disabled={saving || !draft.name.trim()} className="bg-[#b65f3a] text-white hover:bg-[#9f4f30]">{saving ? "Salvando…" : editing ? "Salvar alterações" : "Cadastrar cliente"}</Button></DialogFooter></>; }

function ServiceForm({ draft, setDraft, editing, saving, onSave, onClose }: { draft: ServiceDraft; setDraft: (draft: ServiceDraft) => void; editing: boolean; saving: boolean; onSave: () => void; onClose: () => void }) { return <><DialogHeader><DialogTitle className="font-[Space_Grotesk] text-2xl text-[#17212b]">{editing ? "Editar serviço" : "Novo serviço"}</DialogTitle><DialogDescription>Defina a duração para que a agenda evite sobreposições.</DialogDescription></DialogHeader><div className="grid gap-4 py-2"><Field label="Nome do serviço" required><Input autoFocus value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Ex.: Sessão de tatuagem" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Duração (minutos)" required><Input type="number" min="5" step="5" value={draft.durationMinutes} onChange={e => setDraft({ ...draft, durationMinutes: e.target.value })} /></Field><Field label="Preço (R$)"><Input inputMode="decimal" value={draft.price} onChange={e => setDraft({ ...draft, price: e.target.value })} placeholder="0,00" /></Field></div><Field label="Cor na agenda"><div className="flex items-center gap-3"><Input type="color" value={draft.color} onChange={e => setDraft({ ...draft, color: e.target.value })} className="h-10 w-14 p-1" /><div className="flex gap-2">{colors.map(color => <button key={color} type="button" aria-label={`Escolher cor ${color}`} onClick={() => setDraft({ ...draft, color })} className={`h-7 w-7 rounded-full border-2 ${draft.color === color ? "border-[#17212b]" : "border-transparent"}`} style={{ backgroundColor: color }} />)}</div></div></Field></div><DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={onSave} disabled={saving || !draft.name.trim()} className="bg-[#b65f3a] text-white hover:bg-[#9f4f30]">{saving ? "Salvando…" : editing ? "Salvar alterações" : "Cadastrar serviço"}</Button></DialogFooter></>; }

function AppointmentForm({ draft, setDraft, clients, services, editing, saving, onSave, onClose }: { draft: AppointmentDraft; setDraft: (draft: AppointmentDraft) => void; clients: any[]; services: any[]; editing: boolean; saving: boolean; onSave: () => void; onClose: () => void }) { return <><DialogHeader><DialogTitle className="font-[Space_Grotesk] text-2xl text-[#17212b]">{editing ? "Editar agendamento" : "Novo agendamento"}</DialogTitle><DialogDescription>Escolha cliente, serviço e horário. Conflitos são sinalizados automaticamente.</DialogDescription></DialogHeader><div className="grid gap-4 py-2"><Field label="Cliente" required><Select value={draft.clientId} onValueChange={value => setDraft({ ...draft, clientId: value })}><SelectTrigger className="w-full"><SelectValue placeholder="Selecione um cliente" /></SelectTrigger><SelectContent>{clients.length === 0 ? <SelectItem value="empty-client" disabled>Nenhum cliente cadastrado</SelectItem> : clients.map(client => <SelectItem key={client.id} value={String(client.id)}>{client.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Serviço" required><Select value={draft.serviceId} onValueChange={value => setDraft({ ...draft, serviceId: value })}><SelectTrigger className="w-full"><SelectValue placeholder="Selecione um serviço" /></SelectTrigger><SelectContent>{services.length === 0 ? <SelectItem value="empty-service" disabled>Nenhum serviço cadastrado</SelectItem> : services.map(service => <SelectItem key={service.id} value={String(service.id)}>{service.name} · {service.durationMinutes} min</SelectItem>)}</SelectContent></Select></Field><Field label="Data e horário" required><Input type="datetime-local" value={draft.startsAt} onChange={e => setDraft({ ...draft, startsAt: e.target.value })} /></Field><Field label="Observações"><Textarea value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} placeholder="Detalhes do atendimento" /></Field></div>{(!clients.length || !services.length) && <p className="rounded-xl bg-[#fff3e9] px-3 py-2 text-xs text-[#9a5536]">Cadastre pelo menos um cliente e um serviço antes de criar um agendamento.</p>}<DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={onSave} disabled={saving || !draft.clientId || !draft.serviceId || !draft.startsAt} className="bg-[#b65f3a] text-white hover:bg-[#9f4f30]">{saving ? "Salvando…" : editing ? "Salvar alterações" : "Criar agendamento"}</Button></DialogFooter></>; }

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) { return <div className="grid gap-2"><Label className="text-xs font-semibold text-[#56636d]">{label}{required && <span className="ml-1 text-[#b65f3a]">*</span>}</Label>{children}</div>; }
