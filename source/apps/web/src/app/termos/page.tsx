import { LegalPage } from '@/components/legal-page';

export const metadata = { title: 'Termos de Uso · Edu On Way' };

export default function TermosPage() {
  return (
    <LegalPage title="Termos de Uso" updated="21 de junho de 2026">
      <p>
        Estes Termos regem o uso do Edu On Way. Ao criar uma conta ou usar a plataforma, você
        concorda com eles. Se você usa em nome de uma instituição, declara ter poderes para isso.
      </p>

      <h2>1. O serviço</h2>
      <p>
        O Edu On Way é uma plataforma para professores e escolas: gestão pedagógica, comunicação,
        geração de conteúdo com inteligência artificial e administração escolar. Os recursos
        disponíveis dependem do plano contratado.
      </p>

      <h2>2. Conta e responsabilidade</h2>
      <ul>
        <li>Você é responsável por manter suas credenciais em sigilo e pelas ações na sua conta.</li>
        <li>Os dados informados devem ser verdadeiros e atualizados.</li>
        <li>Recomendamos ativar a verificação em duas etapas, disponível nas configurações.</li>
      </ul>

      <h2>3. Uso aceitável</h2>
      <p>Você concorda em não:</p>
      <ul>
        <li>Usar a plataforma para fins ilícitos ou que violem direitos de terceiros.</li>
        <li>Inserir dados de terceiros sem a devida base legal.</li>
        <li>Tentar burlar a segurança, acessar dados de outros clientes ou sobrecarregar o sistema.</li>
        <li>Revender ou redistribuir o serviço sem autorização.</li>
      </ul>

      <h2>4. Seu conteúdo</h2>
      <p>
        Você mantém a titularidade do conteúdo e dos dados que insere. Você nos concede apenas a
        licença necessária para hospedar e operar o serviço em seu benefício. Você é responsável pelo
        conteúdo que cria e pelos dados que cadastra.
      </p>

      <h2>5. Inteligência artificial</h2>
      <p>
        Os recursos de IA são um apoio e podem gerar resultados imprecisos ou incompletos. Revise o
        conteúdo antes de usar com alunos ou famílias. O Edu On Way não se responsabiliza por
        decisões tomadas exclusivamente com base no conteúdo gerado.
      </p>

      <h2>6. Planos, pagamento e cancelamento</h2>
      <ul>
        <li>Há um plano gratuito e planos pagos por assinatura mensal, processados pela Stripe.</li>
        <li>As assinaturas renovam automaticamente até o cancelamento.</li>
        <li>Você pode cancelar quando quiser; o acesso pago segue até o fim do período já pago.</li>
        <li>Mudanças de plano passam a valer conforme indicado no momento da contratação.</li>
      </ul>

      <h2>7. Propriedade intelectual</h2>
      <p>
        A plataforma, a marca e o software são de titularidade do Edu On Way. Estes Termos não
        transferem nenhum direito sobre eles, exceto o de uso conforme aqui descrito.
      </p>

      <h2>8. Disponibilidade e garantias</h2>
      <p>
        Trabalhamos para manter o serviço disponível e seguro, mas ele é fornecido "no estado em que
        se encontra", sem garantia de funcionamento ininterrupto ou livre de erros.
      </p>

      <h2>9. Limitação de responsabilidade</h2>
      <p>
        Na máxima extensão permitida em lei, o Edu On Way não responde por danos indiretos, lucros
        cessantes ou perda de dados. A responsabilidade total fica limitada ao valor pago nos 12
        meses anteriores ao evento.
      </p>

      <h2>10. Suspensão e encerramento</h2>
      <p>
        Podemos suspender ou encerrar contas que violem estes Termos. Você pode encerrar sua conta a
        qualquer momento. Após o encerramento, os dados são tratados conforme a{' '}
        <a href="/privacidade">Política de Privacidade</a>.
      </p>

      <h2>11. Proteção de dados</h2>
      <p>
        O tratamento de dados pessoais segue a nossa{' '}
        <a href="/privacidade">Política de Privacidade</a>, que faz parte destes Termos.
      </p>

      <h2>12. Lei aplicável</h2>
      <p>
        Estes Termos são regidos pelas leis do Brasil. Fica eleito o foro do domicílio do consumidor
        para dirimir eventuais controvérsias.
      </p>

      <h2>13. Alterações e contato</h2>
      <p>
        Podemos atualizar estes Termos; mudanças relevantes serão comunicadas na plataforma. Dúvidas:{' '}
        <a href="mailto:contato@onwaytech.com.br">contato@onwaytech.com.br</a>.
      </p>
    </LegalPage>
  );
}
