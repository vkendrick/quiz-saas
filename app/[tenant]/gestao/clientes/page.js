// Rota antiga do menu Funil (removido): redireciona para o Resumo unificado.
import { redirect } from "next/navigation";

export default function ClientesAtalho({ params }) {
  redirect(`/${params.tenant}/gestao`);
}
