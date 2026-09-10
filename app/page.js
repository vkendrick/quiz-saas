import Link from 'next/link';
export default function Home() {
  return (
    <main className="max-w-3xl mx-auto p-10">
      <h1 className="text-4xl font-bold mb-4">Quiz SaaS</h1>
      <p className="text-gray-600 mb-8">
        Sistema dinâmico de quizzes com métricas, CRM, A/B test e captura de leads.
      </p>
      <div className="flex gap-4">
        <Link href="/admin" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Painel Admin</Link>
        <Link href="/quiz/como-fazer-seu-filho-dormir" className="px-4 py-2 border rounded-lg">Ver quiz exemplo</Link>
      </div>
    </main>
  );
}
