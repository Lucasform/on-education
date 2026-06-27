/**
 * Referencia estrutural da BNCC (Base Nacional Comum Curricular).
 *
 * REGRA DE OURO: este arquivo NAO contém codigos de habilidade especificos (ex.: EF05LP01).
 * Codigos especificos sao 600+ e exigem verificacao na fonte oficial (basenacionalcomum.mec.gov.br).
 * A IA deve usar o padrao de codigo aqui descrito para montar/validar, e SEMPRE marcar
 * "(a confirmar)" quando nao tiver certeza absoluta do codigo exato.
 *
 * O que e seguro afirmar aqui e estavel e finito:
 *   - etapas, areas, componentes curriculares
 *   - campos de experiencia da Educacao Infantil
 *   - 10 Competencias Gerais
 *   - anatomia do codigo de habilidade
 */

// ---------------------------------------------------------------------------
// Etapas
// ---------------------------------------------------------------------------

export type Etapa = 'EI' | 'EF_AI' | 'EF_AF' | 'EM';

export const ETAPAS: Record<Etapa, { nome: string; descricao: string }> = {
  EI: {
    nome: 'Educacao Infantil',
    descricao: 'Creche (0-3 anos) e Pre-escola (4-5 anos). Organizada em Campos de Experiencia.',
  },
  EF_AI: {
    nome: 'Ensino Fundamental - Anos Iniciais',
    descricao: '1 ao 5 ano (6 a 10 anos aproximadamente).',
  },
  EF_AF: {
    nome: 'Ensino Fundamental - Anos Finais',
    descricao: '6 ao 9 ano (11 a 14 anos aproximadamente).',
  },
  EM: {
    nome: 'Ensino Medio',
    descricao: '1 a 3 serie (15 a 17 anos aproximadamente). Organizado em areas do conhecimento.',
  },
};

// ---------------------------------------------------------------------------
// Areas do Conhecimento e Componentes Curriculares
// ---------------------------------------------------------------------------

export interface ComponenteCurricular {
  nome: string;
  siglaCodigoHabilidade: string; // sigla usada no codigo de habilidade (ex.: LP, MA, CI)
  etapas: Etapa[];
}

export interface AreaConhecimento {
  nome: string;
  componentes: ComponenteCurricular[];
}

export const AREAS_CONHECIMENTO: AreaConhecimento[] = [
  {
    nome: 'Linguagens e suas Tecnologias',
    componentes: [
      {
        nome: 'Lingua Portuguesa',
        siglaCodigoHabilidade: 'LP',
        etapas: ['EF_AI', 'EF_AF', 'EM'],
      },
      {
        nome: 'Arte',
        siglaCodigoHabilidade: 'AR',
        etapas: ['EF_AI', 'EF_AF', 'EM'],
      },
      {
        nome: 'Educacao Fisica',
        siglaCodigoHabilidade: 'EF', // componente, diferente da etapa
        etapas: ['EF_AI', 'EF_AF', 'EM'],
      },
      {
        nome: 'Lingua Inglesa',
        siglaCodigoHabilidade: 'LI',
        etapas: ['EF_AF', 'EM'],
      },
    ],
  },
  {
    nome: 'Matematica e suas Tecnologias',
    componentes: [
      {
        nome: 'Matematica',
        siglaCodigoHabilidade: 'MA',
        etapas: ['EF_AI', 'EF_AF', 'EM'],
      },
    ],
  },
  {
    nome: 'Ciencias da Natureza e suas Tecnologias',
    componentes: [
      {
        nome: 'Ciencias',
        siglaCodigoHabilidade: 'CI',
        etapas: ['EF_AI', 'EF_AF'],
      },
      {
        nome: 'Biologia',
        siglaCodigoHabilidade: 'BI',
        etapas: ['EM'],
      },
      {
        nome: 'Fisica',
        siglaCodigoHabilidade: 'FI',
        etapas: ['EM'],
      },
      {
        nome: 'Quimica',
        siglaCodigoHabilidade: 'QU',
        etapas: ['EM'],
      },
    ],
  },
  {
    nome: 'Ciencias Humanas e Sociais Aplicadas',
    componentes: [
      {
        nome: 'Historia',
        siglaCodigoHabilidade: 'HI',
        etapas: ['EF_AI', 'EF_AF', 'EM'],
      },
      {
        nome: 'Geografia',
        siglaCodigoHabilidade: 'GE',
        etapas: ['EF_AI', 'EF_AF', 'EM'],
      },
      {
        nome: 'Ensino Religioso',
        siglaCodigoHabilidade: 'ER',
        etapas: ['EF_AI', 'EF_AF'],
      },
      {
        nome: 'Filosofia',
        siglaCodigoHabilidade: 'FL',
        etapas: ['EM'],
      },
      {
        nome: 'Sociologia',
        siglaCodigoHabilidade: 'SO',
        etapas: ['EM'],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Campos de Experiencia (Educacao Infantil)
// ---------------------------------------------------------------------------

export interface CampoExperiencia {
  nome: string;
  foco: string;
}

/**
 * Os 5 Campos de Experiencia da Educacao Infantil, conforme BNCC (pag. 38-53).
 * Nomenclatura oficial, estavel e verificavel na fonte publica.
 */
export const CAMPOS_EXPERIENCIA: CampoExperiencia[] = [
  {
    nome: 'O eu, o outro e o nos',
    foco:
      'Construcao da identidade, relacoes sociais, etica, diversidade cultural, convivencia e participacao.',
  },
  {
    nome: 'Corpo, gestos e movimentos',
    foco:
      'Expressao corporal, danca, jogo dramatico, exploracao do espaco e do proprio corpo.',
  },
  {
    nome: 'Tracos, sons, cores e formas',
    foco:
      'Expressao artistica visual e musical, contato com diferentes linguagens e producoes culturais.',
  },
  {
    nome: 'Escuta, fala, pensamento e imaginacao',
    foco:
      'Desenvolvimento da oralidade, contato com a lingua escrita, narrativas, imagens e letramentos.',
  },
  {
    nome: 'Espacos, tempos, quantidades, relacoes e transformacoes',
    foco:
      'Curiosidade sobre o mundo fisico e natural, nocoes de espaco, tempo, medida e pensamento matematico.',
  },
];

// ---------------------------------------------------------------------------
// Competencias Gerais da BNCC (texto resumido e fiel)
// ---------------------------------------------------------------------------

export interface CompetenciaGeral {
  numero: number;
  nome: string;
  resumo: string;
}

/**
 * As 10 Competencias Gerais da BNCC, com texto resumido fiel ao original.
 * Fonte: BNCC, MEC, 3a edicao, 2018, pag. 9-10.
 * O texto completo esta disponivel em basenacionalcomum.mec.gov.br.
 */
export const COMPETENCIAS_GERAIS: CompetenciaGeral[] = [
  {
    numero: 1,
    nome: 'Conhecimento',
    resumo:
      'Valorizar e utilizar os conhecimentos historicamente construidos sobre o mundo fisico, social, cultural e digital, investigando, refletindo e criando solucoes.',
  },
  {
    numero: 2,
    nome: 'Pensamento cientifico, critico e criativo',
    resumo:
      'Exercitar a curiosidade intelectual, usar abordagens proprias das ciencias, incluindo investigacao, reflexao, analise critica, criatividade e revisao de hipoteses.',
  },
  {
    numero: 3,
    nome: 'Repertorio cultural',
    resumo:
      'Valorizar e fruir as diversas manifestacoes artisticas e culturais, participando de praticas diversificadas de sua producao.',
  },
  {
    numero: 4,
    nome: 'Comunicacao',
    resumo:
      'Utilizar diferentes linguagens (verbal, corporal, visual, sonora e digital) para expressar e partilhar informacoes, experiencias, ideias e sentimentos.',
  },
  {
    numero: 5,
    nome: 'Cultura digital',
    resumo:
      'Compreender, utilizar e criar tecnologias digitais de forma critica, significativa, reflexiva e etica para comunicacao, acesso ao conhecimento e resolucao de problemas.',
  },
  {
    numero: 6,
    nome: 'Trabalho e projeto de vida',
    resumo:
      'Valorizar a diversidade de saberes e vivencias culturais e apropriar-se de conhecimentos e experiencias para fazer escolhas alinhadas ao exercicio da cidadania e ao projeto de vida.',
  },
  {
    numero: 7,
    nome: 'Argumentacao',
    resumo:
      'Argumentar com base em fatos, dados e informacoes confiaveis para formular, negociar e defender ideias e pontos de vista com etica e responsabilidade.',
  },
  {
    numero: 8,
    nome: 'Autoconhecimento e autocuidado',
    resumo:
      'Conhecer-se, apreciar-se e cuidar da saude fisica e emocional, compreendendo-se na diversidade humana e preservando o bem-estar.',
  },
  {
    numero: 9,
    nome: 'Empatia e cooperacao',
    resumo:
      'Exercitar a empatia, o dialogo, a resolucao de conflitos e a cooperacao, acolhendo e valorizando a diversidade, sem preconceitos.',
  },
  {
    numero: 10,
    nome: 'Responsabilidade e cidadania',
    resumo:
      'Agir pessoal e coletivamente com autonomia, responsabilidade, flexibilidade, resiliencia e determinacao, comprometendo-se com o bem comum.',
  },
];

// ---------------------------------------------------------------------------
// Anatomia do Codigo de Habilidade
// ---------------------------------------------------------------------------

/**
 * Como interpretar um codigo de habilidade BNCC.
 *
 * Formato geral: [ETAPA][ANO_OU_FASE][COMPONENTE][SEQUENCIA]
 *
 * Exemplos de prefixos por etapa:
 *   EI - Educacao Infantil  (ex.: EI03EO01)
 *   EF - Ensino Fundamental (ex.: EF05LP01, EF09HI03)
 *   EM - Ensino Medio       (ex.: EM13LP01, EM13MAT201)
 *
 * Segmentos:
 *   - EI: 2 digitos de fase/grupo (01=bebe, 02=crianca bem pequena, 03=crianca pequena)
 *   - EF: 2 digitos do ano escolar (01 a 09)
 *   - EM: "13" indica o Ensino Medio como um todo (1a a 3a serie)
 *   - Sigla do componente (LP, MA, CI, AR, EF, HI, GE, ER, LI, BI, FI, QU, FL, SO)
 *   - Para EI: sigla do campo (EO, CG, TS, EF como abrev. diferente, ET)
 *   - Numero sequencial com 2 a 3 digitos
 *
 * ATENCAO: a IA NAO deve inventar combinacoes. Deve citar o codigo somente
 * quando tiver certeza absoluta; caso contrario, usar "(a confirmar)".
 */
export const ANATOMIA_CODIGO_HABILIDADE = {
  formato: '[ETAPA][ANO_OU_FASE][SIGLA_COMPONENTE][SEQUENCIA]',
  exemplos: [
    { codigo: 'EF05LP01', leitura: 'Ensino Fundamental, 5o ano, Lingua Portuguesa, habilidade 01' },
    { codigo: 'EF09HI03', leitura: 'Ensino Fundamental, 9o ano, Historia, habilidade 03' },
    { codigo: 'EM13LP01', leitura: 'Ensino Medio (todos os anos), Lingua Portuguesa, habilidade 01' },
    { codigo: 'EI03EO01', leitura: 'Educacao Infantil, crianca pequena (4-5 anos), campo O eu o outro e o nos, habilidade 01' },
  ],
  aviso:
    'Os exemplos acima ilustram o FORMATO; nao garantem que esses codigos especificos existam tal como escritos. ' +
    'Verificar sempre em basenacionalcomum.mec.gov.br antes de publicar em material escolar.',
};

// ---------------------------------------------------------------------------
// Funcao bnccGuidance
// ---------------------------------------------------------------------------

export interface BnccGuidanceInput {
  componente?: string;
  ano?: string;
  etapa?: string;
}

/**
 * Retorna um bloco de orientacao para injetar no prompt da IA.
 * Derivado inteiramente da estrutura acima; nenhum codigo de habilidade e inventado.
 *
 * @param input - componente curricular (ex.: "Matematica"), ano (ex.: "5") e/ou etapa (ex.: "EF_AI")
 */
export function bnccGuidance(input: BnccGuidanceInput): string {
  const partes: string[] = [];

  // --- Identificar etapa ---
  const etapaChave = resolveEtapa(input.etapa, input.ano);
  const etapaInfo = etapaChave ? ETAPAS[etapaChave] : null;

  if (etapaInfo) {
    partes.push(`Etapa: ${etapaInfo.nome}. ${etapaInfo.descricao}`);
  } else {
    partes.push(
      'Etapa nao identificada: adapte o conteudo ao nivel real do aluno conforme informado.'
    );
  }

  // --- Campos de experiencia para Educacao Infantil ---
  if (etapaChave === 'EI') {
    partes.push(
      'Na Educacao Infantil, o trabalho se organiza em 5 Campos de Experiencia, nao em "materias": ' +
        CAMPOS_EXPERIENCIA.map((c) => `"${c.nome}" (${c.foco})`).join('; ') +
        '. Use linguagem propria da infancia; evite o termo "disciplina".'
    );
  }

  // --- Componente curricular ---
  if (input.componente) {
    const componenteEncontrado = encontrarComponente(input.componente);
    if (componenteEncontrado) {
      partes.push(
        `Componente curricular: ${componenteEncontrado.nome}. ` +
          `Sigla no codigo de habilidade: "${componenteEncontrado.siglaCodigoHabilidade}".`
      );
    } else {
      partes.push(
        `Componente informado: "${input.componente}". Verifique a nomenclatura oficial da BNCC.`
      );
    }
  }

  // --- Competencias Gerais pertinentes ---
  partes.push(
    'Procure articular o conteudo com as Competencias Gerais da BNCC relevantes ao tema. ' +
      'As 10 competencias sao: ' +
      COMPETENCIAS_GERAIS.map((c) => `${c.numero}. ${c.nome}`).join(', ') +
      '. Mencione pelo menos 1 competencia aplicavel ao contexto.'
  );

  // --- Instrucao sobre codigos de habilidade ---
  partes.push(
    'Ao citar habilidades BNCC: use o formato ' +
      ANATOMIA_CODIGO_HABILIDADE.formato +
      ' (ex.: ' +
      ANATOMIA_CODIGO_HABILIDADE.exemplos.map((e) => e.codigo).join(', ') +
      '). ' +
      'REGRA INVIOLAVEL: NUNCA invente ou suponha um codigo. ' +
      'Se tiver certeza absoluta do codigo, cite-o. ' +
      'Se tiver qualquer duvida, escreva o codigo como "(a confirmar)" e descreva a habilidade por extenso. ' +
      'Em material escolar, um codigo errado e muito mais prejudicial do que nao citar nenhum.'
  );

  return partes.join(' ');
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function resolveEtapa(etapa?: string, ano?: string): Etapa | null {
  if (etapa) {
    const chave = etapa.toUpperCase() as Etapa;
    if (chave in ETAPAS) return chave;
    // tentativa por nome parcial
    if (etapa.toLowerCase().includes('infantil')) return 'EI';
    if (etapa.toLowerCase().includes('medio') || etapa.toLowerCase().includes('médio')) return 'EM';
    if (etapa.toLowerCase().includes('iniciais') || etapa.toLowerCase().includes('fundamental')) {
      const anoNum = ano ? parseInt(ano, 10) : NaN;
      if (!isNaN(anoNum) && anoNum >= 6) return 'EF_AF';
      return 'EF_AI';
    }
  }

  if (ano) {
    const anoNum = parseInt(ano, 10);
    if (!isNaN(anoNum)) {
      if (anoNum >= 1 && anoNum <= 5) return 'EF_AI';
      if (anoNum >= 6 && anoNum <= 9) return 'EF_AF';
    }
  }

  return null;
}

function encontrarComponente(nome: string): ComponenteCurricular | null {
  const nomeLower = nome.toLowerCase().trim();
  for (const area of AREAS_CONHECIMENTO) {
    for (const comp of area.componentes) {
      if (comp.nome.toLowerCase().includes(nomeLower) || nomeLower.includes(comp.nome.toLowerCase())) {
        return comp;
      }
    }
  }
  return null;
}
