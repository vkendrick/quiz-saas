// STAGE → quiz-saas/app/admin/login/page.js
// Login único: mesmo Supabase Auth do Prisma (email OTP ou Google, sem senha).
// A sessão do navegador vale para o quiz clássico e para o Prisma.
'use client';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { entrarComEmail, entrarComGoogle } from '@/lib/auth-cliente';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const qs = useSearchParams();
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const dest = qs.get('dest') || '/admin/quizzes';

  const otp = async (e) => {
    e.preventDefault();
    if (!email || ocupado) return;
    setErro(''); setOcupado(true);
    const r = await entrarComEmail(email, '', 'operador', { dest });
    setOcupado(false);
    if (r.ok) setEnviado(true);
    else setErro(r.error);
  };

  const google = async () => {
    if (ocupado) return;
    setErro(''); setOcupado(true);
    const r = await entrarComGoogle('', 'operador', { dest });
    setOcupado(false);
    if (r.error) setErro(r.error);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={otp} className="bg-white p-8 rounded-xl shadow-sm border w-full max-w-sm">
        <h1 className="text-xl font-bold mb-1">Entrar</h1>
        <p className="text-xs text-gray-500 mb-4">Mesmo acesso do Prisma: email ou Google, sem senha.</p>
        {!enviado ? (<>
          <input type="email" placeholder="E-mail" required value={email} onChange={e => setEmail(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm mb-3" />
          {erro && <p className="text-red-500 text-xs mb-3">{erro}</p>}
          <button disabled={ocupado} className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm">
            {ocupado ? '…' : 'Entrar com email'}
          </button>
          <button type="button" onClick={google} disabled={ocupado}
            className="w-full bg-white border py-2 rounded-lg text-sm mt-2">
            Entrar com Google
          </button>
        </>) : <p className="text-sm text-gray-600">Enviamos um link para seu email (vale 1 hora).</p>}
      </form>
    </div>
  );
}
