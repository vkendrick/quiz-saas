import QuizShell from './QuizShell';
export default function QuizPage({ params }) {
  return <QuizShell slug={params.slug} />;
}