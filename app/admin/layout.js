'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { useRouter, usePathname } from 'next/navigation';

export default function AdminLayout({ children }) {
  const [user, setUser] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setCarregando(false);
      if (!data.user && pathname !== '/admin/login') router.push('/admin/login');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null);
      if (!session?.user && pathname !== '/admin/login') router.push('/admin/login');
    });
    return () => sub.subscription.unsubscribe();
  }, [pathname, router]);

  if (pathname === '/admin/login') return children;
  if (carregando) return <div className="p-10">Carregando...</div>;
  if (!user) return null;

  const sair = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  return (
    <div className="min-h-screen">
      <nav className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex gap-4 items-center">
          <Link href="/admin" className="font-bold">Quiz Admin</Link>
          <Link href="/admin/quizzes" className="text-sm text-gray-600 hover:text-black">Quizzes</Link>
          <Link href="/admin/crm" className="text-sm text-gray-600 hover:text-black">CRM</Link>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500">{user.email}</span>
          <button onClick={sair} className="text-red-500">Sair</button>
        </div>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
