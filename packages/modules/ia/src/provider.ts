import { type AiTier, loadEnv, modelFor, requireEnv } from '@on-education/config';

/**
 * Contrato do provedor de IA (Fase 1B.2). Abstrai a chamada ao modelo para que a lógica de
 * cota/rascunho não dependa de um provedor específico e seja testável com um fake.
 */
/** Imagem para entrada multimodal (visão). `data` em base64; `mediaType` ex.: image/jpeg. */
export interface AiImage {
  data: string;
  mediaType: string;
}

export interface AiGenerationRequest {
  prompt: string;
  system?: string;
  /** Imagens para visão (ex.: foto da redação manuscrita). Opcional. */
  images?: AiImage[];
  /** Teto de tokens da resposta. Default 2048. */
  maxTokens?: number;
}

export interface AiGenerationResult {
  text: string;
  tokensIn: number;
  tokensOut: number;
  model: string;
}

export interface AiProvider {
  generate(req: AiGenerationRequest): Promise<AiGenerationResult>;
}

/** A IA está configurada? (sem ANTHROPIC_API_KEY, a geração fica indisponível.) */
export function isAiConfigured(): boolean {
  return Boolean(loadEnv().ANTHROPIC_API_KEY);
}

/**
 * Provedor Anthropic via REST (sem SDK). Modelo vem de config (nunca hardcoded, §9.1).
 * Guardrails (§9.3): o `prompt` é do próprio professor; conteúdo de upload (futuro) deve
 * entrar como dado NÃO confiável, nunca como instrução. Cache de prompt: TODO ao integrar.
 */
export function createAnthropicProvider(tier: AiTier = 'sonnet'): AiProvider {
  return {
    async generate(req: AiGenerationRequest): Promise<AiGenerationResult> {
      const apiKey = requireEnv('ANTHROPIC_API_KEY');
      const model = modelFor(tier);
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: req.maxTokens ?? 2048,
          system: req.system,
          messages: [
            {
              role: 'user',
              content: req.images?.length
                ? [
                    ...req.images.map((im) => ({
                      type: 'image',
                      source: { type: 'base64', media_type: im.mediaType, data: im.data },
                    })),
                    { type: 'text', text: req.prompt },
                  ]
                : req.prompt,
            },
          ],
        }),
      });
      if (!res.ok) {
        throw new Error(`Anthropic API erro ${res.status}: ${await res.text()}`);
      }
      const data = (await res.json()) as {
        content: { type: string; text?: string }[];
        usage: { input_tokens: number; output_tokens: number };
        model: string;
      };
      const text = data.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text ?? '')
        .join('');
      return {
        text,
        tokensIn: data.usage.input_tokens,
        tokensOut: data.usage.output_tokens,
        model: data.model,
      };
    },
  };
}
