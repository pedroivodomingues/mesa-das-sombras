// ═══════════════════════════════════════════════════════════
// MAPA.JS — Motor Visual de Mapa Fantasy
// Mesa das Sombras — Mapa em camadas, mundo vivo, sem grade
// ═══════════════════════════════════════════════════════════

const MAPA = (() => {

// ── ESTADO DO MAPA ──────────────────────────────────────────
const S = {
  canvas: null, ctx: null,
  W: 0, H: 0,
  camX: 0, camY: 0,
  zoom: 1,
  frame: 0,
  hora: 7,          // 0-23 (hora do dia)
  clima: 'limpo',   // limpo | chuva | nevoa | tempestade
  regiaoAtual: 'estrada_greenholt',
  gradeAtiva: false,
  tileSz: 64,
  personagem: { x: 0, y: 0, tx: 0, ty: 0, estado: 'parado', dir: 'sul', animFrame: 0 },
  arrastar: null,
  ultimoToque: 0,
  particulas: [],   // chuva, névoa, etc
  tochas: [],       // posições de tochas
  animTimer: null,
};

// ── REGIÕES DO MUNDO ────────────────────────────────────────
// Cada região tem tiles definidos por código:
// ' '=grama, '.'=estrada, '~'=água, 'T'=árvore grande,
// 't'=arbusto, 'R'=rocha, 'H'=casa, '#'=parede, 'B'=ponte,
// 'C'=acampamento, 'P'=placa, 'M'=montanha
const REGIOES = {
  estrada_greenholt: {
    nome: 'Estrada para Greenholt',
    largura: 20, altura: 16,
    tiles: [
      'MMMMM TTTTTT TTTTTT MMM',
      'MM TTT   ttt   TTT   MM',
      'M  TT  ...... .  TT   M',
      '   TT .........  TT    ',
      '  TTt ..CCCCC..  tTT   ',
      '  TT  ..C   C..   TT   ',
      '  TT  ...   ...   TT   ',
      '  TT  ...P  ...   TT   ',
      '   T  ....B....   T    ',
      '   T  ....~....   T    ',
      '   T  ....~....   T    ',
      '   T  ....~....   T    ',
      '  TT  .........   TT   ',
      '  TT  ..HHHHH..   TT   ',
      '  TTT ...HHH...  TTT   ',
      '  TTTT .......  TTTT   ',
    ],
    spawnX: 9, spawnY: 8,
    tochas: [{x:8,y:4},{x:11,y:4},{x:8,y:13},{x:11,y:13}],
    transicoes: [
      { x: 9, y: 0, destino: 'mundo' },
      { x: 9, y: 15, destino: 'greenholt_cidade' },
    ],
    horaInicio: 7,
    musica: 'floresta',
  },
  greenholt_cidade: {
    nome: 'Greenholt',
    largura: 20, altura: 16,
    tiles: [
      '  TTTTT  HHHHHHH  TTTTT  ',
      '  TTT    HHHHHHH    TTT  ',
      '   TT  ..HHHHHHH..  TT   ',
      '   T  ....HHHHH....  T   ',
      '      ..............      ',
      '   H  ..H  HHH  H..  H   ',
      '   HH ..H  HHH  H.. HH   ',
      '   H  ....  H  ....  H   ',
      '      ..H P H P H..       ',
      '   H  ..H   H   H..  H   ',
      '   HH ...............HH   ',
      '   H  ..HHH   HHH..  H   ',
      '      ..HHH   HHH..       ',
      '   T  ...........  T     ',
      '  TTT  .........  TTT    ',
      '  TTTT  .......  TTTT    ',
    ],
    spawnX: 9, spawnY: 14,
    tochas: [{x:5,y:4},{x:14,y:4},{x:5,y:10},{x:14,y:10},{x:9,y:8}],
    transicoes: [
      { x: 9, y: 0, destino: 'estrada_greenholt' },
    ],
    horaInicio: 7,
    musica: 'cidade',
  },
  mundo: {
    nome: 'Faenril — Mapa Mundial',
    largura: 24, altura: 18,
    tiles: [
      'MMMMMMMMMMMMMMMMMMMMMMM',
      'MM   TTTTTTTTTT    MM  ',
      'M    TTTTTTTTTTT    M  ',
      '     TTT  .....  TTT   ',
      '     TT  .......  TT   ',
      '    TT  .........  TT  ',
      '    T  ...HHHHH...  T  ',
      '    T  ..HHHHHHH..  T  ',
      '    T  ...HHHHH...  T  ',
      '    TT  .........  TT  ',
      '    TTT ~~~~~~~~~  TTT  ',
      '    TTTT~~~~~~~~~TTTT  ',
      '     TTT~~~~~~~~~TTT   ',
      '      TT .......  TT   ',
      '      TTT ..... TTT    ',
      '       TTTTTTTTTTT     ',
      '        TTTTTTTTT      ',
      'MMMMMMMMMMMMMMMMMMMMMMM',
    ],
    spawnX: 11, spawnY: 6,
    tochas: [],
    transicoes: [
      { x: 11, y: 13, destino: 'estrada_greenholt' },
    ],
    horaInicio: 10,
    musica: 'mundo',
  },
};

// ── PALETA DE CORES POR HORA ─────────────────────────────────
function corCeu(hora) {
  if (hora >= 6  && hora < 8)  return { r:255, g:180, b:100 }; // amanhecer
  if (hora >= 8  && hora < 17) return { r:135, g:180, b:230 }; // dia
  if (hora >= 17 && hora < 19) return { r:255, g:140, b:80  }; // pôr
  if (hora >= 19 && hora < 21) return { r:80,  g:60,  b:100 }; // crepúsculo
  return { r:15, g:10, b:35 };                                   // noite
}

function brilhoHora(hora) {
  if (hora >= 8 && hora < 17) return 1.0;
  if (hora >= 6 && hora < 8)  return 0.6 + (hora - 6) * 0.2;
  if (hora >= 17 && hora < 19) return 1.0 - (hora - 17) * 0.3;
  if (hora >= 19 && hora < 21) return 0.4 - (hora - 19) * 0.1;
  return 0.2; // noite
}

// ── DESENHAR TILE ────────────────────────────────────────────
function desenharTile(ctx, tipo, px, py, sz, hora) {
  const b = brilhoHora(hora);
  const noite = hora < 6 || hora >= 20;

  switch(tipo) {
    case ' ': // grama
      ctx.fillStyle = noite ? `rgb(${Math.floor(30*b)},${Math.floor(55*b)},${Math.floor(25*b)})` : `rgb(${Math.floor(80*b)},${Math.floor(130*b)},${Math.floor(60*b)})`;
      ctx.fillRect(px, py, sz, sz);
      // textura de grama
      if (sz > 20 && !noite) {
        ctx.fillStyle = `rgba(60,110,40,${0.3*b})`;
        for (let i = 0; i < 4; i++) {
          const gx = px + (sz * (i % 2 === 0 ? 0.2 : 0.7));
          const gy = py + (sz * (i < 2 ? 0.25 : 0.75));
          ctx.fillRect(gx, gy, 2, sz * 0.15);
        }
      }
      break;

    case '.': // estrada de terra
      const rc = Math.floor(160 * b), gc = Math.floor(130 * b), bc = Math.floor(90 * b);
      ctx.fillStyle = `rgb(${rc},${gc},${bc})`;
      ctx.fillRect(px, py, sz, sz);
      // textura pedras
      ctx.fillStyle = `rgba(${Math.floor(140*b)},${Math.floor(110*b)},${Math.floor(75*b)},0.5)`;
      ctx.beginPath(); ctx.ellipse(px+sz*.25, py+sz*.3, sz*.12, sz*.08, 0.3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(px+sz*.7, py+sz*.65, sz*.1, sz*.07, -0.2, 0, Math.PI*2); ctx.fill();
      break;

    case '~': // água
      const wa = Math.sin(S.frame * 0.04 + px * 0.05) * 0.1;
      ctx.fillStyle = noite ? `rgba(10,20,60,0.9)` : `rgba(40,100,180,${0.8+wa})`;
      ctx.fillRect(px, py, sz, sz);
      // ondas
      ctx.strokeStyle = `rgba(120,180,255,${0.3+wa})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px + sz*0.1, py + sz*0.4 + Math.sin(S.frame*0.06+px)*sz*0.05);
      ctx.bezierCurveTo(px+sz*.3, py+sz*.35, px+sz*.6, py+sz*.45, px+sz*.9, py+sz*.4);
      ctx.stroke();
      break;

    case 'T': // árvore grande
      ctx.fillStyle = noite ? `rgb(${Math.floor(25*b)},${Math.floor(45*b)},${Math.floor(20*b)})` : `rgb(${Math.floor(60*b)},${Math.floor(110*b)},${Math.floor(45*b)})`;
      ctx.fillRect(px, py, sz, sz);
      // sombra da árvore
      ctx.fillStyle = `rgba(0,0,0,0.2)`;
      ctx.beginPath(); ctx.ellipse(px+sz*.55, py+sz*.8, sz*.3, sz*.12, 0.1, 0, Math.PI*2); ctx.fill();
      // tronco
      ctx.fillStyle = noite ? `rgba(40,25,10,0.8)` : `rgba(100,65,25,0.9)`;
      ctx.fillRect(px+sz*.42, py+sz*.6, sz*.16, sz*.4);
      // copa
      const cr = noite ? `rgba(20,45,15,0.95)` : `rgba(${Math.floor(40*b)},${Math.floor(100*b)},${Math.floor(30*b)},0.95)`;
      ctx.fillStyle = cr;
      ctx.beginPath(); ctx.arc(px+sz*.5, py+sz*.38, sz*.38, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = noite ? `rgba(30,60,20,0.7)` : `rgba(60,130,40,0.7)`;
      ctx.beginPath(); ctx.arc(px+sz*.35, py+sz*.45, sz*.28, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(px+sz*.65, py+sz*.42, sz*.3, 0, Math.PI*2); ctx.fill();
      break;

    case 't': // arbusto
      ctx.fillStyle = noite ? `rgb(${Math.floor(35*b)},${Math.floor(60*b)},${Math.floor(25*b)})` : `rgb(${Math.floor(80*b)},${Math.floor(130*b)},${Math.floor(60*b)})`;
      ctx.fillRect(px, py, sz, sz);
      ctx.fillStyle = noite ? 'rgba(20,50,15,0.9)' : `rgba(50,110,30,0.85)`;
      ctx.beginPath(); ctx.arc(px+sz*.5, py+sz*.6, sz*.3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(px+sz*.3, py+sz*.65, sz*.22, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(px+sz*.7, py+sz*.62, sz*.25, 0, Math.PI*2); ctx.fill();
      break;

    case 'R': // rocha
      ctx.fillStyle = noite ? `rgb(${Math.floor(30*b)},${Math.floor(55*b)},${Math.floor(25*b)})` : `rgb(${Math.floor(80*b)},${Math.floor(130*b)},${Math.floor(60*b)})`;
      ctx.fillRect(px, py, sz, sz);
      ctx.fillStyle = `rgba(0,0,0,0.15)`;
      ctx.beginPath(); ctx.ellipse(px+sz*.5, py+sz*.75, sz*.35, sz*.12, 0, 0, Math.PI*2); ctx.fill();
      const rv = noite ? 90*b : 150*b;
      ctx.fillStyle = `rgb(${Math.floor(rv)},${Math.floor(rv)},${Math.floor(rv)})`;
      ctx.beginPath();
      ctx.moveTo(px+sz*.2, py+sz*.75);
      ctx.lineTo(px+sz*.15, py+sz*.45);
      ctx.lineTo(px+sz*.35, py+sz*.3);
      ctx.lineTo(px+sz*.65, py+sz*.28);
      ctx.lineTo(px+sz*.85, py+sz*.42);
      ctx.lineTo(px+sz*.82, py+sz*.72);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${0.15*b})`;
      ctx.beginPath(); ctx.ellipse(px+sz*.35, py+sz*.42, sz*.1, sz*.06, -0.5, 0, Math.PI*2); ctx.fill();
      break;

    case 'H': // casa/edifício
      ctx.fillStyle = noite ? `rgb(${Math.floor(30*b)},${Math.floor(55*b)},${Math.floor(25*b)})` : `rgb(${Math.floor(80*b)},${Math.floor(130*b)},${Math.floor(60*b)})`;
      ctx.fillRect(px, py, sz, sz);
      // base da casa
      const hv = noite ? 55*b : 110*b;
      ctx.fillStyle = `rgb(${Math.floor(hv*1.4)},${Math.floor(hv*1.1)},${Math.floor(hv*0.8)})`;
      ctx.fillRect(px+sz*.1, py+sz*.45, sz*.8, sz*.55);
      // telhado
      ctx.fillStyle = noite ? `rgb(50,30,20)` : `rgb(120,70,40)`;
      ctx.beginPath();
      ctx.moveTo(px+sz*.05, py+sz*.48);
      ctx.lineTo(px+sz*.5, py+sz*.18);
      ctx.lineTo(px+sz*.95, py+sz*.48);
      ctx.closePath(); ctx.fill();
      // janela com luz à noite
      if (noite) {
        ctx.fillStyle = 'rgba(255,200,80,0.85)';
      } else {
        ctx.fillStyle = 'rgba(150,200,255,0.6)';
      }
      ctx.fillRect(px+sz*.22, py+sz*.55, sz*.2, sz*.2);
      ctx.fillRect(px+sz*.58, py+sz*.55, sz*.2, sz*.2);
      // porta
      ctx.fillStyle = `rgb(80,45,20)`;
      ctx.fillRect(px+sz*.38, py+sz*.7, sz*.24, sz*.3);
      break;

    case 'B': // ponte
      // água embaixo
      ctx.fillStyle = noite ? `rgba(10,20,60,0.9)` : `rgba(40,100,180,0.85)`;
      ctx.fillRect(px, py, sz, sz);
      // estrutura da ponte
      ctx.fillStyle = noite ? `rgb(70,55,35)` : `rgb(140,110,70)`;
      ctx.fillRect(px, py+sz*.3, sz, sz*.4);
      // grades
      ctx.fillStyle = noite ? `rgb(55,42,25)` : `rgb(110,85,50)`;
      for(let i=0; i<4; i++){
        ctx.fillRect(px+sz*(0.1+i*0.25), py+sz*.2, sz*.06, sz*.55);
      }
      break;

    case 'C': // acampamento (fogueira/tenda)
      ctx.fillStyle = noite ? `rgb(${Math.floor(30*b)},${Math.floor(55*b)},${Math.floor(25*b)})` : `rgb(${Math.floor(80*b)},${Math.floor(130*b)},${Math.floor(60*b)})`;
      ctx.fillRect(px, py, sz, sz);
      // tenda
      ctx.fillStyle = noite ? `rgb(50,38,25)` : `rgb(100,75,50)`;
      ctx.beginPath();
      ctx.moveTo(px+sz*.1, py+sz*.8);
      ctx.lineTo(px+sz*.5, py+sz*.3);
      ctx.lineTo(px+sz*.9, py+sz*.8);
      ctx.closePath(); ctx.fill();
      // fogueira
      if (noite || S.hora < 8) {
        ctx.fillStyle = 'rgba(255,140,0,0.9)';
        ctx.beginPath(); ctx.ellipse(px+sz*.5, py+sz*.65, sz*.08, sz*.14, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba(255,220,50,0.8)';
        ctx.beginPath(); ctx.ellipse(px+sz*.5, py+sz*.68, sz*.05, sz*.09, 0, 0, Math.PI*2); ctx.fill();
        // brilho
        ctx.fillStyle = `rgba(255,150,0,${0.08+Math.sin(S.frame*.12)*0.04})`;
        ctx.beginPath(); ctx.arc(px+sz*.5, py+sz*.65, sz*.4, 0, Math.PI*2); ctx.fill();
      }
      break;

    case 'P': // placa
      ctx.fillStyle = noite ? `rgb(${Math.floor(30*b)},${Math.floor(55*b)},${Math.floor(25*b)})` : `rgb(${Math.floor(80*b)},${Math.floor(130*b)},${Math.floor(60*b)})`;
      ctx.fillRect(px, py, sz, sz);
      ctx.fillStyle = `rgb(${Math.floor(100*b)},${Math.floor(70*b)},${Math.floor(35*b)})`;
      ctx.fillRect(px+sz*.44, py+sz*.5, sz*.12, sz*.5);
      ctx.fillStyle = `rgb(${Math.floor(130*b)},${Math.floor(95*b)},${Math.floor(50*b)})`;
      ctx.fillRect(px+sz*.2, py+sz*.3, sz*.6, sz*.32);
      break;

    case 'M': // montanha
      ctx.fillStyle = noite ? `rgb(15,12,10)` : `rgb(60,55,50)`;
      ctx.fillRect(px, py, sz, sz);
      const mv = noite ? 70*b : 120*b;
      ctx.fillStyle = `rgb(${Math.floor(mv)},${Math.floor(mv*.9)},${Math.floor(mv*.8)})`;
      ctx.beginPath();
      ctx.moveTo(px, py+sz);
      ctx.lineTo(px+sz*.5, py);
      ctx.lineTo(px+sz, py+sz);
      ctx.closePath(); ctx.fill();
      // neve no topo
      ctx.fillStyle = `rgba(240,245,255,${0.6*b})`;
      ctx.beginPath();
      ctx.moveTo(px+sz*.35, py+sz*.25);
      ctx.lineTo(px+sz*.5, py);
      ctx.lineTo(px+sz*.65, py+sz*.25);
      ctx.closePath(); ctx.fill();
      break;

    default: // grama padrão
      ctx.fillStyle = noite ? `rgb(25,45,20)` : `rgb(75,125,55)`;
      ctx.fillRect(px, py, sz, sz);
  }
}

// ── DESENHAR PERSONAGEM ──────────────────────────────────────
function desenharPersonagem(ctx, px, py, sz, hora) {
  const pers = S.personagem;
  const b = brilhoHora(hora);
  const f = pers.animFrame;
  const bob = Math.sin(f * 0.25) * sz * 0.04;
  const tamanho = sz * 1.3; // 30% maior

  // sombra
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(px + sz*.5, py + sz*.85, sz*.28, sz*.1, 0, 0, Math.PI*2);
  ctx.fill();

  const cx = px + sz * .5;
  const cy = py + sz * .1 + bob;

  // capa/manto
  ctx.fillStyle = `rgba(30,20,60,0.95)`;
  ctx.beginPath();
  ctx.moveTo(cx - tamanho*.22, cy + tamanho*.25);
  ctx.lineTo(cx - tamanho*.28, cy + tamanho*.75);
  ctx.lineTo(cx + tamanho*.28, cy + tamanho*.75);
  ctx.lineTo(cx + tamanho*.22, cy + tamanho*.25);
  ctx.closePath(); ctx.fill();

  // corpo/armadura
  ctx.fillStyle = `rgba(60,80,140,0.95)`;
  ctx.fillRect(cx - tamanho*.16, cy + tamanho*.22, tamanho*.32, tamanho*.38);

  // cabeça
  ctx.fillStyle = `rgba(200,165,130,0.95)`;
  ctx.beginPath(); ctx.arc(cx, cy + tamanho*.15, tamanho*.16, 0, Math.PI*2); ctx.fill();

  // elmo/capuz
  ctx.fillStyle = `rgba(50,40,80,0.95)`;
  ctx.beginPath();
  ctx.arc(cx, cy + tamanho*.13, tamanho*.17, Math.PI, Math.PI*2); ctx.fill();

  // espada (estado atacando: inclinada)
  const angEspada = pers.estado === 'atacando'
    ? -0.7 + Math.sin(f * 0.5) * 0.8
    : 0.15;
  ctx.save();
  ctx.translate(cx + tamanho*.18, cy + tamanho*.35);
  ctx.rotate(angEspada);
  ctx.fillStyle = `rgba(180,190,200,0.9)`;
  ctx.fillRect(-sz*.03, -tamanho*.35, sz*.06, tamanho*.45);
  ctx.fillStyle = `rgba(150,100,40,0.9)`;
  ctx.fillRect(-sz*.08, -tamanho*.05, sz*.16, sz*.07);
  ctx.restore();

  // efeito magia (estado conjurando)
  if (pers.estado === 'magia') {
    const mg = 0.5 + Math.sin(f * 0.3) * 0.3;
    ctx.fillStyle = `rgba(150,80,255,${mg})`;
    ctx.beginPath(); ctx.arc(cx - tamanho*.3, cy + tamanho*.3, tamanho*.18 * mg, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = `rgba(200,150,255,${mg*0.6})`;
    ctx.beginPath(); ctx.arc(cx - tamanho*.3, cy + tamanho*.3, tamanho*.28 * mg, 0, Math.PI*2); ctx.fill();
  }

  // seta indicadora de posição
  ctx.fillStyle = '#f0d060';
  ctx.beginPath();
  ctx.moveTo(cx, cy + tamanho*.85);
  ctx.lineTo(cx - sz*.1, cy + tamanho*.65);
  ctx.lineTo(cx + sz*.1, cy + tamanho*.65);
  ctx.closePath(); ctx.fill();
}

// ── TOCHA ────────────────────────────────────────────────────
function desenharTocha(ctx, px, py, sz, hora) {
  const noite = hora < 6 || hora >= 19;
  const intensidade = noite ? 1 : 0.4;
  if (intensidade < 0.05) return;

  const flicker = 0.7 + Math.sin(S.frame * 0.18 + px) * 0.3;
  const cx = px + sz * .5, cy = py + sz * .4;

  // brilho externo
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, sz * 1.8 * flicker);
  grad.addColorStop(0, `rgba(255,180,60,${0.25 * intensidade * flicker})`);
  grad.addColorStop(1, 'rgba(255,120,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(cx, cy, sz * 1.8 * flicker, 0, Math.PI*2); ctx.fill();

  // chama
  ctx.fillStyle = `rgba(255,160,20,${0.9*intensidade*flicker})`;
  ctx.beginPath(); ctx.ellipse(cx, cy, sz*.1, sz*.22*flicker, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = `rgba(255,230,80,${0.8*intensidade*flicker})`;
  ctx.beginPath(); ctx.ellipse(cx, cy+sz*.04, sz*.06, sz*.14*flicker, 0, 0, Math.PI*2); ctx.fill();
}

// ── PARTÍCULAS (CHUVA / NÉVOA) ───────────────────────────────
function atualizarParticulas() {
  if (S.clima === 'chuva') {
    // adicionar gotas
    while (S.particulas.length < 120) {
      S.particulas.push({
        tipo: 'gota',
        x: Math.random() * S.W,
        y: Math.random() * S.H,
        vy: 6 + Math.random() * 4,
        vx: -1 + Math.random() * 0.5,
        alpha: 0.4 + Math.random() * 0.4,
        len: 8 + Math.random() * 12,
      });
    }
  } else if (S.clima === 'nevoa') {
    while (S.particulas.length < 30) {
      S.particulas.push({
        tipo: 'nevoa',
        x: Math.random() * S.W,
        y: S.H * 0.4 + Math.random() * S.H * 0.6,
        vx: 0.2 + Math.random() * 0.4,
        alpha: 0.05 + Math.random() * 0.1,
        raio: 60 + Math.random() * 120,
      });
    }
  } else {
    S.particulas = [];
    return;
  }

  // mover e remover
  S.particulas = S.particulas.filter(p => {
    if (p.tipo === 'gota') {
      p.x += p.vx; p.y += p.vy;
      return p.y < S.H + 20;
    }
    if (p.tipo === 'nevoa') {
      p.x += p.vx;
      return p.x < S.W + p.raio;
    }
    return true;
  });
}

function desenharParticulas(ctx) {
  S.particulas.forEach(p => {
    if (p.tipo === 'gota') {
      ctx.strokeStyle = `rgba(150,200,255,${p.alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.vx * 2, p.y + p.len);
      ctx.stroke();
    }
    if (p.tipo === 'nevoa') {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.raio);
      g.addColorStop(0, `rgba(200,210,220,${p.alpha})`);
      g.addColorStop(1, 'rgba(200,210,220,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.raio, 0, Math.PI*2); ctx.fill();
    }
  });
}

// ── GRADE TÁTICA ─────────────────────────────────────────────
function desenharGrade(ctx, sz) {
  if (!S.gradeAtiva) return;
  ctx.strokeStyle = 'rgba(212,175,55,0.18)';
  ctx.lineWidth = 0.5;
  const regiao = REGIOES[S.regiaoAtual];
  for (let y = 0; y <= regiao.altura; y++) {
    ctx.beginPath();
    ctx.moveTo(S.camX, S.camY + y * sz * S.zoom);
    ctx.lineTo(S.camX + regiao.largura * sz * S.zoom, S.camY + y * sz * S.zoom);
    ctx.stroke();
  }
  for (let x = 0; x <= regiao.largura; x++) {
    ctx.beginPath();
    ctx.moveTo(S.camX + x * sz * S.zoom, S.camY);
    ctx.lineTo(S.camX + x * sz * S.zoom, S.camY + regiao.altura * sz * S.zoom);
    ctx.stroke();
  }
}

// ── CÉU / OVERLAY DE HORA ────────────────────────────────────
function desenharCeu(ctx) {
  const ceu = corCeu(S.hora);
  const b = brilhoHora(S.hora);
  const noite = S.hora < 6 || S.hora >= 20;

  // overlay de hora sobre o mapa
  if (!noite) {
    // dia - filtro suave
    ctx.fillStyle = `rgba(${ceu.r},${ceu.g},${ceu.b},${(1-b)*0.3})`;
  } else {
    // noite - overlay azul escuro
    ctx.fillStyle = `rgba(10,5,30,${0.55 - b*0.3})`;
  }
  ctx.fillRect(0, 0, S.W, S.H);

  // estrelas à noite
  if (noite || S.hora < 5 || S.hora >= 21) {
    const alpha = S.hora < 5 || S.hora >= 22 ? 0.9 : 0.4;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    // fixar seed com posição para estrelas estáticas
    for (let i = 0; i < 60; i++) {
      const sx = ((i * 137 + 11) % S.W);
      const sy = ((i * 89  + 7)  % (S.H * 0.5));
      const raio = i % 5 === 0 ? 1.5 : 0.8;
      const brilhoEst = 0.4 + Math.sin(S.frame * 0.05 + i) * 0.3;
      ctx.globalAlpha = brilhoEst * alpha;
      ctx.beginPath(); ctx.arc(sx, sy, raio, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // sol ou lua
  if (S.hora >= 6 && S.hora < 19) {
    const progSol = (S.hora - 6) / 13;
    const sx = S.W * (0.1 + progSol * 0.8);
    const sy = S.H * 0.15 - Math.sin(progSol * Math.PI) * S.H * 0.08;
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 30);
    grad.addColorStop(0, 'rgba(255,240,150,0.9)');
    grad.addColorStop(0.4, 'rgba(255,200,80,0.4)');
    grad.addColorStop(1, 'rgba(255,150,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(sx, sy, 30, 0, Math.PI*2); ctx.fill();
  } else if (noite) {
    ctx.fillStyle = 'rgba(230,235,255,0.85)';
    ctx.beginPath(); ctx.arc(S.W * 0.75, S.H * 0.1, 14, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(10,5,30,0.7)';
    ctx.beginPath(); ctx.arc(S.W * 0.77, S.H * 0.09, 11, 0, Math.PI*2); ctx.fill();
  }
}

// ── LOOP PRINCIPAL ───────────────────────────────────────────
function desenharMapa() {
  const ctx = S.ctx;
  const sz = S.tileSz;
  const regiao = REGIOES[S.regiaoAtual];

  ctx.clearRect(0, 0, S.W, S.H);

  // fundo
  const b = brilhoHora(S.hora);
  const noite = S.hora < 6 || S.hora >= 20;
  ctx.fillStyle = noite ? `rgb(10,8,20)` : `rgb(${Math.floor(80*b)},${Math.floor(120*b)},${Math.floor(55*b)})`;
  ctx.fillRect(0, 0, S.W, S.H);

  // tiles
  const tiles = regiao.tiles;
  for (let ty = 0; ty < tiles.length; ty++) {
    const linha = tiles[ty];
    for (let tx = 0; tx < linha.length; tx++) {
      const tipo = linha[tx];
      const px = Math.floor(S.camX + tx * sz * S.zoom);
      const py = Math.floor(S.camY + ty * sz * S.zoom);
      const szz = Math.ceil(sz * S.zoom + 1);

      if (px > -szz && px < S.W + szz && py > -szz && py < S.H + szz) {
        desenharTile(ctx, tipo, px, py, szz, S.hora);
      }
    }
  }

  // tochas
  regiao.tochas.forEach(t => {
    const px = S.camX + t.x * sz * S.zoom;
    const py = S.camY + t.y * sz * S.zoom;
    desenharTocha(ctx, px, py, sz * S.zoom, S.hora);
  });

  // grade tática (antes do personagem)
  desenharGrade(ctx, sz);

  // personagem
  const pers = S.personagem;
  const ppx = S.camX + pers.x * sz * S.zoom;
  const ppy = S.camY + pers.y * sz * S.zoom;
  desenharPersonagem(ctx, ppx, ppy, sz * S.zoom, S.hora);

  // overlay de hora/dia-noite
  desenharCeu(ctx);

  // partículas (chuva/névoa por cima)
  atualizarParticulas();
  desenharParticulas(ctx);

  // avanço de frame e animação
  S.frame++;
  if (pers.estado !== 'parado') pers.animFrame++;
  else if (S.frame % 3 === 0) pers.animFrame++;
}

function loop() {
  desenharMapa();
  requestAnimationFrame(loop);
}

// ── MOVER PERSONAGEM ─────────────────────────────────────────
function moverPara(tx, ty, callback) {
  const regiao = REGIOES[S.regiaoAtual];
  const tiles = regiao.tiles;
  // validar tile clicável
  const linha = tiles[ty];
  if (!linha) return;
  const tipo = linha[tx] || ' ';
  const bloqueado = ['T','M','R','~'].includes(tipo);
  if (bloqueado) return;

  S.personagem.estado = 'andando';
  const ox = S.personagem.x, oy = S.personagem.y;
  const dx = tx - ox, dy = ty - oy;
  const dist = Math.sqrt(dx*dx + dy*dy);
  const passos = Math.max(Math.abs(dx), Math.abs(dy)) * 8;
  let p = 0;

  clearInterval(S.animTimer);
  S.animTimer = setInterval(() => {
    p++;
    S.personagem.x = ox + (dx * p / passos);
    S.personagem.y = oy + (dy * p / passos);

    // câmera acompanha suavemente
    const alvoX = S.W/2 - S.personagem.x * S.tileSz * S.zoom;
    const alvoY = S.H/2 - S.personagem.y * S.tileSz * S.zoom;
    S.camX += (alvoX - S.camX) * 0.1;
    S.camY += (alvoY - S.camY) * 0.1;

    if (p >= passos) {
      S.personagem.x = tx;
      S.personagem.y = ty;
      S.personagem.estado = 'parado';
      clearInterval(S.animTimer);
      // verificar transições de local
      const trans = regiao.transicoes.find(t => t.x === tx && t.y === ty);
      if (trans) trocarRegiao(trans.destino);
      if (callback) callback();
    }
  }, 16);
}

// ── TROCAR REGIÃO ────────────────────────────────────────────
function trocarRegiao(nome) {
  if (!REGIOES[nome]) return;
  S.regiaoAtual = nome;
  const reg = REGIOES[nome];
  S.personagem.x = reg.spawnX;
  S.personagem.y = reg.spawnY;
  S.personagem.estado = 'parado';
  centrarCamera();
  // notificar HUD
  if (typeof MUNDO !== 'undefined' && MUNDO.onTrocaRegiao) {
    MUNDO.onTrocaRegiao(reg.nome);
  }
  // atualizar label
  const labelEl = document.getElementById('local-nome');
  if (labelEl) labelEl.textContent = reg.nome;
}

// ── CÂMERA ───────────────────────────────────────────────────
function centrarCamera() {
  const sz = S.tileSz * S.zoom;
  S.camX = S.W/2 - S.personagem.x * sz - sz/2;
  S.camY = S.H/2 - S.personagem.y * sz - sz/2;
}

// ── TOQUE / CLIQUE ───────────────────────────────────────────
function aoClicar(e) {
  const rect = S.canvas.getBoundingClientRect();
  const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
  const tx = Math.floor((cx - S.camX) / (S.tileSz * S.zoom));
  const ty = Math.floor((cy - S.camY) / (S.tileSz * S.zoom));
  const regiao = REGIOES[S.regiaoAtual];
  if (tx >= 0 && tx < regiao.largura && ty >= 0 && ty < regiao.altura) {
    moverPara(tx, ty);
  }
}

let _arrastando = false, _arrX = 0, _arrY = 0, _arrCX = 0, _arrCY = 0;
function onPointerDown(e) {
  _arrastando = true;
  _arrX = e.touches ? e.touches[0].clientX : e.clientX;
  _arrY = e.touches ? e.touches[0].clientY : e.clientY;
  _arrCX = S.camX; _arrCY = S.camY;
  S.canvas.setPointerCapture && S.canvas.setPointerCapture(e.pointerId);
}
function onPointerMove(e) {
  if (!_arrastando) return;
  const cx = e.touches ? e.touches[0].clientX : e.clientX;
  const cy = e.touches ? e.touches[0].clientY : e.clientY;
  const dx = cx - _arrX, dy = cy - _arrY;
  if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
    S.camX = _arrCX + dx;
    S.camY = _arrCY + dy;
  }
}
function onPointerUp(e) { _arrastando = false; }

// ── API PÚBLICA ──────────────────────────────────────────────
function init(canvasId) {
  S.canvas = document.getElementById(canvasId);
  if (!S.canvas) return;
  S.ctx = S.canvas.getContext('2d');
  S.W = window.innerWidth;
  S.H = window.innerHeight;
  S.canvas.width = S.W;
  S.canvas.height = S.H;

  // personagem inicia no spawn
  const reg = REGIOES[S.regiaoAtual];
  S.personagem.x = reg.spawnX;
  S.personagem.y = reg.spawnY;
  centrarCamera();

  // eventos
  S.canvas.addEventListener('pointerdown', onPointerDown);
  S.canvas.addEventListener('pointermove', onPointerMove);
  S.canvas.addEventListener('pointerup', onPointerUp);
  // duplo toque para mover
  let lastTap = 0;
  S.canvas.addEventListener('pointerdown', e => {
    const now = Date.now();
    if (now - lastTap < 280) aoClicar(e);
    lastTap = now;
  });
  // zoom
  S.canvas.addEventListener('wheel', e => {
    e.preventDefault();
    S.zoom = Math.max(0.5, Math.min(3, S.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
    centrarCamera();
  }, { passive: false });

  window.addEventListener('resize', () => {
    S.W = window.innerWidth; S.H = window.innerHeight;
    S.canvas.width = S.W; S.canvas.height = S.H;
  });

  requestAnimationFrame(loop);
}

return {
  init,
  moverPara,
  trocarRegiao,
  setClima: (c) => { S.clima = c; S.particulas = []; },
  setHora:  (h) => { S.hora = h; },
  avancarHora: (delta) => { S.hora = (S.hora + delta) % 24; },
  ativarGrade: (v) => { S.gradeAtiva = v; },
  setEstadoPersonagem: (e) => { S.personagem.estado = e; setTimeout(() => { S.personagem.estado = 'parado'; }, 1200); },
  getRegiao: () => S.regiaoAtual,
  getHora: () => S.hora,
  REGIOES,
};

})(); // fim MAPA
