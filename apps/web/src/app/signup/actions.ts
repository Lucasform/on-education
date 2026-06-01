'use server';

import crypto from 'node:crypto';

import { provisionIndividualTenant } from '@on-education/module-nucleo';
import { individualSignupSchema } from '@on-education/validation';
import { redirect } from 'next/navigation';

import { db } from '@/server/db';
import { setSession } from '@/server/session';

/**
 * Signup self-service do professor autônomo (Fase 1B.1). Provisiona um tenant `individual`
 * e abre a sessão. O `userId` é gerado aqui como stopgap; com Supabase Auth virá do usuário
 * autenticado (o provisionamento permanece igual).
 */
export async function signupAction(formData: FormData): Promise<void> {
  const input = individualSignupSchema.parse({
    ownerEmail: formData.get('ownerEmail'),
    ownerName: formData.get('ownerName'),
    workspaceName: (formData.get('workspaceName') as string) || undefined,
  });

  const userId = crypto.randomUUID();
  const { tenantId } = await provisionIndividualTenant(db(), userId, input);
  await setSession({ userId, tenantId, tenantType: 'individual', roles: ['owner', 'teacher'] });
  redirect('/app');
}
