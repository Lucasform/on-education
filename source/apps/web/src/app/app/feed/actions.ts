'use server';

import {
  addComment,
  createPost,
  createStory,
  deletePost,
  deleteStory,
  toggleReaction,
} from '@on-education/module-comunicacao';
import { getPublicTenantBrand } from '@on-education/module-nucleo';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';
import { uploadFeedImage } from '@/server/storage';

async function requireCtx() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  return ctx;
}

export async function createPostAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const body = String(formData.get('body') ?? '');
  const classId = String(formData.get('classId') ?? '') || null;
  const file = formData.get('image');
  let imageUrl: string | null = null;
  if (file instanceof File && file.size > 0) {
    imageUrl = await uploadFeedImage(ctx.tenantId, file);
  }
  const brand = await getPublicTenantBrand(db(), ctx.tenantId).catch(() => null);
  await createPost(db(), ctx, { body, imageUrl, classId, authorName: brand?.name ?? null });
  revalidatePath('/app/feed');
}

export async function deletePostAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const id = String(formData.get('id') ?? '');
  if (id) await deletePost(db(), ctx, id);
  revalidatePath('/app/feed');
}

export async function toggleLikeAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const postId = String(formData.get('postId') ?? '');
  if (postId) await toggleReaction(db(), ctx, postId);
  revalidatePath('/app/feed');
}

export async function addCommentAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const postId = String(formData.get('postId') ?? '');
  const body = String(formData.get('body') ?? '');
  const brand = await getPublicTenantBrand(db(), ctx.tenantId).catch(() => null);
  if (postId && body.trim()) await addComment(db(), ctx, postId, body, brand?.name ?? null);
  revalidatePath('/app/feed');
}

export async function createStoryAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const caption = String(formData.get('caption') ?? '') || null;
  const file = formData.get('image');
  if (file instanceof File && file.size > 0) {
    const imageUrl = await uploadFeedImage(ctx.tenantId, file);
    await createStory(db(), ctx, { imageUrl, caption });
  }
  revalidatePath('/app/feed');
}

export async function deleteStoryAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const id = String(formData.get('id') ?? '');
  if (id) await deleteStory(db(), ctx, id);
  revalidatePath('/app/feed');
}
