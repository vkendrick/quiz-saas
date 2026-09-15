import QuizEngine from '@/components/quiz/QuizEngine';
export default function QuizPage({ params }) {
  return <QuizEngine slug={params.slug} />;
}