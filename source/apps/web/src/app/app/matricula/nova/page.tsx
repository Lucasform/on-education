import { listClasses } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { enrollFullAction } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Matrícula completa · Edu On Way' };

const Label = ({ children }: { children: React.ReactNode }) => (
  <span className="mb-1 block text-xs text-muted-foreground">{children}</span>
);

export default async function MatriculaNovaPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');
  const turmas = await listClasses(db(), ctx).catch(() => [] as { id: string; name: string }[]);

  return (
    <>
      <PageHeader
        title="Matrícula completa"
        description="Onboarding do aluno com dados civis, endereço, saúde e responsável. Ao salvar, geramos o contrato."
        back={{ href: '/app/matricula', label: 'Voltar para matrícula' }}
      />

      <form action={enrollFullAction} className="flex flex-col gap-5">
        {/* Dados do aluno */}
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Dados do aluno</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <Label>Nome completo *</Label>
              <input name="fullName" required className={fieldClass} />
            </label>
            <label>
              <Label>Data de nascimento *</Label>
              <input name="birthDate" type="date" required className={fieldClass} />
            </label>
            <label>
              <Label>Sexo</Label>
              <select name="gender" defaultValue="" className={fieldClass}>
                <option value="">Não informado</option>
                <option value="Feminino">Feminino</option>
                <option value="Masculino">Masculino</option>
                <option value="Outro">Outro</option>
              </select>
            </label>
            <label>
              <Label>CPF</Label>
              <input name="cpf" placeholder="000.000.000-00" className={fieldClass} />
            </label>
            <label>
              <Label>RG</Label>
              <input name="rg" className={fieldClass} />
            </label>
            <label>
              <Label>Nacionalidade</Label>
              <input name="nationality" defaultValue="Brasileira" className={fieldClass} />
            </label>
            <label>
              <Label>Turno</Label>
              <select name="shift" defaultValue="" className={fieldClass}>
                <option value="">Não informado</option>
                <option value="Manhã">Manhã</option>
                <option value="Tarde">Tarde</option>
                <option value="Noite">Noite</option>
                <option value="Integral">Integral</option>
              </select>
            </label>
            <label className="sm:col-span-2">
              <Label>Turma</Label>
              <select name="classId" defaultValue="" className={fieldClass}>
                <option value="">Sem turma</option>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Endereço do aluno */}
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Endereço</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <Label>Logradouro, número e complemento</Label>
              <input name="address" placeholder="Rua das Flores, 100, ap. 2" className={fieldClass} />
            </label>
            <label>
              <Label>Cidade</Label>
              <input name="city" className={fieldClass} />
            </label>
            <label>
              <Label>Estado (UF)</Label>
              <input name="state" maxLength={2} placeholder="SP" className={fieldClass} />
            </label>
            <label>
              <Label>CEP</Label>
              <input name="zipCode" placeholder="00000-000" className={fieldClass} />
            </label>
          </div>
        </div>

        {/* Saúde e emergência */}
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Saúde e emergência</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <label>
              <Label>Tipo sanguíneo</Label>
              <select name="bloodType" defaultValue="" className={fieldClass}>
                <option value="">Não informado</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2">
              <Label>Alergias</Label>
              <input name="allergies" placeholder="Penicilina, amendoim..." className={fieldClass} />
            </label>
            <label className="sm:col-span-3">
              <Label>Observações médicas</Label>
              <textarea name="medicalNotes" rows={2} className={fieldClass} />
            </label>
            <label className="sm:col-span-2">
              <Label>Contato de emergência (nome)</Label>
              <input name="emergencyName" className={fieldClass} />
            </label>
            <label>
              <Label>Parentesco</Label>
              <input name="emergencyRelation" className={fieldClass} />
            </label>
            <label>
              <Label>Telefone de emergência</Label>
              <input name="emergencyPhone" type="tel" className={fieldClass} />
            </label>
          </div>
        </div>

        {/* Responsável (contratante) */}
        <div className={cardClass}>
          <h2 className="mb-1 text-sm font-medium">Responsável (contratante)</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Estes dados vão para o contrato de matrícula. Pode adicionar outros responsáveis depois
            na ficha do aluno.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <Label>Nome completo</Label>
              <input name="guardianName" className={fieldClass} />
            </label>
            <label>
              <Label>Parentesco</Label>
              <input name="guardianRelation" placeholder="Mãe, pai, responsável legal..." className={fieldClass} />
            </label>
            <label>
              <Label>CPF</Label>
              <input name="guardianCpf" placeholder="000.000.000-00" className={fieldClass} />
            </label>
            <label>
              <Label>RG</Label>
              <input name="guardianRg" className={fieldClass} />
            </label>
            <label>
              <Label>Telefone / WhatsApp</Label>
              <input name="guardianPhone" type="tel" className={fieldClass} />
            </label>
            <label>
              <Label>E-mail</Label>
              <input name="guardianEmail" type="email" className={fieldClass} />
            </label>
            <label className="sm:col-span-2">
              <Label>Endereço completo</Label>
              <input name="guardianAddress" className={fieldClass} />
            </label>
            <label className="sm:col-span-2">
              <Label>Profissão</Label>
              <input name="guardianProfession" className={fieldClass} />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name="guardianFinancial" defaultChecked className="h-3.5 w-3.5" />
              Responsável financeiro
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name="guardianPickup" defaultChecked className="h-3.5 w-3.5" />
              Pode buscar
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name="guardianEmergency" defaultChecked className="h-3.5 w-3.5" />
              Contato de emergência
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SubmitButton type="submit">Matricular e gerar contrato</SubmitButton>
          <span className="text-xs text-muted-foreground">
            Você poderá imprimir o contrato e a ficha na sequência.
          </span>
        </div>
      </form>
    </>
  );
}
