'use server';

import type { AuthContext } from '@on-education/auth';
import { approveDraft, discardDraft, generateDraft } from '@on-education/module-ia';
import {
  createAcademicYear,
  createClass,
  createGuardian,
  createStudent,
  createSubject,
  createTerm,
  createUnit,
  inviteMember,
} from '@on-education/module-nucleo';
import { createActivity } from '@on-education/module-pedagogico';
import {
  createAcademicYearSchema,
  createActivitySchema,
  createClassSchema,
  createGuardianSchema,
  createStudentSchema,
  createSubjectSchema,
  createTermSchema,
  createUnitSchema,
  generateDraftSchema,
  inviteMemberSchema,
} from '@on-education/validation';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { db } from '@/server/db';
import { getAuthContext, signOut } from '@/server/session';

export async function logoutAction(): Promise<void> {
  await signOut();
  redirect('/login');
}

async function requireCtx(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  return ctx;
}

export async function createClassAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = createClassSchema.parse({
    name: formData.get('name'),
    description: (formData.get('description') as string) || undefined,
  });
  await createClass(db(), ctx, input);
  revalidatePath('/app', 'layout');
}

export async function createStudentAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = createStudentSchema.parse({
    fullName: formData.get('fullName'),
    classId: (formData.get('classId') as string) || undefined,
  });
  await createStudent(db(), ctx, input);
  revalidatePath('/app', 'layout');
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
  revalidatePath('/app', 'layout');
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
  revalidatePath('/app', 'layout');
}

export async function approveDraftAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const id = String(formData.get('id'));
  await approveDraft(db(), ctx, id);
  revalidatePath('/app', 'layout');
}

export async function discardDraftAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const id = String(formData.get('id'));
  await discardDraft(db(), ctx, id);
  revalidatePath('/app', 'layout');
}

// --- Escola (organization) — Fase 1A.1 ---------------------------------------

export async function createUnitAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = createUnitSchema.parse({ name: formData.get('name') });
  await createUnit(db(), ctx, input);
  revalidatePath('/app', 'layout');
}

export async function inviteMemberAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = inviteMemberSchema.parse({
    email: formData.get('email'),
    role: formData.get('role'),
  });
  await inviteMember(db(), ctx, input);
  revalidatePath('/app', 'layout');
}

export async function createAcademicYearAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = createAcademicYearSchema.parse({
    name: formData.get('name'),
    startsOn: (formData.get('startsOn') as string) || undefined,
    endsOn: (formData.get('endsOn') as string) || undefined,
  });
  await createAcademicYear(db(), ctx, input);
  revalidatePath('/app', 'layout');
}

export async function createTermAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = createTermSchema.parse({
    academicYearId: formData.get('academicYearId'),
    name: formData.get('name'),
  });
  await createTerm(db(), ctx, input);
  revalidatePath('/app', 'layout');
}

export async function createSubjectAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = createSubjectSchema.parse({ name: formData.get('name') });
  await createSubject(db(), ctx, input);
  revalidatePath('/app', 'layout');
}

export async function createGuardianAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = createGuardianSchema.parse({
    fullName: formData.get('fullName'),
    email: (formData.get('email') as string) || undefined,
    phone: (formData.get('phone') as string) || undefined,
  });
  await createGuardian(db(), ctx, input);
  revalidatePath('/app', 'layout');
}
