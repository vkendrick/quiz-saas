'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarQuiz } from '@/lib/quiz';

const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

export default function NovoQuiz() {
  const [titulo, setTitulo] = useState('');
  const [slug, setSlug] = useState('');
  const [subtitulo, setSubtitulo] = useState('');
  const [cor, setCor] = useState('#3B82F6');
  const [bg, setBg] = useState('#ffffff');
  const router = useRouter();

  const submit = async (e) => {
    e.preventDefault();
    const s = slug || slugify(titulo);
    const quiz = await criarQuiz({ slug: s, titulo, subtitulo, tema: { primary: cor, bg, texto: '#111827' } });
    router.push(`/admin/quizzes/${quiz.id}`);
  };

  return (
    <form onSubmit={submit} className="max-w-xl bg-white border rounded-lg p-6">
      <h1 className="text-xl font-bold mb-4">Novo quiz</h1>
      <label className="block mb-3 text-sm">Título
        <input required value={titulo} onChange={e => { setTitulo(e.target.value); setSlug(slugify(e.target.value)); }}
          className="w-full border rounded-lg px-3 py-2 mt-1" />
      </label>
      <label className="block mb-3 text-sm">Slug (URL)
        <input required value={slug} onChange={e => setSlug(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1" />
      </label>
      <label className="block mb-3 text-sm">Subtítulo
        <input value={subtitulo} onChange={e => setSubtitulo(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1" />
      </label>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <label className="text-sm">Cor principal
          <input type="color" value={cor} onChange={e => setCor(e.target.value)} className="w-full h-10 mt-1 rounded-lg border" />
        </label>
        <label className="text-sm">Cor de fundo
          <input type="color" value={bg} onChange={e => setBg(e.target.value)} className="w-full h-10 mt-1 rounded-lg border" />
        </label>
      </div>
      <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">Criar</button>
    </form>
  );
}
