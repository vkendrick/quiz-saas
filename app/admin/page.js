import Link from 'next/link';
export default function AdminHome() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Painel</h1>
      <div className="flex gap-4">
        <Link href="/admin/quizzes" className="bg-blue-600 text-white px-4 py-2 rounded-lg">Gerenciar quizzes</Link>
        <Link href="/admin/quizzes/novo" className="bg-gray-100 px-4 py-2 rounded-lg">Novo quiz</Link>
        <Link href="/admin/crm" className="bg-gray-100 px-4 py-2 rounded-lg">CRM</Link>
      </div>
    </div>
  );
}
