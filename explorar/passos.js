/* ============================================================
   passos.js  ·  motor da sala em passos, um por tela

   Vanilla, zero dependência. Entra com defer no _passos.html.

   O conteúdo mora todo no HTML: cada <section class="passo"
   data-tipo="..."> é um passo, na ordem em que aparece. O motor
   só conta os passos, mostra um por vez, enche a barra e cuida do
   botão de avançar. Montar sala nova é escrever passos, não mexer
   aqui.

   Tipos de passo e o que cada um faz com o "avançar":
     entrada   só apresenta; o botão vira "começar"
     texto     prosa; avançar sempre livre
     pergunta  opções; avançar TRAVA até responder
     revelar   dúvida + resposta escondida; avançar TRAVA até abrir
     tarefa    faça agora com botão "fiz"; avançar livre (a pessoa
               pode não ter como fazer agora)
     decisao   e aí, o que você faz; avançar TRAVA até escolher
     golpe     ache o golpe; avançar TRAVA até achar todos os sinais
     vitoria   tela final: grava a conclusão, acende a estrela e
               troca o avançar pelos botões de saída

   Progresso: mesma chave e mesmo formato da HUB (textos.trilha.v1,
   {s1:true,...}). A identidade vem do data-sala do <body>.
   ============================================================ */
(function(){
  'use strict';

  /* com JS ligado, o CSS esconde tudo que não é o passo ativo.
     Sem JS, a sala aparece inteira, empilhada, e ainda se lê. */
  document.documentElement.classList.add('js');

  var passos = [].slice.call(document.querySelectorAll('.passo'));
  if(!passos.length) return;
  var n = passos.length;

  var barra = document.querySelector('.barra');
  var barraFill = barra ? barra.querySelector('i') : null;
  var contagem = document.querySelector('.contagem');
  var avancar = document.querySelector('[data-avancar]');
  var voltar = document.querySelector('[data-voltar]');
  var fim = document.querySelector('.fim');
  if(!avancar) return;

  var atual = -1;
  var liberado = Object.create(null);   /* índice -> true quando o passo travado foi cumprido */
  var TRAVA = {pergunta:1, revelar:1, decisao:1, golpe:1};
  var reduzMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function tipo(p){ return p.getAttribute('data-tipo') || 'texto'; }
  function travado(i){ return !!TRAVA[tipo(passos[i])] && !liberado[i]; }
  function libera(p){ liberado[passos.indexOf(p)] = true; pintaAvancar(); }
  function pintaAvancar(){ avancar.disabled = travado(atual); }

  /* ---------- trocar de passo ---------- */
  function mostra(i, sentido){
    if(i < 0 || i >= n) return;
    var anterior = atual;
    atual = i;
    passos.forEach(function(p, k){
      p.classList.remove('entra', 'entra-volta');
      p.classList.toggle('ativo', k === i);
    });
    var p = passos[i];
    var t = tipo(p);

    if(!reduzMovimento && anterior !== -1){
      p.classList.add(sentido < 0 ? 'entra-volta' : 'entra');
      p.addEventListener('animationend', function(){ p.classList.remove('entra', 'entra-volta'); }, {once:true});
    }

    /* barra: entrada vazia, vitória cheia */
    var pct = n > 1 ? (i / (n - 1) * 100) : 100;
    if(barraFill) barraFill.style.width = pct + '%';
    if(barra){
      barra.setAttribute('aria-valuenow', i + 1);
      barra.setAttribute('aria-valuetext', 'passo ' + (i + 1) + ' de ' + n);
    }
    if(contagem) contagem.textContent = (i + 1) + ' / ' + n;

    /* rodapé: o que aparece embaixo */
    var ultimo = t === 'vitoria';
    avancar.hidden = ultimo;
    if(voltar) voltar.hidden = (i === 0) || ultimo;
    if(fim) fim.hidden = !ultimo;
    avancar.textContent = p.getAttribute('data-rotulo') || (t === 'entrada' ? 'começar' : 'avançar');
    pintaAvancar();

    /* leitor de tela e teclado começam no passo, não perdidos na página */
    p.setAttribute('tabindex', '-1');
    p.focus({preventScroll:true});
    var palco = p.parentElement;
    if(palco) palco.scrollTop = 0;

    if(ultimo) conclui();
  }

  avancar.addEventListener('click', function(){
    if(travado(atual)) return;
    mostra(atual + 1, 1);
  });
  if(voltar) voltar.addEventListener('click', function(){ mostra(atual - 1, -1); });

  /* ---------- pergunta ----------
     Responde uma vez. A certa acende sempre; errar mostra a certa e
     explica leve, sem punir. A explicação pode ser uma só (.exp) ou
     uma por caso (.exp[data-quando="certo"|"errado"]). */
  passos.forEach(function(p){
    if(tipo(p) !== 'pergunta') return;
    var opcoes = p.querySelectorAll('.opt');
    var exps = p.querySelectorAll('.exp');
    var respondido = false;
    opcoes.forEach(function(o){
      o.addEventListener('click', function(){
        if(respondido) return;
        respondido = true;
        var certa = o.getAttribute('data-correct') === '1';
        o.classList.add(certa ? 'right' : 'wrong');
        if(!certa){
          var gabarito = p.querySelector('.opt[data-correct="1"]');
          if(gabarito) gabarito.classList.add('right');
        }
        exps.forEach(function(e){
          var quando = e.getAttribute('data-quando');
          var mostraEsta = !quando || quando === (certa ? 'certo' : 'errado');
          e.classList.toggle('show', mostraEsta);
          if(mostraEsta && !certa) e.classList.add('suave');
        });
        opcoes.forEach(function(x){ x.disabled = true; });
        libera(p);
      });
    });
  });

  /* ---------- revelar ----------
     A dúvida fica à mostra; a resposta abre ao tocar e o botão some.
     Abrir é o que libera o avançar: a resposta é o conteúdo do passo. */
  passos.forEach(function(p){
    if(tipo(p) !== 'revelar') return;
    var btn = p.querySelector('[data-reveal]');
    if(!btn) return;
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', function(){
      p.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      libera(p);
      avancar.focus({preventScroll:true});
    });
  });

  /* ---------- tarefa (faça agora) ----------
     O botão "fiz" alterna, igual à caixa do molde antigo. Não trava
     o avançar: a pessoa pode não ter como fazer agora. */
  passos.forEach(function(p){
    if(tipo(p) !== 'tarefa') return;
    var btn = p.querySelector('[data-feito]');
    if(!btn) return;
    var rotulo = btn.textContent;
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', function(){
      var feito = !p.classList.contains('done');
      p.classList.toggle('done', feito);
      btn.setAttribute('aria-pressed', feito ? 'true' : 'false');
      btn.textContent = feito ? '✓ ' + rotulo : rotulo;
    });
  });

  /* ---------- decisão (e aí, o que você faz?) ----------
     Cada botão data-opt casa com o desfecho data-out de mesmo valor.
     Dá pra trocar de escolha; a primeira escolha já libera o avançar. */
  passos.forEach(function(p){
    if(tipo(p) !== 'decisao') return;
    var botoes = p.querySelectorAll('.opt[data-opt]');
    var saidas = p.querySelectorAll('[data-out]');
    botoes.forEach(function(b){
      b.addEventListener('click', function(){
        botoes.forEach(function(x){ x.classList.remove('picked'); });
        b.classList.add('picked');
        saidas.forEach(function(o){
          o.classList.toggle('show', o.getAttribute('data-out') === b.getAttribute('data-opt'));
        });
        libera(p);
      });
    });
  });

  /* ---------- ache o golpe ----------
     Igual ao sala.js: os sinais vivem na marcação (.sinais), o total
     sai da contagem. Achar todos libera o avançar. */
  passos.forEach(function(p){
    if(tipo(p) !== 'golpe') return;
    var bloco = p.querySelector('[data-golpe]') || p;
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
      var completo = total > 0 && quantos === total;
      if(done) done.classList.toggle('show', completo);
      if(completo) libera(p);
    }
    flags.forEach(function(f){
      f.setAttribute('aria-pressed', 'false');
      f.addEventListener('click', function(){
        var id = f.getAttribute('data-sinal');
        if(achados[id]) return;
        var dado = sinais[id];
        if(!dado) return;
        achados[id] = true;
        quantos++;
        f.classList.add('got');
        f.setAttribute('aria-pressed', 'true');
        if(listaEl){
          var card = document.createElement('div');
          card.className = 'find';
          var t = document.createElement('b');
          t.textContent = dado.titulo + '.';
          card.appendChild(t);
          card.appendChild(document.createTextNode(' ' + dado.texto));
          listaEl.appendChild(card);
        }
        pinta();
      });
    });
    if(reset){
      reset.addEventListener('click', function(){
        achados = Object.create(null);
        quantos = 0;
        if(listaEl) listaEl.textContent = '';
        flags.forEach(function(f){ f.classList.remove('got'); f.setAttribute('aria-pressed', 'false'); });
        pinta();
      });
    }
    /* se não há sinal nenhum na marcação, não trava a sala por engano */
    if(total === 0) libera(p);
    pinta();
  });

  /* ---------- conclusão ----------
     Chegar na vitória é concluir. Grava {id:true} na mesma chave que
     a HUB lê, pinta o body e acende a estrela. Uma vez por visita. */
  var KEY = 'textos.trilha.v1';
  var id = document.body.getAttribute('data-sala');
  var idOk = !!id && /^s\d+$/.test(id);
  if(!idOk && window.console){
    console.warn('passos.js: data-sala do <body> precisa ser s1, s2... (veio "' + id + '"). Progresso desligado nesta página.');
  }
  function le(){
    try{ return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; }catch(e){ return {}; }
  }
  function grava(obj){
    try{ localStorage.setItem(KEY, JSON.stringify(obj)); }catch(e){}
  }
  var acendeu = false;
  function conclui(){
    if(acendeu) return;
    acendeu = true;
    if(idOk){
      var lidos = le();
      lidos[id] = true;
      grava(lidos);
    }
    document.body.classList.add('concluida');
    var estrela = document.querySelector('.estrela');
    if(estrela && !reduzMovimento){
      estrela.classList.add('ignite');
      estrela.addEventListener('animationend', function(){ estrela.classList.remove('ignite'); }, {once:true});
    }
  }

  /* ---------- próxima sala ----------
     O link aponta pra sala seguinte. Se o arquivo ainda não existe
     (404), o botão vira "em breve" e não leva a lugar nenhum. Se a
     checagem falhar por rede, o link fica como está. */
  var prox = document.querySelector('[data-proxima]');
  if(prox && prox.getAttribute('href') && window.fetch){
    fetch(prox.getAttribute('href'), {method:'HEAD'}).then(function(r){
      if(r.status !== 404) return;
      prox.setAttribute('aria-disabled', 'true');
      prox.removeAttribute('href');
      var tag = prox.querySelector('.tag');
      if(tag) tag.textContent = 'em breve';
    }).catch(function(){});
  }

  mostra(0, 1);
})();
