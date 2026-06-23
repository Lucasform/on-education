'use server';

import {
  createLibraryItem,
  deleteLibraryItem,
  loanLibraryItem,
  returnLibraryLoan,
} from '@on-education/module-nucleo';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

async function requireCtx() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  return ctx;
}

export async function createLibraryItemAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await createLibraryItem(db(), ctx, {
    title: String(formData.get('title') ?? ''),
    author: (formData.get('author') as string) || null,
    code: (formData.get('code') as string) || null,
  });
  revalidatePath('/app/biblioteca');
}

export async function deleteLibraryItemAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await deleteLibraryItem(db(), ctx, String(formData.get('id')));
  revalidatePath('/app/biblioteca');
}

export async function loanLibraryItemAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await loanLibraryItem(db(), ctx, {
    itemId: String(formData.get('itemId') ?? ''),
    borrowerName: String(formData.get('borrowerName') ?? ''),
    studentId: (formData.get('studentId') as string) || null,
    dueDate: (formData.get('dueDate') as string) || null,
  });
  revalidatePath('/app/biblioteca');
}

export async function returnLibraryLoanAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await returnLibraryLoan(db(), ctx, String(formData.get('id')));
  revalidatePath('/app/biblioteca');
}
