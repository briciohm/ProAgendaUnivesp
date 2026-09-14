import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  cancelAppointment,
  countTodayAppointments,
  createAppointment,
  createClient,
  createService,
  getClient,
  getService,
  hasAppointmentConflict,
  listAppointments,
  listClients,
  listServices,
  removeClient,
  removeService,
  updateAppointment,
  updateClient,
  updateService,
} from "./db";
import { calculateEndAt } from "./agenda.logic";

const clientInput = z.object({
  name: z.string().trim().min(2, "Informe o nome do cliente").max(160),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  email: z.string().trim().email("Informe um e-mail válido").max(320).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

const serviceInput = z.object({
  name: z.string().trim().min(2, "Informe o nome do serviço").max(160),
  durationMinutes: z.number().int().min(5).max(1440),
  priceCents: z.number().int().min(0).max(99999999),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
});

const appointmentInput = z.object({
  clientId: z.number().int().positive(),
  serviceId: z.number().int().positive(),
  startsAt: z.number().int().positive(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

async function ensureAppointmentInput(userId: number, input: z.infer<typeof appointmentInput>, exceptId?: number) {
  const [client, service] = await Promise.all([getClient(userId, input.clientId), getService(userId, input.serviceId)]);
  if (!client) throw new TRPCError({ code: "BAD_REQUEST", message: "Cliente não encontrado." });
  if (!service) throw new TRPCError({ code: "BAD_REQUEST", message: "Serviço não encontrado." });
  const endsAt = calculateEndAt(input.startsAt, service.durationMinutes);
  if (await hasAppointmentConflict(userId, input.startsAt, endsAt, exceptId)) {
    throw new TRPCError({ code: "CONFLICT", message: "Esse horário já está ocupado. Escolha outro horário." });
  }
  return { endsAt };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  dashboard: router({
    summary: protectedProcedure.query(async ({ ctx }) => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const end = start + 86_400_000;
      const [clients, services, appointments, todayAppointments] = await Promise.all([
        listClients(ctx.user.id),
        listServices(ctx.user.id),
        listAppointments(ctx.user.id),
        countTodayAppointments(ctx.user.id, start - 1, end),
      ]);
      return { clients, services, appointments, todayAppointments };
    }),
  }),
  clients: router({
    list: protectedProcedure.query(({ ctx }) => listClients(ctx.user.id)),
    create: protectedProcedure.input(clientInput).mutation(({ ctx, input }) => createClient({ ...input, ownerId: ctx.user.id })),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), data: clientInput })).mutation(({ ctx, input }) => updateClient(ctx.user.id, input.id, input.data)),
    remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => removeClient(ctx.user.id, input.id)),
  }),
  services: router({
    list: protectedProcedure.query(({ ctx }) => listServices(ctx.user.id)),
    create: protectedProcedure.input(serviceInput).mutation(({ ctx, input }) => createService({ ...input, ownerId: ctx.user.id })),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), data: serviceInput })).mutation(({ ctx, input }) => updateService(ctx.user.id, input.id, input.data)),
    remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => removeService(ctx.user.id, input.id)),
  }),
  agenda: router({
    list: protectedProcedure.query(({ ctx }) => listAppointments(ctx.user.id)),
    create: protectedProcedure.input(appointmentInput).mutation(async ({ ctx, input }) => {
      const { endsAt } = await ensureAppointmentInput(ctx.user.id, input);
      return createAppointment({ ...input, endsAt, ownerId: ctx.user.id, status: "scheduled" });
    }),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), data: appointmentInput })).mutation(async ({ ctx, input }) => {
      const { endsAt } = await ensureAppointmentInput(ctx.user.id, input.data, input.id);
      return updateAppointment(ctx.user.id, input.id, { ...input.data, endsAt });
    }),
    cancel: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => cancelAppointment(ctx.user.id, input.id)),
  }),
});

export type AppRouter = typeof appRouter;
