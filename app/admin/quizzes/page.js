'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listarQuizzes, deletarQuiz } from '@/lib/quiz2';

export default function QuizzesPage() {
  const [lista, setLista] = useState([]);
  const carregar = () => listarQuizzes().then(setLista);
  useEffect(() => { carregar(); }, []);

  const remover = async (id) => {
    if (!confirm('Excluir este quiz?')) return;
    await deletarQuiz(id);
    carregar();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Quizzes</h1>
        <Link href="/admin/quizzes/novo" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">+ Novo quiz</Link>
      </div>
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr><th className="p-3">Título</th><th className="p-3">Slug</th><th className="p-3">Status</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {lista.map(q => (
              <tr key={q.id} className="border-t">
                <td className="p-3 font-medium">{q.titulo}</td>
                <td className="p-3 text-gray-500">{q.slug}</td>
                <td className="p-3"><span className={q.ativo ? 'text-green-600' : 'text-red-500'}>{q.ativo ? 'Ativo' : 'Inativo'}</span></td>
<td className="p-3 text-right flex gap-3 justify-end">
  <a href={`/quiz/${q.slug}`} target="_blank" className="text-blue-600 text-xs">Ver</a>
  <Link href={`/admin/metricas/${q.id}`} className="text-purple-600 text-xs">Métricas</Link>
  <Link href={`/admin/quizzes/${q.id}`} className="text-gray-700 text-xs">Editar</Link>
  <button
    onClick={async () => {
      if (!confirm(`Duplicar "${q.titulo}"?`)) return;
      const { duplicarQuiz } = await import('@/lib/quiz2');
      try {
        const novo = await duplicarQuiz(q.id);
        alert(`Cópia criada: ${novo.slug}`);
        carregar();
      } catch (e) {
        alert('Erro: ' + e.message);
      }
    }}
    className="text-green-600 text-xs"
  >Duplicar</button>
  <button onClick={() => remover(q.id)} className="text-red-500 text-xs">Excluir</button>
</td>            


              </tr>
            ))}
            {lista.length === 0 && (<tr><td colSpan={4} className="p-6 text-center text-gray-400">Nenhum quiz criado</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
