// ═══════════════════════════════════════════════════════════
// MESTRE.JS — Motor de Narração e Janela do Mestre/NPC
// Mesa das Sombras
// ═══════════════════════════════════════════════════════════

const MESTRE = (() => {

let _timerFechar = null;
let _timerBarra  = null;

// ── DETECTAR QUEM FALA ───────────────────────────────────────
function detectarFalante(txt) {
  // NPC com nome explícito: "Gareth diz:", "A estalajadeira responde:"
  const m1 = txt.match(/^[""«]?([A-ZÁÉÍÓÚÀÃÕÂÊÔÇ][a-záéíóúàãõâêôç]+(?:\s[A-Z][a-z]+)?)[,:]?\s*["«]?\s*(diz|responde|grita|sussurra|murmura|fala|exclama|pergunta|sorri|franze|olha|aponta|ergue|recua|avança)/);
  if (m1) return { titulo: m1[1], icone: '🧑', cor: '#c084fc' };

  if (/\b(guard[ao]|sentinela)\b/i.test(txt.slice(0,80)))  return { titulo: 'Guarda',       icone: '⚔️',  cor: '#60a5fa' };
  if (/\b(taverne[io]ro|estalajad)/i.test(txt.slice(0,80))) return { titulo: 'Taverneiro',   icone: '🍺',  cor: '#f59e0b' };
  if (/\b(mago|feiticeiro|arcanist)/i.test(txt.slice(0,80)))return { titulo: 'Mago',         icone: '🧙',  cor: '#a78bfa' };
  if (/\b(comerciant|mercador)\b/i.test(txt.slice(0,80)))   return { titulo: 'Mercador',     icone: '💰',  cor: '#34d399' };
  if (/\b(rei|rainha|lord|lorde)\b/i.test(txt.slice(0,80))) return { titulo: 'Nobreza',      icone: '👑',  cor: '#fbbf24' };
  if (/\b(sacerdot|clérigo|padre)\b/i.test(txt.slice(0,80)))return { titulo: 'Sacerdote',   icone: '⛪',  cor: '#818cf8' };

  return { titulo: 'Mestre', icone: '📜', cor: '#d4af37' };
}

// ── JANELA FLUTUANTE ─────────────────────────────────────────
function mostrarJanelaFala(titulo, icone, cor, txt, durMs) {
  const jan = document.getElementById('fala-janela');
  if (!jan) return;

  document.getElementById('fala-titulo').textContent = titulo;
  document.getElementById('fala-icone').textContent  = icone;
  document.getElementById('fala-titulo').style.color = cor;

  // formatar texto: **negrito**, *itálico*, quebras
  document.getElementById('fala-txt').innerHTML = txt
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,   '<em>$1</em>')
    .replace(/\n/g, '<br>');

  // re-trigger animação CSS
  jan.classList.remove('fala-visivel');
  void jan.offsetWidth;
  jan.classList.add('fala-visivel');
  document.getElementById('fala-corpo').scrollTop = 0;

  // barra de tempo
  const dur = durMs || Math.max(7000, txt.length * 55);
  const prog = document.getElementById('fala-progresso');
  if (prog) {
    prog.style.transition = 'none';
    prog.style.width = '100%';
    void prog.offsetWidth;
    prog.style.transition = `width ${dur}ms linear`;
    prog.style.width = '0%';
  }

  clearTimeout(_timerFechar);
  _timerFechar = setTimeout(fecharJanelaFala, dur);
}

function fecharJanelaFala() {
  const jan = document.getElementById('fala-janela');
  if (jan) jan.classList.remove('fala-visivel');
  clearTimeout(_timerFechar);
}

// ── DETECTAR CLIMA NA RESPOSTA ───────────────────────────────
function detectarClima(txt) {
  if (!txt || typeof MAPA === 'undefined') return;
  const t = txt.toLowerCase();
  if (/come[cç]a a chover|chuva forte|cai chuva|tempestade/.test(t)) {
    MAPA.setClima('chuva');
    MAPA.setHora(15); // tarde nublada
  }
  if (/nevo[ea]|névoa|neblina|bruma/.test(t))  MAPA.setClima('nevoa');
  if (/sol volta|céu limpo|clima melhora/.test(t)) MAPA.setClima('limpo');
  if (/anoitec|ficou escuro|noite cai|lua/.test(t)) MAPA.setHora(21);
  if (/amanheceu|sol nasce|aurora|manhã clar/.test(t)) MAPA.setHora(7);
  if (/meio[- ]dia|sol a pino/.test(t)) MAPA.setHora(12);
}

// ── PROMPT DO SISTEMA ────────────────────────────────────────
function buildPromptSistema(G) {
  const pj = G.pj;
  const pb = pj.nivel <= 4 ? 2 : pj.nivel <= 8 ? 3 : pj.nivel <= 12 ? 4 : 5;
  const mod = v => Math.floor(((v||10)-10)/2);
  const modStr = v => { const m=mod(v); return (m>=0?'+':'')+m; };

  return `Você é um Mestre de D&D 5ª Edição experiente, criativo e profundamente imersivo. Aplique as regras com naturalidade.

━━━ SESSÃO ━━━
Campanha: "${G.campanha}"
Herói: ${pj.nome} | ${pj.classe} Nível ${pj.nivel} | ${pj.raca}
PV: ${pj.pv}/${pj.pvMax} | CA: ${pj.ca} | Prof: +${pb}
FOR ${pj.FOR}(${modStr(pj.FOR)}) DES ${pj.DES}(${modStr(pj.DES)}) CON ${pj.CON}(${modStr(pj.CON)}) INT ${pj.INT}(${modStr(pj.INT)}) SAB ${pj.SAB}(${modStr(pj.SAB)}) CAR ${pj.CAR}(${modStr(pj.CAR)})
Condições: ${(pj.condicoes||[]).join(', ')||'Nenhuma'}

━━━ REGRA PRINCIPAL DE INTERPRETAÇÃO ━━━
Você NÃO responde com frases prontas, genéricas ou mecânicas.
Você interpreta a fala do jogador ANTES de responder.

Para cada mensagem, siga esta ordem:
1. ENTENDA a intenção real: pergunta, ataque, investigação, mentira, persuasão, ação, fala com NPC, descrição?
2. RESPONDA de forma contextual, reagindo DIRETAMENTE ao que o jogador disse ou fez.
3. NPCs são VIVOS: personalidade própria, emoções, medo, raiva, dúvida, memória do que aconteceu.
4. Se a ação exigir teste, determine o CORRETO: Persuasão | Intimidação | Enganação | Investigação | Percepção | Furtividade | Atletismo | Ataque.
5. A fala do jogador SEMPRE muda a cena, a reação dos NPCs ou o rumo da narrativa.

PROIBIDO: "Você entra e vê..." | "O NPC responde..." | frases genéricas.

EXEMPLO:
Jogador: "Eu olho pro guarda e digo que sou enviado de Bane."
❌ ERRADO: "O guarda deixa você entrar."
✅ CERTO: "O guarda estreita os olhos e aperta a lança: 'Enviado de Bane? Aqui isso abre portas... ou te coloca numa cela. Prove.' — Faça Enganação ou Intimidação CD 14."

━━━ MUNDO VIVO ━━━
Quando a situação mudar clima ou hora, mencione naturalmente:
- chuva, névoa, neblina, tempestade → descreva o clima
- noite, amanhecer, meio-dia → descreva a luz

━━━ D&D 5e ━━━
- COMBATE: Sempre rolar Iniciativa para TODOS antes de atacar (D20+mod.DES)
- CRÍTICO (20): narre façanha épica | FUMBLE (1): narre falha catastrófica
- Condições automáticas: Envenenado, Caído, Atordoado, etc.
- Quando houver rolagem: [ROLAGEM: tipo | CD X | resultado]

━━━ ESTILO ━━━
- Máximo 3 parágrafos por resposta
- **negrito** para épico | *itálico* para atmosfera
- Sempre em português brasileiro`;
}

// ── FUNÇÃO CENTRAL: responderMestre ─────────────────────────
async function responderMestre(msgJogador, G, ehInicio = false) {
  const indicador = document.getElementById('typing-ind');
  if (indicador) indicador.style.display = 'block';

  // Atualizar prompt do sistema com estado atual
  IA.setSys(buildPromptSistema(G));

  let resp = null;
  try {
    resp = await IA.chamar(msgJogador, !ehInicio);
  } catch(e) {
    console.error('responderMestre erro:', e);
  } finally {
    if (indicador) indicador.style.display = 'none';
  }

  // Fallback se silêncio total
  if (!resp || resp.trim() === '') {
    const fallback = 'O Mestre ficou em silêncio por um instante... tente novamente.';
    mostrarJanelaFala('Mestre', '📜', '#888', fallback, 5000);
    if (typeof addJornal === 'function') addJornal('sistema', fallback, '#666');
    return;
  }

  // Detectar clima na resposta e atualizar mapa
  detectarClima(resp);

  // Detectar combate
  if (/inicia(r)?( o)? combate|rolagem de iniciativa/i.test(resp)) {
    if (typeof iniciarCombate === 'function') iniciarCombate();
  }

  // Extrair rolagens
  const rolM = resp.match(/\[ROLAGEM:\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\]/);
  if (rolM && typeof addJornal === 'function') {
    addJornal('dado', `🎲 ${rolM[1]} — ${rolM[3]}`, '#d4af37');
  }
  const txt = resp.replace(/\[ROLAGEM:[^\]]*\]/g, '').trim();

  // Detectar falante
  const { titulo, icone, cor } = detectarFalante(txt);

  // Mostrar janela flutuante
  mostrarJanelaFala(titulo, icone, cor, txt);

  // Salvar no jornal
  if (typeof addJornal === 'function') {
    addJornal(titulo === 'Mestre' ? 'mestre' : 'npc', txt, cor);
  }

  // TTS
  if (typeof falarTTS === 'function' && (G.tts || G.narracao === 'voz')) {
    falarTTS(txt);
  }
}

// ── PROMPT DE INÍCIO ─────────────────────────────────────────
function promptInicio(G) {
  const pj = G.pj;
  return `Você é o Mestre da campanha "${G.campanha}".
O jogador acaba de entrar como ${pj.nome}, um(a) ${pj.classe} nível ${pj.nivel} da raça ${pj.raca}.

Narre o INÍCIO da aventura:
- Descreva onde ${pj.nome} está: local, ambiente, sons, cheiros, atmosfera
- Mostre o que está acontecendo ao redor neste exato momento
- Apresente algo que crie tensão ou curiosidade imediata
- Termine com uma situação que exija uma DECISÃO ou AÇÃO
- NÃO use "Sua aventura começa..." nem frases genéricas
- Seja específico, sensorial e imersivo
- 2 a 3 parágrafos em português brasileiro`;
}

return {
  responderMestre,
  mostrarJanelaFala,
  fecharJanelaFala,
  buildPromptSistema,
  promptInicio,
  detectarFalante,
  detectarClima,
};

})();
