// STAGE → quiz-saas/app/[tenant]/gestao/layout.js (ARQUIVO NOVO)
// Gestão usa o mesmo shell do /admin (topo + menu únicos).
// Gate: middleware exige sessão de operador; aqui só exibe.
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PrismaShell from '@/components/PrismaShell';

export default function GestaoLayout({ children }) {
  const { tenant } = useParams();
  const router = useRouter();
  const [tenants, setTenants] = useState([]);
  const [email, setEmail] = useState('');

  useEffect(() => {
    fetch('/api/prisma/admin/me').then(r => r.json()).then(j => {
      if (j.ok && (j.tenants || []).length) {
        setTenants(j.tenants);
        if (j.email) setEmail(j.email);
      }
    }).catch(() => {});
  }, []);

  const sair = async () => {
    router.push('/entrar');
  };

  return (
    <PrismaShell tenant={tenant} tenants={tenants} email={email} onSair={sair}>
      {children}
    </PrismaShell>
  );
}
