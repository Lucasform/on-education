import {
  imagesLeftForTenant,
  isImageConfigured,
  listGeneratedImages,
} from '@on-education/module-ia';
import { redirect } from 'next/navigation';

import { AgentNameText } from '@/components/agent-name-provider';
import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { deleteGeneratedImageAction, generateImageAction } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Gerar imagem · Edu On Way' };

export default async function ImagemPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');

  const configurado = isImageConfigured();
  const [restantes, imagens] = await Promise.all([
    imagesLeftForTenant(db(), ctx).catch(() => 0),
    listGeneratedImages(db(), ctx).catch(() => []),
  ]);
  const semCota = restantes <= 0;
  const restantesLabel = restantes === Infinity ? 'ilimitadas' : `${restantes}`;

  return (
    <>
      <PageHeader
        title="Gerar imagem"
        description={<>O <AgentNameText /> cria ilustrações para flashcards, enunciados e capas. Imagem em texto legível.</>}
      />

      <div className={cardClass}>
        {!configurado ? (
          <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
            Geração de imagem indisponível. Configure <code>OPENAI_API_KEY</code> no ambiente.
          </p>
        ) : (
          <>
            <p className="mb-2 text-xs text-muted-foreground">
              Restantes este mês: <span className="font-medium">{restantesLabel}</span>
            </p>
            {semCota ? (
              <p className="rounded-md border border-warning/30 bg-warning/10 p-2 text-sm text-warning">
                Cota de imagens do mês atingida (ou plano sem imagem). O texto do <AgentNameText /> segue
                normal.
              </p>
            ) : (
              <form action={generateImageAction} className="flex flex-col gap-2">
                <textarea
                  name="prompt"
                  required
                  rows={3}
                  placeholder="Descreva a imagem (ex.: ilustração simples de um vulcão em corte, estilo livro didático, com rótulos)"
                  className={fieldClass}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <select name="size" defaultValue="quadrado" className={`${fieldClass} w-36`}>
                    <option value="quadrado">Quadrado</option>
                    <option value="horizontal">Horizontal</option>
                    <option value="vertical">Vertical (A4)</option>
                  </select>
                  <select name="frame" defaultValue="padrao" className={`${fieldClass} w-40`}>
                    <option value="padrao">Enquadramento padrão</option>
                    <option value="centralizado">Centralizado</option>
                    <option value="preenchido">Preenchido</option>
                  </select>
                  <select name="quality" defaultValue="low" className={`${fieldClass} w-36`}>
                    <option value="low">Econômica</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                  </select>
                  <SubmitButton type="submit" size="sm">
                    Gerar imagem
                  </SubmitButton>
                </div>
                <p className="text-xs text-muted-foreground">
                  Econômica custa menos e já serve para a maioria dos usos escolares.
                </p>
              </form>
            )}
          </>
        )}
      </div>

      {imagens.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {imagens.map((img) => (
            <div key={img.id} className={`${cardClass} p-2`}>
              {/* imagem gerada pelo tenant, no bucket público */}
              <img
                src={img.url}
                alt={img.prompt}
                loading="lazy"
                className="aspect-square w-full rounded-md object-cover"
              />
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{img.prompt}</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="flex gap-3">
                  <a
                    href={`/app/ia/imagem/${img.id}/baixar`}
                    className="text-xs text-primary hover:underline"
                  >
                    Baixar
                  </a>
                  <a
                    href={img.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    Visualizar
                  </a>
                </span>
                <form action={deleteGeneratedImageAction}>
                  <input type="hidden" name="id" value={img.id} />
                  <ConfirmButton size="sm" variant="ghost" message="Excluir esta imagem?">
                    Excluir
                  </ConfirmButton>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
