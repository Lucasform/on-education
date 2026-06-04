'use client';

import { useRef } from 'react';

import { uploadLogoAction } from '@/app/app/actions';

import { SubmitButton } from './submit-button';

/**
 * Upload da logo da escola. Form próprio (não aninha no form de personalização): ao escolher
 * o arquivo, envia automaticamente; o `SubmitButton` serve de fallback e mostra o estado.
 */
export function LogoUpload({ currentUrl }: { currentUrl: string | null }) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={uploadLogoAction} className="flex flex-wrap items-center gap-3">
      {currentUrl ? (
        <img
          src={currentUrl}
          alt="Logo atual da escola"
          className="h-14 w-14 rounded-lg border border-border object-cover"
        />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-border text-[10px] text-muted-foreground">
          sem logo
        </div>
      )}
      <div className="flex flex-col gap-1">
        <input
          type="file"
          name="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          required
          aria-label="Arquivo da logo"
          onChange={(e) => {
            if (e.target.files?.length) formRef.current?.requestSubmit();
          }}
          className="text-xs file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs"
        />
        <span className="text-[11px] text-muted-foreground">
          PNG, JPG, SVG ou WEBP, até 2 MB. Envia ao escolher.
        </span>
      </div>
      <SubmitButton type="submit" size="sm" variant="outline">
        Enviar
      </SubmitButton>
    </form>
  );
}
