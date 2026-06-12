import 'server-only';

import type { AuthContext } from '@on-education/auth';
import type { DbClient } from '@on-education/db';
import { listAcademicYears, listEvents } from '@on-education/module-nucleo';

/** Dias letivos mínimos por ano (LDB/MEC: 200 dias letivos na educação básica). */
export const DIAS_LETIVOS_MEC = 200;

export type DayType = 'letivo' | 'fim_de_semana' | 'feriado' | 'recesso' | 'evento';

export interface CalDay {
  date: string; // YYYY-MM-DD
  day: number; // dia do mês
  weekday: number; // 0=dom..6=sáb
  type: DayType;
  title?: string;
}

export interface SchoolCalendar {
  yearName: string;
  start: string;
  end: string;
  meses: { ano: number; mes: number; dias: CalDay[] }[];
  letivos: number;
  required: number;
  faltam: number;
  feriados: number;
  recessos: number;
  eventos: number;
}

/**
 * Monta o calendário escolar do ano letivo configurado (com início/fim). Conta os DIAS LETIVOS
 * automaticamente: dia útil (seg–sex) que NÃO seja feriado/recesso. Eventos em dia útil ainda
 * contam como letivo (não cancelam aula). Retorna null se não houver ano letivo com datas.
 */
export async function buildSchoolCalendar(
  client: DbClient,
  ctx: AuthContext,
): Promise<SchoolCalendar | null> {
  const [anos, eventos] = await Promise.all([
    listAcademicYears(client, ctx).catch(() => []),
    listEvents(client, ctx).catch(() => []),
  ]);
  const ano = anos
    .filter((a) => a.startsOn && a.endsOn)
    .sort((a, b) => String(b.startsOn).localeCompare(String(a.startsOn)))[0];
  if (!ano?.startsOn || !ano?.endsOn) return null;

  // Um marcador por data (feriado/recesso têm prioridade sobre evento comum).
  const byDate = new Map<string, { kind: string; title: string }>();
  for (const e of eventos) {
    const cur = byDate.get(e.date);
    if (!cur || e.kind === 'feriado' || e.kind === 'recesso') {
      byDate.set(e.date, { kind: e.kind, title: e.title });
    }
  }

  const meses: SchoolCalendar['meses'] = [];
  let letivos = 0;
  let feriados = 0;
  let recessos = 0;
  let eventosCount = 0;

  const start = new Date(`${ano.startsOn}T00:00:00Z`);
  const end = new Date(`${ano.endsOn}T00:00:00Z`);
  for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    const wd = d.getUTCDay();
    const ev = byDate.get(iso);
    const fimDeSemana = wd === 0 || wd === 6;

    let type: DayType;
    if (ev?.kind === 'feriado') {
      type = 'feriado';
      feriados++;
    } else if (ev?.kind === 'recesso') {
      type = 'recesso';
      recessos++;
    } else if (fimDeSemana) {
      type = 'fim_de_semana';
    } else if (ev) {
      type = 'evento';
      eventosCount++;
      letivos++; // evento em dia útil continua sendo dia letivo
    } else {
      type = 'letivo';
      letivos++;
    }

    const anoN = d.getUTCFullYear();
    const mesN = d.getUTCMonth();
    let bucket = meses[meses.length - 1];
    if (!bucket || bucket.ano !== anoN || bucket.mes !== mesN) {
      bucket = { ano: anoN, mes: mesN, dias: [] };
      meses.push(bucket);
    }
    bucket.dias.push({ date: iso, day: d.getUTCDate(), weekday: wd, type, title: ev?.title });
  }

  return {
    yearName: ano.name,
    start: ano.startsOn,
    end: ano.endsOn,
    meses,
    letivos,
    required: DIAS_LETIVOS_MEC,
    faltam: Math.max(0, DIAS_LETIVOS_MEC - letivos),
    feriados,
    recessos,
    eventos: eventosCount,
  };
}
