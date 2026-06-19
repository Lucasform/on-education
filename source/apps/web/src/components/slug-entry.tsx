'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { authGhostBtn, authInput } from '@/components/brand-auth-screen';

/** Entrada pela marca da escola: a pessoa digita o link público (slug) e vai para /c/<slug>. */
export function SlugEntry() {
  const router = useRouter();
  const [slug, setSlug] = useState('');
  const clean = slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1 rounded-xl border border-white/15 bg-white/95 px-3">
        <span className="shrink-0 text-xs text-gray-400">eduonway.com/c/</span>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="sua-escola"
          className={`${authInput} border-0 bg-transparent px-1 shadow-none focus:ring-0`}
        />
      </div>
      <button
        type="button"
        disabled={!clean}
        onClick={() => clean && router.push(`/c/${clean}`)}
        className={`${authGhostBtn} disabled:opacity-40`}
      >
        Entrar pela minha escola
      </button>
    </div>
  );
}
