/**
 * Fonte ÚNICA do "estilo da casa" pedagógico, derivada das skills BNCC instaladas (atividades,
 * plano de aula, prova/simulado, correção, relatório, plano de estudo).
 *
 * É a camada 1 do kernel de geração:
 *   skill spec -> padrão do tenant (applyAiStandard) -> memória de rating (buildTrainingContext)
 *   -> pedido do professor.
 *
 * ADITIVO por princípio: enriquece o prompt sem remover o comportamento atual de cada gerador.
 * - `BNCC_ALIGNMENT`: bloco leve, seguro para anexar em QUALQUER gerador (não muda formato, só
 *   garante o alinhamento curricular e a regra "(a confirmar)").
 * - `contentSkill(type)`: spec mais completo, para os geradores ainda pouco afinados.
 */

export type ContentType =
  | 'activity'
  | 'lesson_plan'
  | 'exam'
  | 'quiz'
  | 'correction'
  | 'essay'
  | 'report'
  | 'study_plan'
  | 'tutor'
  | 'outro';

const PT = ' Responda em português do Brasil. Não use travessão no meio de frase.';

/** Alinhamento curricular BNCC. Não impõe formato; só garante o "encaixe" e a regra do código. */
export const BNCC_ALIGNMENT =
  ' Alinhe à BNCC: respeite a etapa (Educação Infantil, Fundamental ou Médio), o ano/faixa e o ' +
  'componente curricular (ou campo de experiência, no Infantil), adequando vocabulário e ' +
  'dificuldade à idade real. Quando citar habilidade, use o código no formato ' +
  '[ETAPA][ANO][COMPONENTE][NUM] (ex.: EF05MA10, EM13LGG101, EI03EO01); NUNCA invente código: se ' +
  'não tiver certeza do exato, escreva "(a confirmar)" e descreva a habilidade por extenso.';

export function contentSkill(type: ContentType): string {
  switch (type) {
    case 'activity':
      // O gerador de atividade já tem prompt afinado (folha limpa do aluno). Aqui só reforçamos o
      // alinhamento; o cabeçalho BNCC fica como metadado para o professor, não polui a folha.
      return BNCC_ALIGNMENT + PT;

    case 'lesson_plan':
      return (
        ' Você é um educador sênior montando um PLANO DE AULA (roteiro do professor, não material do ' +
        'aluno).' +
        BNCC_ALIGNMENT +
        ' Entregue nesta ordem: cabeçalho (etapa, ano, componente, tema, duração, professor e data em ' +
        'branco); habilidades BNCC com texto; 2 a 4 objetivos observáveis (verbo no início, ligados às ' +
        'habilidades); competências gerais ativadas por número e nome; sequência didática com tempos ' +
        '(introdução, desenvolvimento, fechamento) que SOMAM a duração; recursos e materiais; ' +
        'metodologia e por que cabe ao tema; diferenciação e inclusão; avaliação formativa com ' +
        'critério; tarefa de casa opcional. Modo sequência didática quando pedido: visão geral, mapa ' +
        'das aulas (Aula/Foco/Habilidade/Objetivo) e avaliação somativa. No Infantil fale em campos de ' +
        'experiência e direitos de aprendizagem, nunca em "matéria". Cada seção precisa ser acionável.' +
        PT
      );

    case 'exam':
      return (
        ' Gere uma PROVA/AVALIAÇÃO somativa imprimível.' +
        BNCC_ALIGNMENT +
        ' Inclua, nesta ordem: cabeçalho (escola, componente, ano, professor, aluno, data, valor) com ' +
        'instruções; questões numeradas e pontuadas (objetivas A-D no Fundamental, A-E no Médio; ' +
        'dissertativas com espaço para resposta); matriz de referência (tabela questão x habilidade ' +
        'BNCC x dificuldade); gabarito COMENTADO (a resposta certa e o porquê, inclusive por que as ' +
        'distratoras erram); cartão-resposta destacável. Modo SIMULADO (apenas Ensino Médio, estilo ' +
        'ENEM): cubra as 4 áreas pedidas, cada questão com texto-base e 5 alternativas contextualizadas. ' +
        'Distratoras plausíveis (erros comuns reais), nunca absurdas. Respeite nº de questões, tipo e ' +
        'dificuldade pedidos.' +
        PT
      );

    case 'quiz':
      return (
        ' Gere um QUIZ curto e formativo (3 a 5 questões), objetivo, com gabarito comentado (o porquê).' +
        BNCC_ALIGNMENT +
        ' Foco em checagem rápida de aprendizagem.' +
        PT
      );

    case 'correction':
    case 'essay':
      return (
        ' Você corrige a produção do aluno e devolve um FEEDBACK QUE ENSINA, calibrado à idade, sempre ' +
        'encorajador e nunca humilhante. Comece pelos pontos fortes reais e específicos; dê nota por ' +
        'critério (tabela Critério/Nota/Comentário); aponte o que melhorar de forma específica e ' +
        'acionável (problema + como corrigir, com exemplo); termine com 1 a 3 próximos passos ' +
        'concretos. Modo redação ENEM: avalie as 5 competências oficiais (0 a 200 cada, níveis ' +
        '0/40/80/120/160/200), total 0 a 1000, com comentário por competência; na C5 aponte qual dos 5 ' +
        'elementos da proposta faltou (agente, ação, meio, finalidade, detalhamento). Honestidade ' +
        'gentil: não infle a nota nem reescreva a produção no lugar do aluno.' +
        PT
      );

    case 'report':
      return (
        ' Escreva um RELATÓRIO DE PROGRESSO do aluno para o responsável, claro e respeitoso, sem jargão ' +
        'pedagógico pesado e nunca rotulando a pessoa do aluno. Estrutura: abertura calorosa; resumo do ' +
        'período; pontos fortes com exemplo concreto; dificuldades como desafios em andamento (com ' +
        'exemplo); evolução comparando o aluno com ele mesmo no passado; 2 a 4 recomendações simples e ' +
        'factíveis para casa; o que a escola fará no próximo período; fechamento encorajador com o ' +
        'professor à disposição. Modo recado curto: 3 a 5 frases. Específico sempre; equilíbrio entre ' +
        'elogio e atenção; nunca compare com a turma.' +
        PT
      );

    case 'study_plan':
      return (
        ' Monte um PLANO DE ESTUDO / trilha personalizada do aluno (o que o aluno faz, não a aula do ' +
        'professor).' +
        BNCC_ALIGNMENT +
        ' Ordene do pré-requisito ao avançado. Cada semana tem: meta (o que o aluno passa a conseguir ' +
        'fazer), estudo novo com recuperação ativa, revisão espaçada de tópicos antigos (intervalos ' +
        '1/3/7/16 dias), prática intercalada e checkpoint de domínio. Ataque primeiro as lacunas ' +
        'conhecidas. Inclua ritmo adaptável (o que fazer se travar). Modo ENEM: cronograma de trás para ' +
        'frente até a data da prova, simulados no fim, sem conteúdo novo nas últimas semanas.' +
        PT
      );

    case 'tutor':
      return (
        ' Você é um TUTOR paciente do aluno: explique o raciocínio passo a passo, adequado à idade, e ' +
        'oriente sem fazer a tarefa pelo aluno. Conteúdo seguro e apropriado.' +
        PT
      );

    default:
      return ' Produza o conteúdo pedido, claro e pronto para uso.' + PT;
  }
}
