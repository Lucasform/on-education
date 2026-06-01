'use server';

import type { AuthContext } from '@on-education/auth';
import { approveDraft, discardDraft, generateDraft } from '@on-education/module-ia';
import { createClass, createStudent } from '@on-education/module-nucleo';
import { createActivity } from '@on-education/module-pedagogico';
import {
  createActivitySchema,
  createClassSchema,
  createStudentSchema,
  generateDraftSchema,
} from '@on-education/validation';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

async function requireCtx(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/signup');
  return ctx;
}

export async function createClassAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = createClassSchema.parse({
    name: formData.get('name'),
    description: (formData.get('description') as string) || undefined,
  });
  await createClass(db(), ctx, input);
  revalidatePath('/app');
}

export async function createStudentAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = createStudentSchema.parse({
    fullName: formData.get('fullName'),
    classId: (formData.get('classId') as string) || undefined,
  });
  await createStudent(db(), ctx, input);
  revalidatePath('/app');
}

export async function createActivityAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const tags = String(formData.get('tags') ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const input = createActivitySchema.parse({
    title: formData.get('title'),
    subject: (formData.get('subject') as string) || undefined,
    content: (formData.get('content') as string) || '',
    tags,
    aiGenerated: false,
  });
  await createActivity(db(), ctx, input);
  revalidatePath('/app');
}

export async function generateDraftAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = generateDraftSchema.parse({
    kind: formData.get('kind'),
    prompt: formData.get('prompt'),
  });
  // Usa o provider Anthropic default (exige ANTHROPIC_API_KEY). A UI só mostra o form
  // quando a IA está configurada; aqui a chamada lança erro legível se faltar a key.
  await generateDraft(db(), ctx, input);
  revalidatePath('/app');
}

export async function approveDraftAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const id = String(formData.get('id'));
  await approveDraft(db(), ctx, id);
  revalidatePath('/app');
}

export async function discardDraftAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const id = String(formData.get('id'));
  await discardDraft(db(), ctx, id);
  revalidatePath('/app');
}
