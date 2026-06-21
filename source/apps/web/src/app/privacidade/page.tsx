import { LegalPage } from '@/components/legal-page';

export const metadata = { title: 'Política de Privacidade · Edu On Way' };

export default function PrivacidadePage() {
  return (
    <LegalPage title="Política de Privacidade" updated="21 de junho de 2026">
      <p>
        Esta Política explica como o Edu On Way trata dados pessoais, em conformidade com a Lei
        Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD). Ao usar a plataforma, você concorda
        com as práticas aqui descritas.
      </p>

      <h2>1. Quem trata seus dados</h2>
      <p>
        O Edu On Way é uma plataforma educacional operada pela On Way. Para falar sobre privacidade
        ou exercer seus direitos, escreva para{' '}
        <a href="mailto:contato@onwaytech.com.br">contato@onwaytech.com.br</a>.
      </p>

      <h2>2. Papéis: controlador e operador</h2>
      <p>
        Em relação aos <strong>dados da sua conta</strong> (professor, diretor ou responsável pela
        instituição), o Edu On Way atua como <strong>controlador</strong>.
      </p>
      <p>
        Em relação aos <strong>dados de alunos e responsáveis</strong> inseridos por uma escola ou
        professor, a <strong>instituição ou o professor é o controlador</strong> desses dados, e o
        Edu On Way atua como <strong>operador</strong>, tratando-os apenas para prestar o serviço,
        conforme as instruções do cliente.
      </p>

      <h2>3. Dados que tratamos</h2>
      <ul>
        <li>Cadastro: nome, e-mail e, opcionalmente, telefone e nome do espaço/instituição.</li>
        <li>Conteúdo que você cria: atividades, planos, turmas, comunicados e materiais.</li>
        <li>
          Dados de alunos e responsáveis inseridos pelos clientes: nome, data de nascimento, turma,
          contatos e, quando informados, dados de saúde e documentos.
        </li>
        <li>Uso da plataforma: registros de acesso e métricas de utilização.</li>
        <li>Pagamento: processado pela Stripe; não armazenamos números de cartão.</li>
      </ul>

      <h2>4. Para que usamos</h2>
      <ul>
        <li>Fornecer e operar a plataforma (execução do contrato).</li>
        <li>Gerar conteúdo com inteligência artificial a seu pedido.</li>
        <li>Comunicar avisos essenciais da conta e suporte.</li>
        <li>Segurança, prevenção a fraudes e cumprimento de obrigações legais.</li>
        <li>Melhorar o produto (legítimo interesse), sempre respeitando seus direitos.</li>
      </ul>

      <h2>5. Dados de crianças e adolescentes</h2>
      <p>
        Quando uma escola ou professor cadastra alunos, esses dados são tratados em nome da
        instituição e no melhor interesse da criança ou adolescente. Cabe ao cliente garantir a base
        legal adequada, incluindo o consentimento dos pais ou responsáveis quando exigido. O Edu On
        Way não cria perfis de crianças para publicidade.
      </p>

      <h2>6. Com quem compartilhamos</h2>
      <p>
        Não vendemos dados. Compartilhamos apenas com prestadores necessários para operar o serviço,
        que tratam os dados sob nossas instruções:
      </p>
      <ul>
        <li>Supabase — banco de dados e autenticação.</li>
        <li>Vercel — hospedagem da aplicação.</li>
        <li>Stripe — processamento de pagamentos.</li>
        <li>Resend — envio de e-mails transacionais.</li>
        <li>Anthropic e OpenAI — geração de conteúdo por IA (não usam seus dados para treinar modelos).</li>
      </ul>

      <h2>7. Inteligência artificial</h2>
      <p>
        Os recursos de IA são ferramentas de apoio. O conteúdo gerado pode conter imprecisões e deve
        ser revisado antes do uso. Os textos que você envia para gerar conteúdo são processados pelos
        provedores de IA acima apenas para responder à sua solicitação.
      </p>

      <h2>8. Armazenamento, segurança e transferência</h2>
      <p>
        Adotamos isolamento por cliente, controle de acesso e criptografia em trânsito. O banco de
        dados principal fica em região do Brasil (São Paulo). Alguns prestadores (hospedagem e IA)
        podem processar dados fora do país, com salvaguardas adequadas.
      </p>

      <h2>9. Retenção e exclusão</h2>
      <p>
        Mantemos os dados enquanto a conta estiver ativa e pelo prazo necessário para cumprir
        obrigações legais. Você pode solicitar a exclusão da conta e dos dados a qualquer momento.
      </p>

      <h2>10. Seus direitos (art. 18 da LGPD)</h2>
      <p>
        Você pode solicitar confirmação do tratamento, acesso, correção, anonimização, portabilidade,
        eliminação e informações sobre compartilhamento, além de revogar consentimentos. Para
        exercer, escreva para <a href="mailto:contato@onwaytech.com.br">contato@onwaytech.com.br</a>.
        Se os dados forem de alunos de uma instituição, encaminhe o pedido à própria instituição
        (controladora), que poderá nos acionar.
      </p>

      <h2>11. Cookies</h2>
      <p>
        Usamos apenas cookies essenciais para manter sua sessão e o funcionamento da plataforma.
      </p>

      <h2>12. Alterações</h2>
      <p>
        Podemos atualizar esta Política. Mudanças relevantes serão comunicadas na plataforma, com a
        data de atualização revista acima.
      </p>
    </LegalPage>
  );
}
