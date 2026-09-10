import QuizRenderer from '@/components/QuizRenderer';
export default function QuizPage({ params }) {
  return <QuizRenderer slug={params.slug} />;
}
