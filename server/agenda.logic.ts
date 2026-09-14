export function calculateEndAt(startsAt: number, durationMinutes: number) {
  if (!Number.isFinite(startsAt) || !Number.isInteger(startsAt) || startsAt <= 0) {
    throw new Error("O início do agendamento deve ser um timestamp válido.");
  }
  if (!Number.isFinite(durationMinutes) || !Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    throw new Error("A duração do serviço deve ser um número inteiro positivo.");
  }
  return startsAt + durationMinutes * 60_000;
}

export function rangesOverlap(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && endA > startB;
}
