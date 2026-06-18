import { updateTenantSlugAction } from '@/app/app/actions';
import { cardClass, fieldClass } from '@/components/form';
import { SubmitButton } from '@/components/submit-button';

/**
 * Card de "link público" (slug de marca): eduonway.com/c/<slug>. Usado na personalização da
 * escola e nas configurações do professor. A validação/unicidade vive no service.
 */
export function SlugCard({
  current,
  ok,
  erro,
}: {
  current: string | null;
  ok?: string;
  erro?: string;
}) {
  return (
    <div className={cardClass}>
      <h2 className="mb-1 text-sm font-medium">Seu link público</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Endereço da sua página de entrada com a sua marca (logo e cor). Compartilhe com alunos e
        responsáveis. Use só letras minúsculas, números e hífen.
      </p>

      {ok && (
        <p className="mb-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
          Link salvo: eduonway.com/c/{ok}
        </p>
      )}
      {erro && (
        <p className="mb-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {decodeURIComponent(erro)}
        </p>
      )}

      <form action={updateTenantSlugAction} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
          Link
          <div className="flex items-center gap-1">
            <span className="shrink-0 text-sm text-muted-foreground">eduonway.com/c/</span>
            <input
              name="slug"
              defaultValue={current ?? ''}
              maxLength={40}
              placeholder="minha-escola"
              className={fieldClass}
            />
          </div>
        </label>
        <SubmitButton type="submit" size="sm">
          Salvar link
        </SubmitButton>
      </form>

      {current && (
        <p className="mt-2 text-xs text-muted-foreground">
          Atual:{' '}
          <a href={`/c/${current}`} className="text-primary hover:underline">
            eduonway.com/c/{current}
          </a>
        </p>
      )}
    </div>
  );
}
