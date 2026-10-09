// ===== Constantes =====

const CHAVE_USUARIOS = 'alpha-usuarios';
// Nome da chave no localStorage onde ficam as contas cadastradas

const CHAVE_SESSAO = 'alpha-sessao';
// Nome da chave que guarda o e-mail de quem está logado

// ===== Funções auxiliares =====

function lerUsuarios() {
    // Lê a lista de contas salvas; se ainda não existir nenhuma, devolve uma lista vazia
    return JSON.parse(localStorage.getItem(CHAVE_USUARIOS)) || [];
}

function salvarUsuarios(lista) {
    // Guarda a lista de contas no navegador, convertida em texto
    localStorage.setItem(CHAVE_USUARIOS, JSON.stringify(lista));
}

async function gerarHash(texto) {
    // Transforma a senha em um código embaralhado (SHA-256), para ela não ser guardada em texto puro
    const bytes = new TextEncoder().encode(texto);                 // converte o texto em bytes
    const buffer = await crypto.subtle.digest('SHA-256', bytes);   // calcula o hash
    return Array.from(new Uint8Array(buffer))                      // transforma o resultado em lista de números
        .map(b => b.toString(16).padStart(2, '0'))                 // cada número vira dois caracteres hexadecimais
        .join('');                                                 // junta tudo em uma única string
}

function emailValido(email) {
    // Confere se o texto tem o formato nome@dominio.extensao
    return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email);
}

function mostrarMensagem(id, texto) {
    // Escreve uma mensagem em um parágrafo da tela; se o texto estiver vazio, esconde o parágrafo
    const p = document.getElementById(id);  // encontra o parágrafo pelo id
    p.textContent = texto;                  // escreve a mensagem
    p.hidden = !texto;                      // mostra quando há texto, esconde quando não há
}

// ===== Página de cadastro =====

const formCadastro = document.getElementById('form-cadastro');
// Procura o formulário de cadastro; em outras páginas ele não existe, então vale null

if (formCadastro) {
    formCadastro.addEventListener('submit', async (e) => {
        e.preventDefault();  // impede o envio tradicional, que colocaria a senha na URL

        const nome = document.getElementById('nome').value.trim();
        // Pega o nome sem espaços nas pontas

        const email = document.getElementById('email').value.trim().toLowerCase();
        // Pega o e-mail sem espaços e em minúsculas, para não criar duas contas com o mesmo e-mail

        const senha = document.getElementById('senha').value;
        // Pega a senha como foi digitada

        if (!emailValido(email)) {
            mostrarMensagem('erro', 'Digite um e-mail válido, como nome@dominio.com.');
            return;  // para aqui e não cria a conta
        }

        if (senha.length < 6) {
            mostrarMensagem('erro', 'A senha precisa ter pelo menos 6 caracteres.');
            return;  // para aqui e não cria a conta
        }

        const usuarios = lerUsuarios();  // carrega as contas já existentes

        if (usuarios.some(u => u.email === email)) {
            mostrarMensagem('erro', 'Já existe uma conta com este e-mail.');
            return;  // não permite duas contas com o mesmo e-mail
        }

        usuarios.push({ nome, email, senhaHash: await gerarHash(senha) });
        // Adiciona a nova conta, guardando o hash da senha e não a senha

        salvarUsuarios(usuarios);  // grava a lista atualizada

        window.location.href = 'projeto.html?cadastrado=1';
        // Volta para o login e avisa que a conta foi criada
    });
}

// ===== Página de login =====

const formLogin = document.getElementById('form-login');
// Procura o formulário de login; em outras páginas ele não existe

if (formLogin) {
    if (new URLSearchParams(window.location.search).get('cadastrado') === '1') {
        mostrarMensagem('aviso', 'Conta criada! Agora é só entrar.');
        // Se veio do cadastro, mostra a mensagem de sucesso
    }

    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();  // impede o envio tradicional, que colocaria a senha na URL

        const email = document.getElementById('email').value.trim().toLowerCase();
        // Pega o e-mail da mesma forma que foi salvo no cadastro

        const senha = document.getElementById('senha').value;
        // Pega a senha digitada

        const usuario = lerUsuarios().find(u => u.email === email);
        // Procura a conta com esse e-mail; devolve undefined se não existir

        if (!usuario || usuario.senhaHash !== await gerarHash(senha)) {
            mostrarMensagem('erro', 'E-mail ou senha incorretos.');
            // Mensagem genérica: não diz se foi o e-mail ou a senha que errou
            return;
        }

        localStorage.setItem(CHAVE_SESSAO, usuario.email);
        // Registra que este usuário está logado

        window.location.href = 'dashboard.html';  // entra no sistema
    });
}