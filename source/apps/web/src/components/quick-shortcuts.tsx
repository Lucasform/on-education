'use client';

import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  CalendarDays,
  FileSignature,
  Gauge,
  GraduationCap,
  Home,
  MessageSquare,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type Atalho = { id: string; label: string; href: string; icon: LucideIcon; school?: boolean };

// Catálogo de atalhos (ações de 1 clique). `school` = só aparece para escola (organization).
const CATALOGO: Atalho[] = [
  { id: 'inicio', label: 'Início', href: '/app', icon: Home },
  { id: 'wayon', label: 'Gerar com o WayOn', href: '/app/ia', icon: Sparkles },
  { id: 'atividades', label: 'Banco de atividades', href: '/app/atividades', icon: BookOpen },
  { id: 'calendario', label: 'Calendário', href: '/app/calendario', icon: CalendarDays },
  { id: 'turmas', label: 'Turmas', href: '/app/turmas', icon: GraduationCap, school: true },
  { id: 'alunos', label: 'Alunos', href: '/app/alunos', icon: Users, school: true },
  { id: 'comunicados', label: 'Comunicados', href: '/app/comunicados', icon: MessageSquare, school: true },
  { id: 'mensagens', label: 'Mensagens', href: '/app/mensagens', icon: MessageSquare, school: true },
  { id: 'matricula', label: 'Matrícula', href: '/app/matricula', icon: FileSignature, school: true },
  { id: 'diretor', label: 'Painel do diretor', href: '/app/diretor', icon: Gauge, school: true },
  { id: 'convites', label: 'Convidar equipe', href: '/app/escola/convites', icon: UserPlus, school: true },
];

const KEY = 'eduon:atalhos';
const DEFAULT = ['wayon', 'atividades', 'calendario', 'comunicados'];

/**
 * Atalhos personalizáveis no início: a pessoa escolhe os que mais usa e eles viram botões de 1
 * clique. Seleção salva no aparelho (localStorage), com modo "Editar atalhos".
 */
export function QuickShortcuts({ school }: { school: boolean }) {
  const catalogo = CATALOGO.filter((a) => !a.school || school);
  const [sel, setSel] = useState<string[]>(DEFAULT);
  const [edit, setEdit] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSel(JSON.parse(raw) as string[]);
    } catch {
      /* sem preferência salva: usa o padrão */
    }
    setReady(true);
  }, []);

  function toggle(id: string) {
    setSel((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignora */
      }
      return next;
    });
  }

  if (!ready) return null;
  const escolhidos = catalogo.filter((a) => sel.includes(a.id));

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium">Seus atalhos</h2>
        <button
          type="button"
          onClick={() => setEdit((e) => !e)}
          className="text-xs text-primary underline-offset-4 hover:underline"
        >
          {edit ? 'Concluir' : 'Editar atalhos'}
        </button>
      </div>

      {edit ? (
        <>
          <p className="mb-2 text-xs text-muted-foreground">
            Escolha os atalhos que você mais usa, eles abrem a ação em 1 clique.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {catalogo.map((a) => {
              const on = sel.includes(a.id);
              const Icon = a.icon;
              return (
                <label
                  key={a.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 transition-colors ${
                    on ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(a.id)}
                    className="h-4 w-4 shrink-0 accent-primary"
                  />
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm">{a.label}</span>
                </label>
              );
            })}
          </div>
        </>
      ) : escolhidos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Toque em “Editar atalhos” para escolher os que você mais usa.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {escolhidos.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.id}
                href={a.href}
                className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 text-sm transition-colors hover:border-primary/40 hover:bg-accent"
              >
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{a.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
