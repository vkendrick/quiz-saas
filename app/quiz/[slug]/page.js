import QuizEngine from '@/components/quiz/QuizEngine';
export const runtime = 'edge';
export default function QuizPage({ params }) {
  return <QuizEngine slug={params.slug} />;
}