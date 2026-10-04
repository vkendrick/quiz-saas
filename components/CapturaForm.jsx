// Formulário de captura (nome + e-mail) p/ landings.
// Grava como lead server-side (track tipo=lead). Sem dependência externa.
'use client';
import { useState } from "react";

export default function CapturaForm({ tenant, d }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [ok, setOk] = useState(false);
  const [env, setEnv] = useState(false);
  const campo = {
    width: "100%",
    maxWidth: 420,
    display: "block",
    margin: "0 auto 10px",
    padding: "14px 16px",
    borderRadius: 10,
    border: "1px solid #D0E8DF",
    fontSize: 15,
  };
  const enviar = async (e) => {
    e.preventDefault();
    if (!email || (d.nome && !nome)) return;
    setEnv(true);
    try {
      await fetch("/api/prisma/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant,
          tipo: "lead",
          metadata: { origem: "captura", nome: nome || null, email },
        }),
      });
    } catch {}
    setOk(true);
  };
  if (ok)
    return (
      <p className="sans" style={{ fontWeight: 700 }}>
        {d.msg_ok || "Inscrição recebida! Confira seu e-mail."}
      </p>
    );
  return (
    <form onSubmit={enviar} className="sans">
      {d.nome !== false && (
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Seu nome"
          style={campo}
        />
      )}
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Seu melhor e-mail"
        style={campo}
      />
      <button type="submit" className="btn" disabled={env}>
        {env ? "Enviando…" : d.botao || "Quero participar"}
      </button>
    </form>
  );
}
