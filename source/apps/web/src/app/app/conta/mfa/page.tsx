'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type Step = 'loading' | 'enroll' | 'verify' | 'done' | 'already_enrolled';

export default function MfaPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('loading');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [factorId, setFactorId] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const totp = data?.totp ?? [];
      const verified = totp.find((f) => f.status === 'verified');
      if (verified) {
        setStep('already_enrolled');
      } else {
        startEnroll();
      }
    });
  }, []);

  async function startEnroll() {
    setLoading(true);
    setError('');
    const supabase = createSupabaseBrowserClient();
    const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'Edu On Way' });
    setLoading(false);
    if (err || !data) {
      setError(err?.message ?? 'Erro ao iniciar o cadastro de MFA.');
      setStep('enroll');
      return;
    }
    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setStep('enroll');
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createSupabaseBrowserClient();
    const { data: challenge } = await supabase.auth.mfa.challenge({ factorId });
    if (!challenge) {
      setError('Não foi possível criar o desafio MFA.');
      setLoading(false);
      return;
    }
    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: code.replace(/\s/g, ''),
    });
    setLoading(false);
    if (verifyErr) {
      setError('Código inválido. Verifique o app e tente novamente.');
      return;
    }
    setStep('done');
    setTimeout(() => router.push('/app'), 2000);
  }

  async function handleUnenroll() {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.mfa.listFactors();
    const totp = (data?.totp ?? []).find((f) => f.status === 'verified');
    if (totp) await supabase.auth.mfa.unenroll({ factorId: totp.id });
    setLoading(false);
    startEnroll();
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Autenticação em dois fatores (MFA)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Protege sua conta com um código temporário gerado pelo app de autenticação.
        </p>
      </div>

      {step === 'loading' && (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      )}

      {step === 'already_enrolled' && (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success">
            MFA já está ativo na sua conta.
          </div>
          <button
            type="button"
            onClick={handleUnenroll}
            disabled={loading}
            className="rounded-md border border-destructive px-4 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            {loading ? 'Aguarde...' : 'Remover MFA e reconfigurar'}
          </button>
        </div>
      )}

      {step === 'enroll' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm">
            1. Abra o seu app de autenticação (Google Authenticator, Authy, etc.) e escaneie o QR
            code.
          </p>
          {qrCode ? (
            <img src={qrCode} alt="QR Code MFA" className="h-48 w-48 self-center rounded-lg border border-border" />
          ) : (
            <p className="text-sm text-muted-foreground">{loading ? 'Gerando QR code...' : 'Ou use o código manual abaixo.'}</p>
          )}
          {secret && (
            <p className="break-all rounded-md border border-border bg-muted p-2 text-center font-mono text-sm">
              {secret}
            </p>
          )}
          <p className="text-sm">2. Digite o código de 6 dígitos gerado pelo app:</p>
          <form onSubmit={(e) => { setStep('verify'); handleVerify(e); }} className="flex flex-col gap-3">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9 ]*"
              maxLength={7}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
              required
              className="rounded-md border border-border bg-background px-3 py-2 text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading || code.replace(/\s/g, '').length < 6}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Ativar MFA'}
            </button>
          </form>
        </div>
      )}

      {step === 'done' && (
        <div className="rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success">
          MFA ativado com sucesso! Redirecionando...
        </div>
      )}
    </main>
  );
}
