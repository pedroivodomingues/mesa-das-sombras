// ═══════════════════════════════════════════════════════════
// IA.JS — Motor de Inteligência Artificial com Fallback
// Mesa das Sombras
// OpenAI → Gemini → Claude (automático, sem mostrar erro)
// ═══════════════════════════════════════════════════════════

const IA = (() => {

const S = {
  prov: 'claude',    // provedor preferido
  apiKey: '',
  hist: [],          // histórico de mensagens
  sistema: '',       // prompt de sistema atual
};

// ── CHAMADAS POR PROVEDOR ───────────────────────────────────

function chamarOpenAI(key, sys, msgs) {
  return new Promise(resolve => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://api.openai.com/v1/chat/completions', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'Bearer ' + key);
    xhr.timeout = 22000;
    xhr.onload = () => {
      try {
        const d = JSON.parse(xhr.responseText);
        if (d.error) {
          const msg = (d.error.message || '').toLowerCase();
          const quota = msg.includes('quota') || msg.includes('billing') ||
                        msg.includes('exceeded') || msg.includes('limit') ||
                        xhr.status === 429;
          resolve({ txt: '', quota, err: d.error.message });
        } else {
          resolve({ txt: d.choices?.[0]?.message?.content || '', quota: false, err: null });
        }
      } catch(e) { resolve({ txt: '', quota: false, err: 'parse' }); }
    };
    xhr.onerror = () => resolve({ txt: '', quota: false, err: 'network' });
    xhr.ontimeout = () => resolve({ txt: '', quota: false, err: 'timeout' });
    xhr.send(JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 600,
      messages: [{ role: 'system', content: sys }, ...msgs.slice(-6)]
    }));
  });
}

// Gemini usa fetch() — funciona em Safari/iOS/Android/Chrome sem bloqueio CORS
function chamarGemini(key, sys, msgs) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
  const contents = msgs.slice(-6).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));
  // Injetar system no primeiro turn
  if (contents.length > 0 && contents[0].role === 'user') {
    contents[0].parts[0].text = sys + '\n\n' + contents[0].parts[0].text;
  } else {
    contents.unshift({ role: 'user', parts: [{ text: sys + '\n\nInício.' }] });
  }
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: { maxOutputTokens: 600, temperature: 0.85 }
    })
  })
  .then(r => r.json())
  .then(d => {
    if (d.error) {
      const msg = (d.error.message || '').toLowerCase();
      const quota = msg.includes('quota') || msg.includes('limit') || d.error.code === 429;
      return { txt: '', quota, err: d.error.message };
    }
    return { txt: d.candidates?.[0]?.content?.parts?.[0]?.text || '', quota: false, err: null };
  })
  .catch(e => ({ txt: '', quota: false, err: e.message || 'network' }));
}

function chamarClaude(key, sys, msgs) {
  return new Promise(resolve => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://api.anthropic.com/v1/messages', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('x-api-key', key);
    xhr.setRequestHeader('anthropic-version', '2023-06-01');
    xhr.setRequestHeader('anthropic-dangerous-direct-browser-access', 'true');
    xhr.timeout = 22000;
    xhr.onload = () => {
      try {
        const d = JSON.parse(xhr.responseText);
        if (d.error) {
          const msg = (d.error.message || '').toLowerCase();
          const quota = msg.includes('quota') || msg.includes('limit') ||
                        msg.includes('credit') || xhr.status === 429;
          resolve({ txt: '', quota, err: d.error.message });
        } else {
          resolve({ txt: d.content?.[0]?.text || '', quota: false, err: null });
        }
      } catch(e) { resolve({ txt: '', quota: false, err: 'parse' }); }
    };
    xhr.onerror = () => resolve({ txt: '', quota: false, err: 'network' });
    xhr.ontimeout = () => resolve({ txt: '', quota: false, err: 'timeout' });
    xhr.send(JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      system: sys,
      messages: msgs.slice(-6)
    }));
  });
}

// ── FUNÇÃO PRINCIPAL COM FALLBACK ───────────────────────────
async function chamar(userMsg, comHistorico = true) {
  const key = S.apiKey || localStorage.getItem('mesa_key') || '';
  if (!key) return null;

  if (comHistorico) {
    S.hist = [...S.hist.slice(-10), { role: 'user', content: userMsg }];
  }
  const msgs = comHistorico ? S.hist : [{ role: 'user', content: userMsg }];

  // Ordem de tentativa baseada no provedor preferido
  const ordem =
    S.prov === 'openai' ? ['openai', 'gemini', 'claude'] :
    S.prov === 'gemini' ? ['gemini', 'openai', 'claude'] :
                          ['claude', 'openai', 'gemini'];

  let ajustou = false;
  for (const prov of ordem) {
    let res;
    try {
      if (prov === 'openai')      res = await chamarOpenAI(key, S.sistema, msgs);
      else if (prov === 'gemini') res = await chamarGemini(key, S.sistema, msgs);
      else                        res = await chamarClaude(key, S.sistema, msgs);
    } catch(e) {
      res = { txt: '', quota: false, err: e.message };
    }

    if (res.txt) {
      if (ajustou) {
        // Notificação discreta no jornal
        if (typeof addJornal === 'function') {
          addJornal('sistema', 'A conexão do Mestre foi ajustada automaticamente.', '#666');
        }
      }
      if (comHistorico) {
        S.hist = [...S.hist, { role: 'assistant', content: res.txt }];
      }
      return res.txt;
    }
    ajustou = true;
  }
  return null; // todos falharam
}

// ── TESTAR API ───────────────────────────────────────────────
async function testar(key, prov) {
  const testMsg = [{ role: 'user', content: 'oi' }];
  const sys = 'Responda apenas: OK';
  let res;
  if (prov === 'gemini')      res = await chamarGemini(key, sys, testMsg);
  else if (prov === 'openai') res = await chamarOpenAI(key, sys, testMsg);
  else                        res = await chamarClaude(key, sys, testMsg);
  return res.txt ? '✅ API funcionando!' : '❌ ' + (res.err || 'Sem resposta');
}

return {
  chamar,
  testar,
  setKey:    (k) => { S.apiKey = k; localStorage.setItem('mesa_key', k); },
  setProv:   (p) => { S.prov = p; localStorage.setItem('mesa_prov', p); },
  setSys:    (s) => { S.sistema = s; },
  limparHist:() => { S.hist = []; },
  getHist:   () => S.hist,
  getProv:   () => S.prov,
};

})();
