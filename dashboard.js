// Sem sessão ativa, manda o usuário de volta para o login
if (!localStorage.getItem('alpha-sessao')) window.location.href = 'projeto.html';

// ===== Constantes =====

const CHAVE = 'alpha-tarefas';
// Nome da chave usada para guardar as tarefas no localStorage do navegador

const ROTULOS = { pendente: 'Pendente', andamento: 'Em andamento', concluida: 'Concluída' };
// Converte o status guardado (ex.: 'andamento') no texto exibido ('Em andamento')

const TITULOS = { pendente: 'Pendente', andamento: 'Em andamento', concluida: 'Concluída', atrasada: 'Atrasadas' };
// Títulos que aparecem no topo do painel de cada botão

// Tarefas de exemplo, usadas só na primeira vez que a página abre
const exemplos = [
    { id: 1, titulo: 'Revisar página de login', descricao: 'Conferir a validação dos campos de e-mail e senha.\nTestar as mensagens de erro quando os campos estiverem vazios.\nAjustar o layout para celular.', vencimento: '2026-10-12', status: 'pendente' },
    // Tarefa pendente com descrição em várias linhas (\n quebra a linha)
    { id: 2, titulo: 'Criar tela de cadastro', descricao: 'Formulário com nome, e-mail e senha', vencimento: '2026-10-05', status: 'concluida' },
    // Tarefa já concluída
    { id: 3, titulo: 'Integrar login ao dashboard', descricao: 'Ligar o botão ENTRAR à tela principal', vencimento: '2026-10-06', status: 'andamento' }
    // Tarefa em andamento
];

// ===== Estado da aplicação =====

// Lê as tarefas salvas; se não houver nada salvo, usa os exemplos
let tarefas = JSON.parse(localStorage.getItem(CHAVE)) || exemplos;

let painelAberto = null;
// Guarda qual painel está aberto ('pendente', 'andamento', 'concluida', 'atrasada') ou null se estiver fechado

let tarefaVisualizada = null;
// Guarda o id da tarefa cujos detalhes estão abertos, ou null se estiver na lista

let idParaExcluir = null;
// Guarda o id da tarefa que o usuário pediu para excluir, até ele confirmar

// ===== Funções auxiliares =====

const $ = (id) => document.getElementById(id);
// Atalho para buscar um elemento pelo id, em vez de escrever document.getElementById toda vez

function el(tag, classe, texto) {
    // Cria um elemento HTML: tag é o tipo (ex.: 'li'), classe e texto são opcionais
    const e = document.createElement(tag);   // cria o elemento na memória
    if (classe) e.className = classe;        // aplica a classe CSS, se foi informada
    if (texto !== undefined) e.textContent = texto; // define o texto, se foi informado
    return e;                                // devolve o elemento pronto
}

function hojeISO() {
    // Devolve a data de hoje no formato 2026-10-08, para comparar com o vencimento
    const d = new Date();                                                       // data atual
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    // Monta ano-mês-dia; o mês é somado a 1 porque começa em 0, e padStart garante dois dígitos
}

function formatarData(iso) {
    // Converte 2026-10-12 em 12/10/2026 para exibir ao usuário
    if (!iso) return 'sem prazo';          // sem data, mostra 'sem prazo'
    const [a, m, d] = iso.split('-');      // separa ano, mês e dia
    return `${d}/${m}/${a}`;               // monta na ordem brasileira
}

function estaAtrasada(t) {
    // Verdadeiro quando a tarefa tem prazo, não está concluída e o prazo já passou
    return t.status !== 'concluida' && t.vencimento && t.vencimento < hojeISO();
    // Compara as datas como texto; funciona porque o formato é ano-mês-dia
}

// ===== Salvar e atualizar a tela =====

function salvar() {
    localStorage.setItem(CHAVE, JSON.stringify(tarefas));  // guarda a lista no navegador, convertida em texto
    render();                                              // redesenha a tela com os dados novos
}

function renderEstatisticas() {
    // Atualiza os cinco contadores do topo
    $('s-total').textContent = tarefas.length;                                          // total de tarefas
    $('s-pendentes').textContent = tarefas.filter(t => t.status === 'pendente').length; // quantidade pendente
    $('s-andamento').textContent = tarefas.filter(t => t.status === 'andamento').length;// quantidade em andamento
    $('s-concluidas').textContent = tarefas.filter(t => t.status === 'concluida').length;// quantidade concluída
    $('s-atrasadas').textContent = tarefas.filter(estaAtrasada).length;                 // quantidade atrasada
}

function renderBotoes() {
    // Atualiza a contagem de cada botão de status e marca o que está aberto
    document.querySelectorAll('.status-btn').forEach(botao => {
        // Passa por cada botão de status
        const painel = botao.dataset.painel;   // lê o valor de data-painel do botão
        const qtd = painel === 'atrasada'
            ? tarefas.filter(estaAtrasada).length                // botão de atrasadas usa a regra de atraso
            : tarefas.filter(t => t.status === painel).length;   // os demais usam o status
        botao.querySelector('.contagem').textContent = qtd;       // mostra a quantidade no botão
        botao.classList.toggle('active', painel === painelAberto); // acende o botão se o painel dele estiver aberto
    });
}

function tarefasDoPainel(painel) {
    // Devolve as tarefas que vão aparecer no painel, já ordenadas por vencimento
    const lista = painel === 'atrasada'
        ? tarefas.filter(estaAtrasada)                        // painel de atrasadas
        : tarefas.filter(t => t.status === painel);           // painel de um status
    return lista.sort((a, b) => {
        // Ordena: tarefas com prazo vêm primeiro, pela data mais próxima
        if (!a.vencimento) return 1;                          // a sem prazo vai para o fim
        if (!b.vencimento) return -1;                         // b sem prazo vai para o fim
        return a.vencimento.localeCompare(b.vencimento);      // compara as datas em ordem
    });
}

// ===== Montagem dos itens da tela =====

function criarItemLista(t) {
    // Cria a linha da lista: nome da tarefa e o botão Visualizar
    const li = el('li', 'task');             // cria o item da lista com a classe task
    li.dataset.id = t.id;                    // guarda o id da tarefa no próprio item

    li.append(el('span', 'task-text', t.titulo));  // adiciona o nome da tarefa à esquerda

    const acoes = el('div', 'task-actions'); // cria o grupo de botões
    const visualizar = el('button', 'icon-btn', 'Visualizar'); // cria o botão Visualizar
    visualizar.dataset.acao = 'visualizar';  // indica qual ação ele executa ao ser clicado
    acoes.append(visualizar);                // coloca o botão dentro do grupo

    li.append(acoes);                        // coloca o grupo de botões no item
    return li;                               // devolve o item pronto
}

function criarDetalhe(t) {
    // Cria a tela de detalhes com título, selo, prazo, descrição e botões
    const li = el('li', 'detalhe');          // cria o cartão de detalhes
    li.dataset.id = t.id;                    // guarda o id da tarefa

    li.append(el('h3', 'detalhe-titulo', t.titulo)); // título da tarefa

    const meta = el('div', 'detalhe-meta');  // linha com o selo de status e o prazo
    meta.append(
        el('span', 'badge badge-' + t.status, ROTULOS[t.status]),  // selo colorido com o status
        el('span', estaAtrasada(t) ? 'late' : '', 'vence ' + formatarData(t.vencimento))
        // prazo; fica vermelho com a classe late se estiver atrasado
    );
    li.append(meta);                         // coloca a linha no cartão

    li.append(el('div', 'detalhe-rotulo', 'O que precisa ser feito')); // rótulo acima da descrição
    li.append(el('div', 'detalhe-texto', t.descricao || 'Nenhuma descrição informada.'));
    // Descrição da tarefa; se estiver vazia, mostra uma mensagem

    const acoes = el('div', 'task-actions'); // grupo de botões do detalhe
    const voltar = el('button', 'icon-btn', 'Voltar');   // botão para voltar à lista
    voltar.dataset.acao = 'voltar';
    const editar = el('button', 'icon-btn', 'Editar');   // botão para abrir o formulário de edição
    editar.dataset.acao = 'editar';
    const excluir = el('button', 'icon-btn icon-del', 'Excluir'); // botão para excluir
    excluir.dataset.acao = 'excluir';
    acoes.append(voltar, editar, excluir);   // coloca os três botões no grupo

    li.append(acoes);                        // coloca o grupo no cartão
    return li;                               // devolve o cartão pronto
}

// ===== Painel =====

function renderPainel() {
    // Mostra ou esconde o painel e preenche com a lista ou com os detalhes
    const painel = $('painel');
    if (!painelAberto) {
        painel.classList.add('hidden');      // sem painel aberto, esconde a área
        return;                              // e encerra a função
    }
    painel.classList.remove('hidden');       // mostra a área do painel
    $('painel-titulo').textContent = TITULOS[painelAberto]; // escreve o título do painel

    const lista = $('lista');
    lista.replaceChildren();                 // apaga o conteúdo anterior do painel

    if (tarefaVisualizada) {
        // Se há uma tarefa sendo visualizada, mostra a tela de detalhes
        const t = tarefas.find(x => x.id === tarefaVisualizada); // procura a tarefa pelo id
        if (t) {
            lista.append(criarDetalhe(t));   // mostra os detalhes
            return;                          // não desenha a lista
        }
        tarefaVisualizada = null;            // se a tarefa não existe mais, volta para a lista
    }

    const itens = tarefasDoPainel(painelAberto); // pega as tarefas do painel aberto
    if (!itens.length) {
        lista.append(el('li', 'empty', 'Nenhuma tarefa nesta lista.')); // mensagem de lista vazia
        return;
    }
    itens.forEach(t => lista.append(criarItemLista(t))); // cria um item para cada tarefa
}

function render() {
    // Atualiza a tela inteira: contadores, botões e painel
    renderEstatisticas();   // contadores do topo
    renderBotoes();         // botões de status e suas contagens
    renderPainel();         // painel e seu conteúdo
}

// ===== Modal de criar e editar =====

function abrirModal(t = null) {
    // Abre o formulário. Sem tarefa (t = null) cria uma nova; com tarefa, preenche os campos para editar
    $('modal-titulo').textContent = t ? 'Editar tarefa' : 'Nova tarefa'; // título conforme o modo
    $('f-id').value = t ? t.id : '';                                      // id oculto; vazio ao criar
    $('f-titulo').value = t ? t.titulo : '';                              // preenche o título
    $('f-descricao').value = t ? (t.descricao || '') : '';                // preenche a descrição
    $('f-vencimento').value = t ? (t.vencimento || '') : '';              // preenche a data
    $('f-status').value = t ? t.status : 'pendente';                      // status padrão: pendente
    $('modal').classList.remove('hidden');                                // mostra o modal
    $('f-titulo').focus();                                                // posiciona o cursor no título
}

function fecharModal() {
    // Esconde o modal de criar e editar
    $('modal').classList.add('hidden');
}

$('form').addEventListener('submit', (e) => {
    // Quando o formulário é enviado, salva a tarefa nova ou a editada
    e.preventDefault();                                      // impede o recarregamento da página
    const titulo = $('f-titulo').value.trim();               // lê o título sem espaços nas pontas
    if (!titulo) return;                                     // sem título, não salva
    const dados = {
        titulo,                                              // título da tarefa
        descricao: $('f-descricao').value.trim(),            // descrição sem espaços nas pontas
        vencimento: $('f-vencimento').value,                 // data escolhida (pode ser vazia)
        status: $('f-status').value                          // status escolhido
    };
    const id = $('f-id').value;                              // id oculto: vazio se for nova
    if (id) {
        Object.assign(tarefas.find(t => t.id === Number(id)), dados); // edita a tarefa existente
    } else {
        tarefas.push({ id: Date.now(), ...dados });          // cria nova; Date.now() gera um id único
    }
    fecharModal();                                           // fecha o modal
    salvar();                                                // guarda e redesenha
});

$('btn-nova').addEventListener('click', () => abrirModal()); // botão Nova Tarefa abre o modal vazio
$('btn-cancelar').addEventListener('click', fecharModal);    // Cancelar fecha sem salvar
$('modal').addEventListener('click', (e) => {
    // Clicar no fundo escuro, fora da caixa, também fecha o modal
    if (e.target.id === 'modal') fecharModal();
});

// ===== Botões de status =====

document.querySelectorAll('.status-btn').forEach(botao => {
    // Para cada botão de status, define o que acontece ao clicar
    botao.addEventListener('click', () => {
        const painel = botao.dataset.painel;                    // qual painel este botão abre
        painelAberto = painelAberto === painel ? null : painel; // se já estava aberto, fecha; senão, abre
        tarefaVisualizada = null;                               // ao trocar de painel, volta para a lista
        render();                                               // redesenha a tela
    });
});

// ===== Ações dentro da lista e dos detalhes =====

$('lista').addEventListener('click', (e) => {
    // Um único ouvinte para toda a lista; descobre qual botão foi clicado
    const botao = e.target.closest('button');                // acha o botão mais próximo do clique
    if (!botao) return;                                      // se não foi botão, ignora
    const id = Number(botao.closest('[data-id]').dataset.id); // pega o id da tarefa desse item

    switch (botao.dataset.acao) {
        // Escolhe a ação conforme o data-acao do botão
        case 'visualizar':
            tarefaVisualizada = id;   // guarda qual tarefa mostrar
            render();                 // redesenha com a tela de detalhes
            break;
        case 'voltar':
            tarefaVisualizada = null; // limpa a seleção
            render();                 // volta para a lista
            break;
        case 'editar':
            abrirModal(tarefas.find(t => t.id === id)); // abre o formulário preenchido com a tarefa
            break;
        case 'excluir':
            idParaExcluir = id;                                     // guarda qual tarefa excluir
            $('modal-excluir').classList.remove('hidden');          // mostra a confirmação
            break;
    }
});

// ===== Confirmação de exclusão =====

$('excluir-cancelar').addEventListener('click', () => {
    $('modal-excluir').classList.add('hidden');  // fecha a confirmação sem excluir
});

$('excluir-confirmar').addEventListener('click', () => {
    tarefas = tarefas.filter(x => x.id !== idParaExcluir);  // mantém todas as tarefas exceto a excluída
    if (tarefaVisualizada === idParaExcluir) tarefaVisualizada = null; // se estava nos detalhes dela, volta para a lista
    $('modal-excluir').classList.add('hidden');             // fecha a confirmação
    salvar();                                               // guarda e redesenha
});

// ===== Sair =====

$('btn-sair').addEventListener('click', () => localStorage.removeItem('alpha-sessao'));
// Ao clicar em Sair, apaga a sessão; o link então leva para o login

// ===== Início =====

render();  // desenha a tela assim que a página carrega