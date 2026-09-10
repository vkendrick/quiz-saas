'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [modo, setModo] = useState('login');
  const router = useRouter();

  const submit = async (e) => {
    e.preventDefault();
    setErro('');
    if (modo === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) return setErro(error.message);
      router.push('/admin');
    } else {
      const { error } = await supabase.auth.signUp({ email, password: senha });
      if (error) return setErro(error.message);
      alert('Conta criada! Verifique seu e-mail se necessário.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white p-8 rounded-xl shadow-sm border w-full max-w-sm">
        <h1 className="text-xl font-bold mb-4">{modo === 'login' ? 'Entrar' : 'Criar conta'}</h1>
        <input type="email" placeholder="E-mail" required value={email} onChange={e => setEmail(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm mb-3" />
        <input type="password" placeholder="Senha" required value={senha} onChange={e => setSenha(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm mb-3" />
        {erro && <p className="text-red-500 text-xs mb-3">{erro}</p>}
        <button className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm">
          {modo === 'login' ? 'Entrar' : 'Cadastrar'}
        </button>
        <button type="button" onClick={() => setModo(modo === 'login' ? 'signup' : 'login')}
          className="w-full text-xs text-gray-500 mt-3">
          {modo === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
        </button>
      </form>
    </div>
  );
}
