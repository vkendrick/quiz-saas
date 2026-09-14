'use client';

const STORAGE_KEY = 'quizzin_ratelimit';
const COOLDOWN_MINUTOS = 5;
const MAX_POR_HORA = 3;

export function podeEnviar() {
  if (typeof window === 'undefined') return { ok: true };

  try {
    const agora = Date.now();
    const dados = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

    // Cooldown de 5 minutos
    if (dados.ultimoEnvio && (agora - dados.ultimoEnvio) < COOLDOWN_MINUTOS * 60 * 1000) {
      const faltam = Math.ceil((COOLDOWN_MINUTOS * 60 * 1000 - (agora - dados.ultimoEnvio)) / 1000 / 60);
      return { ok: false, motivo: `Aguarde ${faltam} minuto(s) pra enviar de novo.` };
    }

    // Máximo 3 por hora
    const ultimaHora = (dados.historico || []).filter(t => (agora - t) < 60 * 60 * 1000);
    if (ultimaHora.length >= MAX_POR_HORA) {
      return { ok: false, motivo: 'Muitas tentativas. Aguarde 1 hora.' };
    }

    return { ok: true };
  } catch {
    return { ok: true };
  }
}

export function registrarEnvio() {
  if (typeof window === 'undefined') return;
  try {
    const agora = Date.now();
    const dados = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const historico = (dados.historico || []).filter(t => (agora - t) < 60 * 60 * 1000);
    historico.push(agora);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ultimoEnvio: agora,
      historico
    }));
  } catch {}
}

// Valida se o email é "real" (não é teste@gmail.com)
export function emailValido(email) {
  if (!email) return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!regex.test(email)) return false;

  // Bloqueia domínios comuns de teste
  const bloqueados = ['teste.com', 'test.com', 'exemplo.com', 'abc.com', 'aaa.com'];
  const dominio = email.split('@')[1]?.toLowerCase();
  return !bloqueados.includes(dominio);
}