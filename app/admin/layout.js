'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { useRouter, usePathname } from 'next/navigation';
import PrismaShell from '@/components/PrismaShell';

function lerTenant() {
  try { return localStorage.getItem('prisma_tenant') || ''; } catch { return ''; }
}

export default function AdminLayout({ children }) {
  const [user, setUser] = useState(null);
  const [emailPrisma, setEmailPrisma] = useState('');
  const [tenants, setTenants] = useState([]);
  const [tenant, setTenant] = useState('');
  const [carregando, setCarregando] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const isLogin = pathname === '/admin/login';

  useEffect(() => {
    let vivo = true;
    (async () => {
      if (isLogin) { if (vivo) setCarregando(false); return; }
      let su = null;
      try {
        const { data } = await supabase.auth.getUser();
        if (data.user) { su = data.user; if (vivo) setUser(su); }
      } catch {}
      try {
        const me = await fetch('/api/prisma/admin/me').then(r => r.json());
        if (me.ok && (me.tenants || []).length) {
          if (!vivo) return;
          setTenants(me.tenants);
          if (me.email) setEmailPrisma(me.email);
          const salvo = lerTenant();
          const t0 = (me.tenants || []).some(t => t.slug === salvo) ? salvo : me.tenants[0].slug;
          setTenant(t0);
          try { localStorage.setItem('prisma_tenant', t0); } catch {}
          setCarregando(false); return;
        }
      } catch {}
      // Sem sessão Prisma: vale sessão Supabase (quiz clássico).
      if (su) { if (vivo) setCarregando(false); return; }
      if (!vivo) return;
      setCarregando(false);
      router.push('/admin/login');
    })();
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, router]);

  if (isLogin) return children;
  if (carregando) return <div style={{ minHeight: '100vh', background: '#0B0E14', color: '#9AA4B5', padding: 40, fontFamily: '-apple-system,Segoe UI,Roboto,sans-serif' }}>Carregando…</div>;
  if (!user && !tenants.length) return null;

  const sair = async () => {
    await supabase.auth.signOut();
    try { await fetch('/api/prisma/auth/sair-operador', { method: 'POST' }); } catch {}
    try { localStorage.removeItem('prisma_tenant'); } catch {}
    router.push('/entrar');
  };

  // Prisma usa o shell único; quiz clássico mantém a nav branca.
  if ((pathname || '').startsWith('/admin/prisma')) {
    return (
      <PrismaShell
        tenant={tenant}
        tenants={tenants}
        email={user?.email || emailPrisma}
        onTrocar={(t) => setTenant(t)}
        onSair={sair}
      >
        {children}
      </PrismaShell>
    );
  }

  return (
    <div className="min-h-screen">
      <nav className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex gap-4 items-center">
          <VoltarPrisma />
          <Link href="/admin" className="font-bold">Quiz Admin</Link>
          <Link href="/admin/quizzes" className="text-sm text-gray-600 hover:text-black">Quizzes</Link>
          <Link href="/admin/crm" className="text-sm text-gray-600 hover:text-black">CRM</Link>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500">{user?.email || ''}</span>
          <button onClick={sair} className="text-red-500">Sair</button>
        </div>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}

function VoltarPrisma() {
  const [painel, setPainel] = useState('');
  useEffect(() => {
    try {
      const t = localStorage.getItem('prisma_tenant');
      if (t) setPainel(`/${t}`);
    } catch {}
  }, []);
  if (!painel) return null;
  return <Link href={painel} className="text-sm font-bold" style={{ color: '#1A7A5E' }}>← Painel</Link>;
}
