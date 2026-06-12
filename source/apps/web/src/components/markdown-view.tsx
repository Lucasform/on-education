'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Renderiza markdown (títulos, negrito, tabelas GFM, listas, citações) de forma SEGURA — não
 * interpreta HTML cru. Usado para exibir o conteúdo gerado pelo WayOn já formatado e no nosso
 * estilo, em vez do markdown aparecer cru (##, **, |...|).
 */
export function MarkdownView({
  children,
  className = '',
}: {
  children: string;
  className?: string;
}) {
  return (
    <div
      className={`prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-hr:my-4 prose-table:text-xs ${className}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
