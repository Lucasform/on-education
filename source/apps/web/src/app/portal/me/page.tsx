import { getPortalBundle } from '@on-education/module-nucleo';
import { markCommunicationsRead } from '@on-education/module-comunicacao';
import { redirect } from 'next/navigation';

import { db } from '@/server/db';
import { getGuardianSession } from '@/server/guardian-session';

import { PortalClient } from './PortalClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Portal do Responsável · Edu On Way' };

export default async function PortalMePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const session = await getGuardianSession();
  if (!session) redirect('/portal/login');

  const client = db();
  const bundle = await getPortalBundle(client, session.guardianId, session.tenantId).catch(() => null);
  if (!bundle) redirect('/portal/login');

  if (bundle.communications.length > 0) {
    await markCommunicationsRead(
      client,
      session.tenantId,
      session.guardianId,
      bundle.communications.map((c) => c.id),
    ).catch(() => {});
  }

  const { ok, erro } = await searchParams;

  // Serializa Datas para o client component.
  const data = {
    ...bundle,
    communications: bundle.communications.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
    chat: bundle.chat.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
  };

  return <PortalClient data={data} ok={ok ?? null} erro={erro ?? null} />;
}
