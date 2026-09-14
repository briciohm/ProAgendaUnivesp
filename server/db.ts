import { and, asc, desc, eq, gt, lt, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  appointments,
  clients,
  InsertAppointment,
  InsertClient,
  InsertService,
  InsertUser,
  services,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  values.lastSignedIn ??= new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listClients(ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db.select().from(clients).where(eq(clients.ownerId, ownerId)).orderBy(asc(clients.name));
}

export async function createClient(data: InsertClient) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db.insert(clients).values(data);
}

export async function updateClient(ownerId: number, id: number, data: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db.update(clients).set(data).where(and(eq(clients.id, id), eq(clients.ownerId, ownerId)));
}

export async function removeClient(ownerId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db.delete(clients).where(and(eq(clients.id, id), eq(clients.ownerId, ownerId)));
}

export async function listServices(ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db.select().from(services).where(eq(services.ownerId, ownerId)).orderBy(asc(services.name));
}

export async function createService(data: InsertService) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db.insert(services).values(data);
}

export async function updateService(ownerId: number, id: number, data: Partial<InsertService>) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db.update(services).set(data).where(and(eq(services.id, id), eq(services.ownerId, ownerId)));
}

export async function removeService(ownerId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db.delete(services).where(and(eq(services.id, id), eq(services.ownerId, ownerId)));
}

export async function getService(ownerId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const rows = await db.select().from(services).where(and(eq(services.id, id), eq(services.ownerId, ownerId))).limit(1);
  return rows[0];
}

export async function getClient(ownerId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const rows = await db.select().from(clients).where(and(eq(clients.id, id), eq(clients.ownerId, ownerId))).limit(1);
  return rows[0];
}

export async function listAppointments(ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db
    .select({
      id: appointments.id,
      ownerId: appointments.ownerId,
      clientId: appointments.clientId,
      serviceId: appointments.serviceId,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      notes: appointments.notes,
      clientName: clients.name,
      serviceName: services.name,
      durationMinutes: services.durationMinutes,
      priceCents: services.priceCents,
      color: services.color,
    })
    .from(appointments)
    .leftJoin(clients, eq(appointments.clientId, clients.id))
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .where(eq(appointments.ownerId, ownerId))
    .orderBy(asc(appointments.startsAt))
    .limit(250);
}

export async function hasAppointmentConflict(ownerId: number, startsAt: number, endsAt: number, exceptId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const filters = [
    eq(appointments.ownerId, ownerId),
    ne(appointments.status, "cancelled"),
    lt(appointments.startsAt, endsAt),
    gt(appointments.endsAt, startsAt),
  ];
  if (exceptId) filters.push(ne(appointments.id, exceptId));
  const rows = await db.select({ id: appointments.id }).from(appointments).where(and(...filters)).limit(1);
  return Boolean(rows[0]);
}

export async function createAppointment(data: InsertAppointment) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db.insert(appointments).values(data);
}

export async function updateAppointment(ownerId: number, id: number, data: Partial<InsertAppointment>) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db.update(appointments).set(data).where(and(eq(appointments.id, id), eq(appointments.ownerId, ownerId)));
}

export async function cancelAppointment(ownerId: number, id: number) {
  return updateAppointment(ownerId, id, { status: "cancelled" });
}

export async function countTodayAppointments(ownerId: number, start: number, end: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const rows = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(and(eq(appointments.ownerId, ownerId), ne(appointments.status, "cancelled"), gt(appointments.startsAt, start), lt(appointments.startsAt, end)));
  return rows.length;
}
