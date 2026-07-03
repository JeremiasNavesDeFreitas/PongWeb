// URL opcional de apoio ao criador. Deixe vazio para ocultar o botao.
const APOIAR_URL = '';

const WINNING_SCORE = 5;
const CANVAS_W = 800;
const CANVAS_H = 480;
const PADDLE_W = 12;
const PADDLE_H = 90;
const BALL_SIZE = 10;

const SKIN_CORES = { Classico: '#e8f1f2', Neon: '#39ff14', Retro: '#ffb000' };
const BG_ESTILO = { Preto: 'solido', Grade: 'grade', Estrelas: 'estrelas' };
const FONTE_MAP = {
  Padrao: "'Segoe UI', sans-serif",
  'Retro Mono': "'Courier New', monospace",
  Arcade: "'Press Start 2P', 'Courier New', monospace",
};

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const el = {
  menu: document.getElementById('menu'),
  gameOver: document.getElementById('gameOver'),
  loja: document.getElementById('loja'),
  ranking: document.getElementById('ranking'),
  nomeJogador: document.getElementById('nomeJogador'),
  btnVsIA: document.getElementById('btnVsIA'),
  btnVs2P: document.getElementById('btnVs2P'),
  btnRanking: document.getElementById('btnRanking'),
  goVencedor: document.getElementById('goVencedor'),
  goPlacar: document.getElementById('goPlacar'),
  btnJogarNovamente: document.getElementById('btnJogarNovamente'),
  btnPersonalizar: document.getElementById('btnPersonalizar'),
  btnApoiar: document.getElementById('btnApoiar'),
  lojaScore: document.getElementById('lojaScore'),
  lojaListas: document.getElementById('lojaListas'),
  btnFecharLoja: document.getElementById('btnFecharLoja'),
  rankingLista: document.getElementById('rankingLista'),
  btnFecharRanking: document.getElementById('btnFecharRanking'),
};

if (APOIAR_URL) {
  el.btnApoiar.href = APOIAR_URL;
  el.btnApoiar.classList.remove('hidden');
}

function carregarPersonalizacao() {
  try {
    return JSON.parse(localStorage.getItem('pongweb.personalizacao')) || {
      skin: 'Classico',
      background: 'Preto',
      fonte: 'Padrao',
      efeito: 'Nenhum',
    };
  } catch {
    return { skin: 'Classico', background: 'Preto', fonte: 'Padrao', efeito: 'Nenhum' };
  }
}

function salvarPersonalizacao(p) {
  localStorage.setItem('pongweb.personalizacao', JSON.stringify(p));
}

let personalizacao = carregarPersonalizacao();

const estado = {
  fase: 'menu', // menu | jogando | pausado | fimDeJogo
  modo: null, // 'ia' | '2p'
  nome1: 'Jogador1',
  nome2: 'CPU',
};

const teclas = {};
window.addEventListener('keydown', (e) => {
  teclas[e.key] = true;
  if (e.key === ' ' && estado.fase === 'jogando') estado.fase = 'pausado';
  else if (e.key === ' ' && estado.fase === 'pausado') estado.fase = 'jogando';
});
window.addEventListener('keyup', (e) => {
  teclas[e.key] = false;
});

function novoJogo(modo) {
  const nome = el.nomeJogador.value.trim() || 'Jogador1';
  estado.modo = modo;
  estado.nome1 = nome;
  estado.nome2 = modo === 'ia' ? 'CPU' : 'Jogador2';
  estado.fase = 'jogando';

  jogo.p1 = { y: CANVAS_H / 2 - PADDLE_H / 2, score: 0 };
  jogo.p2 = { y: CANVAS_H / 2 - PADDLE_H / 2, score: 0 };
  resetBola(1);
  jogo.trilha = [];
  jogo.particulas = [];

  el.menu.classList.add('hidden');
  el.gameOver.classList.add('hidden');
}

const jogo = {
  p1: { y: CANVAS_H / 2 - PADDLE_H / 2, score: 0 },
  p2: { y: CANVAS_H / 2 - PADDLE_H / 2, score: 0 },
  bola: { x: CANVAS_W / 2, y: CANVAS_H / 2, vx: 4, vy: 2 },
  trilha: [],
  particulas: [],
};

function resetBola(direcao) {
  jogo.bola.x = CANVAS_W / 2;
  jogo.bola.y = CANVAS_H / 2;
  const angulo = (Math.random() * 0.6 - 0.3);
  const velocidade = 5;
  jogo.bola.vx = Math.cos(angulo) * velocidade * direcao;
  jogo.bola.vy = Math.sin(angulo) * velocidade;
}

function criarParticulas(x, y) {
  for (let i = 0; i < 24; i += 1) {
    const ang = Math.random() * Math.PI * 2;
    const vel = 1 + Math.random() * 3;
    jogo.particulas.push({
      x, y,
      vx: Math.cos(ang) * vel,
      vy: Math.sin(ang) * vel,
      vida: 30,
    });
  }
}

function atualizar() {
  if (estado.fase !== 'jogando') return;

  const velocidadePaddle = 6;
  if (teclas.w || teclas.W) jogo.p1.y -= velocidadePaddle;
  if (teclas.s || teclas.S) jogo.p1.y += velocidadePaddle;

  if (estado.modo === '2p') {
    if (teclas.ArrowUp) jogo.p2.y -= velocidadePaddle;
    if (teclas.ArrowDown) jogo.p2.y += velocidadePaddle;
  } else {
    const centroAlvo = jogo.bola.y - PADDLE_H / 2;
    const velocidadeIA = 4;
    if (Math.abs(centroAlvo - jogo.p2.y) > 4) {
      jogo.p2.y += Math.sign(centroAlvo - jogo.p2.y) * velocidadeIA;
    }
  }

  jogo.p1.y = Math.max(0, Math.min(CANVAS_H - PADDLE_H, jogo.p1.y));
  jogo.p2.y = Math.max(0, Math.min(CANVAS_H - PADDLE_H, jogo.p2.y));

  const b = jogo.bola;
  b.x += b.vx;
  b.y += b.vy;

  if (personalizacao.efeito === 'Rastro de Bola') {
    jogo.trilha.push({ x: b.x, y: b.y });
    if (jogo.trilha.length > 18) jogo.trilha.shift();
  } else {
    jogo.trilha.length = 0;
  }

  if (b.y <= 0 || b.y >= CANVAS_H - BALL_SIZE) {
    b.vy *= -1;
    b.y = Math.max(0, Math.min(CANVAS_H - BALL_SIZE, b.y));
  }

  if (b.x <= PADDLE_W && b.y + BALL_SIZE >= jogo.p1.y && b.y <= jogo.p1.y + PADDLE_H) {
    b.vx = Math.abs(b.vx) * 1.03;
    b.x = PADDLE_W;
    const impacto = (b.y - (jogo.p1.y + PADDLE_H / 2)) / (PADDLE_H / 2);
    b.vy += impacto * 2;
  }

  if (b.x >= CANVAS_W - PADDLE_W - BALL_SIZE && b.y + BALL_SIZE >= jogo.p2.y && b.y <= jogo.p2.y + PADDLE_H) {
    b.vx = -Math.abs(b.vx) * 1.03;
    b.x = CANVAS_W - PADDLE_W - BALL_SIZE;
    const impacto = (b.y - (jogo.p2.y + PADDLE_H / 2)) / (PADDLE_H / 2);
    b.vy += impacto * 2;
  }

  if (b.x < 0) {
    jogo.p2.score += 1;
    if (personalizacao.efeito === 'Particulas no Gol') criarParticulas(0, b.y);
    resetBola(1);
  } else if (b.x > CANVAS_W) {
    jogo.p1.score += 1;
    if (personalizacao.efeito === 'Particulas no Gol') criarParticulas(CANVAS_W, b.y);
    resetBola(-1);
  }

  jogo.particulas.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vida -= 1;
  });
  jogo.particulas = jogo.particulas.filter((p) => p.vida > 0);

  if (jogo.p1.score >= WINNING_SCORE || jogo.p2.score >= WINNING_SCORE) {
    encerrarJogo();
  }
}

function desenharFundo() {
  const estilo = BG_ESTILO[personalizacao.background] || 'solido';
  ctx.fillStyle = '#05070a';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  if (estilo === 'grade') {
    ctx.strokeStyle = 'rgba(35, 160, 140, 0.25)';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_H);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_W, y);
      ctx.stroke();
    }
  } else if (estilo === 'estrelas') {
    if (!jogo._estrelas) {
      jogo._estrelas = Array.from({ length: 80 }, () => ({
        x: Math.random() * CANVAS_W,
        y: Math.random() * CANVAS_H,
        r: Math.random() * 1.5 + 0.3,
      }));
    }
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    jogo._estrelas.forEach((s) => {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.setLineDash([6, 10]);
  ctx.beginPath();
  ctx.moveTo(CANVAS_W / 2, 0);
  ctx.lineTo(CANVAS_W / 2, CANVAS_H);
  ctx.stroke();
  ctx.setLineDash([]);
}

function desenhar() {
  desenharFundo();

  const cor = SKIN_CORES[personalizacao.skin] || '#e8f1f2';
  ctx.fillStyle = cor;
  ctx.fillRect(0, jogo.p1.y, PADDLE_W, PADDLE_H);
  ctx.fillRect(CANVAS_W - PADDLE_W, jogo.p2.y, PADDLE_W, PADDLE_H);

  if (jogo.trilha.length) {
    jogo.trilha.forEach((pt, i) => {
      ctx.globalAlpha = (i + 1) / jogo.trilha.length * 0.5;
      ctx.fillStyle = cor;
      ctx.fillRect(pt.x, pt.y, BALL_SIZE, BALL_SIZE);
    });
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = cor;
  ctx.fillRect(jogo.bola.x, jogo.bola.y, BALL_SIZE, BALL_SIZE);

  jogo.particulas.forEach((p) => {
    ctx.globalAlpha = Math.max(0, p.vida / 30);
    ctx.fillStyle = cor;
    ctx.fillRect(p.x, p.y, 3, 3);
  });
  ctx.globalAlpha = 1;

  const fonte = FONTE_MAP[personalizacao.fonte] || FONTE_MAP.Padrao;
  ctx.fillStyle = '#e8f1f2';
  ctx.font = `28px ${fonte}`;
  ctx.textAlign = 'center';
  ctx.fillText(String(jogo.p1.score), CANVAS_W / 2 - 60, 50);
  ctx.fillText(String(jogo.p2.score), CANVAS_W / 2 + 60, 50);

  ctx.font = `13px ${fonte}`;
  ctx.fillStyle = 'rgba(232,241,242,0.6)';
  ctx.fillText(estado.nome1, CANVAS_W / 2 - 60, 70);
  ctx.fillText(estado.nome2, CANVAS_W / 2 + 60, 70);

  if (estado.fase === 'pausado') {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#fff';
    ctx.font = '24px sans-serif';
    ctx.fillText('PAUSADO', CANVAS_W / 2, CANVAS_H / 2);
  }
}

function loop() {
  atualizar();
  desenhar();
  requestAnimationFrame(loop);
}

async function enviarScore(nome, score) {
  try {
    await fetch('/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, score }),
    });
  } catch (e) {
    console.error('Falha ao enviar score', e);
  }
}

function encerrarJogo() {
  estado.fase = 'fimDeJogo';
  const p1Venceu = jogo.p1.score >= WINNING_SCORE;
  const vencedorNome = p1Venceu ? estado.nome1 : estado.nome2;
  const vencedorScore = p1Venceu ? jogo.p1.score : jogo.p2.score;

  el.goVencedor.textContent = `${vencedorNome} venceu!`;
  el.goPlacar.textContent = `${estado.nome1} ${jogo.p1.score} x ${jogo.p2.score} ${estado.nome2}`;
  el.gameOver.classList.remove('hidden');

  enviarScore(estado.nome1, jogo.p1.score);
  if (estado.modo === '2p') enviarScore(estado.nome2, jogo.p2.score);
}

el.btnVsIA.addEventListener('click', () => novoJogo('ia'));
el.btnVs2P.addEventListener('click', () => novoJogo('2p'));

el.btnJogarNovamente.addEventListener('click', () => {
  el.gameOver.classList.add('hidden');
  el.menu.classList.remove('hidden');
  estado.fase = 'menu';
});

el.btnRanking.addEventListener('click', abrirRanking);
el.btnFecharRanking.addEventListener('click', () => el.ranking.classList.add('hidden'));

async function abrirRanking() {
  el.rankingLista.innerHTML = '<li>Carregando...</li>';
  el.ranking.classList.remove('hidden');
  try {
    const resp = await fetch('/scores');
    const dados = await resp.json();
    el.rankingLista.innerHTML = dados.length
      ? dados.map((r) => `<li>${escapeHtml(r.nome)} &mdash; ${r.score_total}</li>`).join('')
      : '<li>Ninguem jogou ainda.</li>';
  } catch (e) {
    el.rankingLista.innerHTML = '<li>Erro ao carregar ranking.</li>';
  }
}

el.btnPersonalizar.addEventListener('click', abrirLoja);
el.btnFecharLoja.addEventListener('click', () => el.loja.classList.add('hidden'));

function escapeHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

async function abrirLoja() {
  el.lojaListas.innerHTML = 'Carregando...';
  el.loja.classList.remove('hidden');
  await carregarLoja();
}

async function carregarLoja() {
  const nome = estado.nome1;
  const resp = await fetch(`/items?nome=${encodeURIComponent(nome)}`);
  const dados = await resp.json();
  el.lojaScore.textContent = `Score total de ${nome}: ${dados.score_total}`;

  const grupos = {};
  dados.items.forEach((item) => {
    grupos[item.tipo] = grupos[item.tipo] || [];
    grupos[item.tipo].push(item);
  });

  const rotulos = { skin: 'Skins', background: 'Fundos', fonte: 'Fontes', efeito: 'Efeitos' };
  const chaveAtual = { skin: 'skin', background: 'background', fonte: 'fonte', efeito: 'efeito' };

  el.lojaListas.innerHTML = Object.entries(grupos)
    .map(([tipo, itens]) => `
      <div class="grupo-loja">
        <h3>${rotulos[tipo] || tipo}</h3>
        ${itens.map((item) => renderItemLoja(item, chaveAtual[tipo])).join('')}
      </div>
    `)
    .join('');

  el.lojaListas.querySelectorAll('[data-selecionar]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const { tipo, nome: nomeItem } = btn.dataset;
      personalizacao[tipo] = nomeItem;
      salvarPersonalizacao(personalizacao);
      carregarLoja();
    });
  });

  el.lojaListas.querySelectorAll('[data-desbloquear]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const itemId = btn.dataset.itemId;
      btn.disabled = true;
      btn.textContent = 'Desbloqueando...';
      try {
        const resp = await fetch('/unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome, item_id: Number(itemId) }),
        });
        const dadosResp = await resp.json();
        if (!resp.ok) {
          alert(dadosResp.error || 'Nao foi possivel desbloquear.');
        }
      } catch (e) {
        alert('Erro de conexao ao desbloquear.');
      }
      carregarLoja();
    });
  });
}

function renderItemLoja(item, chaveTipo) {
  const selecionado = personalizacao[chaveTipo] === item.nome;
  const classe = selecionado ? 'item-loja selecionado' : 'item-loja';
  if (item.desbloqueado) {
    return `
      <div class="${classe}">
        <span>${escapeHtml(item.nome)}</span>
        <button data-selecionar data-tipo="${chaveTipo}" data-nome="${escapeHtml(item.nome)}">
          ${selecionado ? 'Selecionado' : 'Usar'}
        </button>
      </div>
    `;
  }
  return `
    <div class="${classe}">
      <span>${escapeHtml(item.nome)} (${item.custo_score} pts)</span>
      <button data-desbloquear data-item-id="${item.id}">Desbloquear</button>
    </div>
  `;
}

requestAnimationFrame(loop);
