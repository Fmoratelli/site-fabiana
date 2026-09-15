/* ============================================================
   sala.js  ·  comportamento das peças das salas interativas
   Vanilla, zero dependência. Extraído de sala-01-prototipo.html
   e demo-ache-o-golpe.html.

   Diferença principal em relação aos protótipos: lá cada peça era
   presa a um id único (#choice, #task, #quiz), então só cabia uma
   de cada por página. Aqui tudo é por classe e com estado próprio,
   então dá pra ter várias decisões, várias tarefas e vários quizzes
   na mesma sala sem uma atrapalhar a outra.

   Nada aqui depende de ordem de carregamento: o arquivo entra com
   defer no _sala.html.
   ============================================================ */
(function(){
  'use strict';

  /* ---------- barra de leitura ---------- */
  var bar = document.getElementById('progress');
  if(bar){
    addEventListener('scroll', function(){
      var h = document.documentElement;
      var total = h.scrollHeight - h.clientHeight;
      bar.style.width = (total > 0 ? (h.scrollTop / total * 100) : 0) + '%';
    }, {passive:true});
  }

  /* ---------- revelar ----------
     A altura de abertura sai do próprio conteúdo, medida na hora.
     O protótipo usava max-height fixo de 220px e cortava texto maior. */
  document.querySelectorAll('.reveal').forEach(function(rev){
    var btn = rev.querySelector('[data-reveal]');
    var body = rev.querySelector('.body');
    if(!btn || !body) return;
    btn.setAttribute('aria-expanded','false');
    btn.addEventListener('click', function(){
      var abrindo = !rev.classList.contains('open');
      rev.classList.toggle('open', abrindo);
      btn.setAttribute('aria-expanded', abrindo ? 'true' : 'false');
      body.style.maxHeight = abrindo ? (body.scrollHeight + 'px') : '';
    });
    /* se a janela mudar de largura com o bloco aberto, o texto reflui
       e a altura antiga fica errada */
    addEventListener('resize', function(){
      if(rev.classList.contains('open')) body.style.maxHeight = body.scrollHeight + 'px';
    }, {passive:true});
  });

  /* ---------- decisão (e aí, o que você faz?) ----------
     Cada [data-decisao] é uma unidade fechada: os botões e os desfechos
     de dentro dela não enxergam os de outra decisão na mesma página. */
  document.querySelectorAll('[data-decisao]').forEach(function(bloco){
    var botoes = bloco.querySelectorAll('.choice button[data-opt]');
    var saidas = bloco.querySelectorAll('[data-out]');
    botoes.forEach(function(b){
      b.addEventListener('click', function(){
        botoes.forEach(function(x){ x.classList.remove('picked'); });
        b.classList.add('picked');
        saidas.forEach(function(o){
          o.classList.toggle('show', o.getAttribute('data-out') === b.getAttribute('data-opt'));
        });
      });
    });
  });

  /* ---------- faça agora ----------
     A caixa é um <button>, então já vem com teclado e foco de graça.
     O texto ao lado também alterna, pra dar um alvo de toque maior. */
  document.querySelectorAll('.task').forEach(function(task){
    var box = task.querySelector('.box');
    var texto = task.querySelector('.t');
    if(!box) return;
    box.setAttribute('aria-pressed','false');
    function alterna(){
      var feito = !task.classList.contains('done');
      task.classList.toggle('done', feito);
      box.setAttribute('aria-pressed', feito ? 'true' : 'false');
    }
    box.addEventListener('click', alterna);
    if(texto) texto.addEventListener('click', alterna);
  });

  /* ---------- cai a ficha (quiz) ----------
     O estado de respondido é de cada quiz, não da página. */
  document.querySelectorAll('.quiz').forEach(function(quiz){
    var respondido = false;
    var opcoes = quiz.querySelectorAll('.opt');
    var exp = quiz.querySelector('.exp');
    opcoes.forEach(function(o){
      o.addEventListener('click', function(){
        if(respondido) return;
        respondido = true;
        var certa = o.getAttribute('data-correct') === '1';
        o.classList.add(certa ? 'right' : 'wrong');
        if(!certa){
          var gabarito = quiz.querySelector('.opt[data-correct="1"]');
          if(gabarito) gabarito.classList.add('right');
        }
        if(exp) exp.classList.add('show');
        opcoes.forEach(function(x){ x.disabled = true; });
      });
    });
  });

  /* ---------- ache o golpe ----------
     O conteúdo vem todo da marcação. Cada sinal é um elemento dentro
     de .sinais com data-sinal-id e data-sinal-titulo, e o texto do
     elemento é a explicação. O total sai da contagem, não é cravado. */
  document.querySelectorAll('[data-golpe]').forEach(function(bloco){
    var sinais = {};
    var total = 0;
    bloco.querySelectorAll('.sinais [data-sinal-id]').forEach(function(s){
      sinais[s.getAttribute('data-sinal-id')] = {
        titulo: s.getAttribute('data-sinal-titulo') || '',
        texto: s.textContent.trim()
      };
      total++;
    });

    var flags = bloco.querySelectorAll('.flag[data-sinal]');
    var listaEl = bloco.querySelector('.finds');
    var nEl = bloco.querySelector('[data-golpe-n]');
    var totalEl = bloco.querySelector('[data-golpe-total]');
    var fill = bloco.querySelector('.track i');
    var done = bloco.querySelector('.done');
    var reset = bloco.querySelector('[data-golpe-reset]');
    var achados = Object.create(null);
    var quantos = 0;

    if(totalEl) totalEl.textContent = total;

    function pinta(){
      if(nEl) nEl.textContent = quantos;
      if(fill) fill.style.width = (total ? (quantos / total * 100) : 0) + '%';
      if(done) done.classList.toggle('show', total > 0 && quantos === total);
    }

    flags.forEach(function(f){
      f.setAttribute('aria-pressed','false');
      f.addEventListener('click', function(){
        var id = f.getAttribute('data-sinal');
        if(achados[id]) return;
        var dado = sinais[id];
        if(!dado) return; /* sinal sem marcação correspondente: não faz nada */
        achados[id] = true;
        quantos++;
        f.classList.add('got');
        f.setAttribute('aria-pressed','true');
        if(listaEl){
          var card = document.createElement('div');
          card.className = 'find';
          var t = document.createElement('b');
          t.textContent = dado.titulo + '.';
          card.appendChild(t);
          card.appendChild(document.createTextNode(' ' + dado.texto));
          listaEl.appendChild(card);
          requestAnimationFrame(function(){ card.classList.add('show'); });
        }
        pinta();
      });
    });

    if(reset){
      reset.addEventListener('click', function(){
        achados = Object.create(null);
        quantos = 0;
        if(listaEl) listaEl.textContent = '';
        flags.forEach(function(f){
          f.classList.remove('got');
          f.setAttribute('aria-pressed','false');
        });
        pinta();
      });
    }

    pinta();
  });

  /* ---------- concluir sala ----------
     Grava o progresso na MESMA chave e no MESMO formato que a HUB usa
     (textos.trilha.v1, {s1:true,...}): um booleano por sala. A identidade
     vem do data-sala do <body>, que tem que casar com o data-id da HUB.
     Clicar de novo desmarca, igual ao [ marcar lido ] de lá. */
  (function(){
    var id = document.body.getAttribute('data-sala');
    var btn = document.querySelector('[data-concluir]');
    if(!btn) return;
    /* {{ID}} esquecido no molde, ou id fora do padrão: não grava lixo na chave */
    if(!id || !/^s\d+$/.test(id)){
      if(window.console) console.warn('sala.js: data-sala do <body> precisa ser s1, s2... (veio "' + id + '"). Progresso desligado nesta página.');
      btn.disabled = true;
      return;
    }
    var KEY = 'textos.trilha.v1';
    function le(){
      try{ return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; }catch(e){ return {}; }
    }
    function grava(obj){
      try{ localStorage.setItem(KEY, JSON.stringify(obj)); }catch(e){}
    }
    function pinta(feita){
      document.body.classList.toggle('concluida', feita);
      btn.setAttribute('aria-pressed', feita ? 'true' : 'false');
      btn.textContent = feita ? '✦ sala concluída' : '✦ concluir sala';
    }
    /* microfeedback: a estrela do fecho pulsa e o botão emite um anel.
       Só no clique que conclui; abrir uma sala já concluída não anima. */
    function acende(el){
      if(!el) return;
      el.classList.remove('ignite'); void el.offsetWidth;
      el.classList.add('ignite');
      el.addEventListener('animationend', function(){ el.classList.remove('ignite'); }, {once:true});
    }
    var star = document.querySelector('.fecho .star');
    pinta(!!le()[id]);
    btn.addEventListener('click', function(){
      var lidos = le();
      var feita = !lidos[id];
      lidos[id] = feita;
      grava(lidos);
      pinta(feita);
      if(feita){ acende(star); acende(btn); }
    });
  })();

  /* ---------- menu hambúrguer ----------
     mesmo comportamento do index.html e da HUB */
  (function(){
    var btn = document.getElementById('menuBtn');
    var list = document.querySelector('nav ul');
    if(!btn || !list) return;
    function fecha(){
      btn.classList.remove('open'); list.classList.remove('mobile-open');
      btn.setAttribute('aria-expanded','false'); document.body.style.overflow='';
    }
    function abre(){
      btn.classList.add('open'); list.classList.add('mobile-open');
      btn.setAttribute('aria-expanded','true'); document.body.style.overflow='hidden';
    }
    btn.addEventListener('click', function(){
      if(btn.classList.contains('open')) fecha(); else abre();
    });
    list.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', fecha); });
  })();

})();
