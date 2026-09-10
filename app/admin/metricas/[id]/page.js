'use client';
import { useParams } from 'next/navigation';
import Metricas from '@/components/Metricas';
import Link from 'next/link';

export default function MetricasPage() {
  const { id } = useParams();
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Métricas</h1>
        <Link href="/admin/quizzes" className="text-sm text-gray-500">← Voltar</Link>
      </div>
      <Metricas quizId={id} />
    </div>
  );
}
