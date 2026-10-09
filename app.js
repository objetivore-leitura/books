// ==========================================
// BIBLIOTECA OBJETIVO LÊ - MÓDULO PRINCIPAL
// ========================================== 

import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, updatePassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import { collection, addDoc, getDocs, query, where, doc, setDoc, getDoc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { auth, db } from "./firebase-config.js";

// ==========================================
// 0. ABRIR A CAPA DO LIVRO (O SELO MÁGICO)
// ==========================================
document.getElementById('btn-abrir-livro').addEventListener('click', function() {
    // 1. Aplica o efeito visual de "quebrar"
    this.classList.add('lacre-quebrado');
    
    // 2. Aguarda 500 milissegundos (o tempo exato da animação) antes de abrir a capa
    setTimeout(() => {
        document.getElementById('capa-container').style.display = 'none';
        document.getElementById('livro-aberto-container').style.display = 'flex';
        
        // Remove a classe para que o selo esteja inteiro se o usuário voltar à tela inicial      
        this.classList.remove('lacre-quebrado'); 
    }, 500);
});



// ==========================================
// 🧙‍♂️ GUARDIÃO DOS PORTÕES (LOGIN DA GESTÃO)
// ==========================================
document.getElementById('btn-login-colegio')?.addEventListener('click', async () => {    
    const email = document.getElementById('colegio-email').value.trim();

    const senha = document.getElementById('colegio-senha').value.trim();

    if (email.toUpperCase() === "JR" && senha === "12") {
        alert("Acesso Mestre Concedido! Bem-vindo, Criador JR.");
        window.usuarioNivelAtual = "adm";
        abrirPainelAcervo("adm"); 
        return;
    }

    if(!email || !senha) {
        alert("Atenção: A magia requer que ambos os campos administrativos sejam preenchidos.");
        return;
    }

    if(!email.includes("@objetivore.edu")) {
        alert("Acesso negado: Apenas membros com o selo @objetivore.edu podem acessar a Gestão.");
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, senha);
        const user = userCredential.user;

        const docRef = doc(db, "usuarios", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const dadosUsuario = docSnap.data();
            
            // 🛑 TRAVA DE SEGURANÇA MÁXIMA: VERIFICA SE ESTÁ BLOQUEADO!
            if (dadosUsuario.bloqueado === true) {
                alert("🚫 Acesso Negado! Esta conta foi bloqueada pela Gestão e as portas estão trancadas para você.");
                await signOut(auth); // Expulsa o usuário na mesma hora!
                return; // Interrompe o login
            }

            let nivel = dadosUsuario.nivel || dadosUsuario.cargo || "aluno";
            if (nivel === "admin") nivel = "adm"; 

            window.usuarioNivelAtual = nivel;
            
            if (nivel === "gestao" || nivel === "adm") {
                alert(`Sucesso! Acesso concedido para (${nivel.toUpperCase()}): ${dadosUsuario.nome || email}`);
                abrirPainelAcervo(nivel); 
            } else {
                alert("Acesso Negado! O seu selo é de Aluno. Por favor, use a página da direita.");
                await signOut(auth); // Expulsa se tentar logar no lugar errado
            }
        } else {
            alert("Erro: O seu perfil não foi encontrado nos arquivos da biblioteca.");
        }
    } catch (error) {
        console.error("Erro no acesso:", error.message);
        alert("Feitiço falhou! Verifique suas credenciais.");
    }
});


// ==========================================
// 2. ACESSO DOS ALUNOS (PÁGINA DIREITA)
// ==========================================
document.getElementById('btn-login-aluno').addEventListener('click', async () => {
    const email = document.getElementById('aluno-email').value.trim();
    const senha = document.getElementById('aluno-senha').value.trim();

    if(!email || !senha) {
        alert("Atenção: Aluno, preencha seu e-mail e palavra-passe.");
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, senha);
        window.usuarioNivelAtual = "aluno";
        alert(`Bem-vindo, Aluno! Acesso liberado para: ${userCredential.user.email}`);
        abrirPainelAcervo("aluno"); 
    } catch (error) {
        console.error("Erro no acesso:", error.message);
        alert("Acesso negado! A senha ou e-mail estão incorretos.");
    }
});

// ==========================================
// FUNÇÃO DE TRANSIÇÃO (O ACERVO REVELADO)
// ==========================================
function abrirPainelAcervo(tipoUsuario) {
    document.getElementById('livro-aberto-container').style.display = 'none';
    document.body.style.alignItems = 'flex-start'; 
    document.body.style.paddingTop = '40px';
    document.getElementById('painel-principal').style.display = 'block';

    const controlesGestao = document.getElementById('controles-gestao');
    if(tipoUsuario === "gestao" || tipoUsuario === "adm") {
        controlesGestao.style.display = 'flex'; 
    } else {
        controlesGestao.style.display = 'none'; 
    }
    carregarAcervo();
}

// ==========================================
// CONTROLE DO PERGAMINHO DE REGISTRO E USUÁRIOS
// ==========================================
document.getElementById('btn-novo-livro').addEventListener('click', () => {
    document.getElementById('modal-livro').style.display = 'flex';
});

document.getElementById('fechar-modal').addEventListener('click', () => {
    document.getElementById('modal-livro').style.display = 'none';
});

document.getElementById('btn-novo-usuario').addEventListener('click', () => {
    document.getElementById('modal-usuario').style.display = 'flex';
});

document.getElementById('fechar-modal-usuario').addEventListener('click', () => {
    document.getElementById('modal-usuario').style.display = 'none';
});

// ==========================================
// REGISTRO E VALIDAÇÃO DE NOVOS LIVROS (BLINDADO)
// ==========================================
document.getElementById('salvar-livro').addEventListener('click', async () => {
    const codigo = document.getElementById('codigo-livro').value.trim();
    const titulo = document.getElementById('titulo-livro').value.trim();
    const autor = document.getElementById('autor-livro').value.trim();
    const categoria = document.getElementById('categoria-livro').value.trim();
    const resumo = document.getElementById('resumo-livro').value.trim();

    const regex4Digitos = /^\d{4}$/;
    if (!regex4Digitos.test(codigo)) {
        alert("Atenção: O código do tomo deve conter exatamente 4 dígitos numéricos (ex: 0001).");
        return;
    }

    if (!titulo || !autor || !categoria) {
        alert("Atenção: Todos os campos do pergaminho (exceto o resumo) devem ser preenchidos.");
        return;
    }

    const btnSalvar = document.getElementById('salvar-livro');
    btnSalvar.innerHTML = "⏳ Catalogando...";
    btnSalvar.disabled = true;

    try {
        const estanteRef = collection(db, "livros");
        const q = query(estanteRef, where("codigo", "==", codigo));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            alert(`O selo de proteção rejeitou! O código ${codigo} já pertence a outra obra no acervo.`);
            btnSalvar.innerHTML = "Salvar Obra"; 
            btnSalvar.disabled = false;
            return;
        }

        await addDoc(estanteRef, {
            codigo: codigo,
            titulo: titulo,
            autor: autor,
            categoria: categoria,
            resumo: resumo || "Nenhum resumo registrado para esta obra milenar.",
            criadoEm: new Date()
        });

        alert("Sucesso! A obra foi catalogada e lacrada no acervo.");
        
        // ==========================================
        // 🔥 GATILHO DO LOG (Regista a ação e o nome do livro)
        // ==========================================
        if (typeof registrarLog === 'function') registrarLog(`Catalogou a obra: "${titulo}" (Cód: ${codigo})`);
        
        document.getElementById('codigo-livro').value = '';
        document.getElementById('titulo-livro').value = '';
        document.getElementById('autor-livro').value = '';
        document.getElementById('categoria-livro').value = '';
        document.getElementById('resumo-livro').value = ''; 
        document.getElementById('modal-livro').style.display = 'none';

        carregarAcervo();
    } catch (error) {
        console.error("Erro ao registrar o tomo:", error);
        alert("O feitiço falhou ao salvar no banco de dados. Erro: " + error.message);
    }
    
    btnSalvar.innerHTML = "Salvar Obra"; 
    btnSalvar.disabled = false; 
});

// ==========================================
// ATUALIZAR O CONTADOR
// ==========================================
async function carregarAcervo() {
    try {
        const querySnapshot = await getDocs(collection(db, "livros"));
        const totalLivros = querySnapshot.size;
        
        const numeroDestacado = `<strong style="color: #8B0000; font-size: 1.4rem; text-shadow: 0 0 3px rgba(255,255,255,0.2);">${totalLivros}</strong>`;
        const contadorTexto = totalLivros === 1 
            ? `O acervo guarda atualmente ${numeroDestacado} obra mágica.` 
            : `" O acervo guarda atualmente ${numeroDestacado} obras fantásticas "`;
            
        document.getElementById('contador-livros').innerHTML = contadorTexto;
    } catch (error) {
        console.error("Erro ao consultar o acervo:", error);
        document.getElementById('contador-livros').innerText = "Ocorreu um distúrbio mágico ao contar as obras.";
    }
}


// ==========================================
// CONTROLE DO CATÁLOGO COMPLETO E FILTRO
// ==========================================
let acervoNaMemoria = []; 
let livrosEmprestadosCodigos = []; 

const capitalizar = (texto) => {
    if (!texto) return "";
    return texto.toLowerCase().replace(/(?:^|\s)\S/g, function(letra) { return letra.toUpperCase(); });
};

// Agora a função aceita o texto e o status!
function renderizarLista(livros, filtroBusca = "", filtroStatus = "todos") {
    const containerLista = document.getElementById('lista-catalogo-container');
    containerLista.innerHTML = ''; 

    const termoBusca = filtroBusca.toLowerCase();
    
    const obrasFiltradas = livros.filter(livro => {
        const titulo = (livro.titulo || "").toLowerCase();
        const autor = (livro.autor || "").toLowerCase();
        const categoria = (livro.categoria || "").toLowerCase();
        const codigoFmt = livro.codigo ? livro.codigo.toUpperCase() : "";
        
        const matchBusca = titulo.includes(termoBusca) || autor.includes(termoBusca) || categoria.includes(termoBusca);
        const estaEmprestado = livrosEmprestadosCodigos.includes(codigoFmt);
        
        let matchStatus = true;
        if (filtroStatus === "livres" && estaEmprestado) matchStatus = false;
        if (filtroStatus === "emprestados" && !estaEmprestado) matchStatus = false;
        
        return matchBusca && matchStatus;
    });

    if (obrasFiltradas.length === 0) {
        containerLista.style.display = "block"; 
        containerLista.innerHTML = '<p style="text-align: center; color: #8B0000; margin-top: 40px; font-size: 1.2rem; font-style: italic;">Nenhuma obra encontrada com estes filtros.</p>';
        return;
    }
    
    containerLista.style.display = "grid";

    obrasFiltradas.forEach((livro) => {
        const tituloCap = capitalizar(livro.titulo);
        const autorCap = capitalizar(livro.autor);
        const categoriaCap = capitalizar(livro.categoria);
        const codigoFmt = livro.codigo ? livro.codigo.toUpperCase() : "";
        
        const estaEmprestado = livrosEmprestadosCodigos.includes(codigoFmt);
        const corStatus = estaEmprestado ? "#8B0000" : "#2E7D32"; 
        const iconeStatus = estaEmprestado ? "🔴" : "🟢";
        const textoStatus = estaEmprestado ? "Emprestado/Reservado" : "Livre nas Prateleiras";
        
        const item = document.createElement('div');
        // Carta mais compacta e ajustada
        item.style.backgroundColor = "white"; 
        item.style.border = `2px solid ${corStatus}`;
        item.style.borderRadius = "8px";
        item.style.padding = "12px 15px"; // Reduzimos o espaço interno
        item.style.boxShadow = "0 3px 5px rgba(0,0,0,0.05)";
        item.style.display = "flex";
        item.style.flexDirection = "column";

item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; border-bottom: 1px dashed rgba(140, 109, 70, 0.3); padding-bottom: 6px;">
                <div style="color: ${corStatus}; font-size: 0.85rem; font-weight: bold; font-style: italic; margin-top: 6px;">
                    ${iconeStatus} ${textoStatus}
                </div>
                
                <!-- O Ícone voltou para o topo com a classe que o faz pulsar! -->
                <button class="icone-copiar-magico" style="background: white; font-size: 1.3rem; cursor: pointer; transition: transform 0.2s; padding: 5px 8px; line-height: 1;" 
                        onclick="navigator.clipboard.writeText('${codigoFmt}').then(() => alert('O código ${codigoFmt} foi copiado magicamente!'))"
                        onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'" title="Copiar Código para Reservar">
                    📋
                </button>
            </div>
            
            <div>
                <strong style="color: #5c4033; font-size: 1.1rem; display: block; margin-bottom: 6px; line-height: 1.2;">${tituloCap}</strong>
                <span style="color: #666; font-size: 0.9rem; display: block; margin-bottom: 2px;"><strong>Autor:</strong> ${autorCap}</span>
                <span style="color: #666; font-size: 0.9rem; display: block; margin-bottom: 2px;"><strong>Gênero:</strong> ${categoriaCap}</span>
            </div>
            
            <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #f0f0f0; text-align: center;">
                <span style="color: #333; font-size: 0.85rem;">CÓDIGO: <strong style="font-family: monospace; font-size: 1.05rem; color: #8B0000; letter-spacing: 1px;">${codigoFmt}</strong></span>
            </div>
        `;

        containerLista.appendChild(item);
    });
}




// Funções de Gatilho
function aplicarFiltros() {
    const texto = document.getElementById('filtro-catalogo').value;
    const status = document.getElementById('filtro-status-catalogo').value;
    renderizarLista(acervoNaMemoria, texto, status);
}

document.getElementById('filtro-catalogo').addEventListener('input', aplicarFiltros);
document.getElementById('filtro-status-catalogo').addEventListener('change', aplicarFiltros);

document.getElementById('btn-abrir-catalogo').addEventListener('click', async () => {
    const modalCatalogo = document.getElementById('modal-catalogo');
    const containerLista = document.getElementById('lista-catalogo-container');
    const inputFiltro = document.getElementById('filtro-catalogo');
    const selectStatus = document.getElementById('filtro-status-catalogo');
    
    modalCatalogo.style.display = 'flex';
    inputFiltro.value = '';
    selectStatus.value = 'todos'; 
    
    containerLista.style.display = "block";
    containerLista.innerHTML = '<p style="text-align: center; font-style: italic; color: #8c6d46; margin-top: 40px;">⏳ Consultando os arquivos mágicos e verificando prateleiras...</p>';

    try {
        livrosEmprestadosCodigos = [];
        const qEmprestimos = query(collection(db, "emprestimos"), where("devolvido", "==", false));
        const snapEmprestimos = await getDocs(qEmprestimos);
        
        snapEmprestimos.forEach(doc => {
            const empData = doc.data();
            // 🌟 MAGIA AQUI: Se a Gestão "rejeitou", o livro JÁ FICA LIVRE para os outros alunos, 
            // mesmo que o aluno original ainda não tenha aberto a carta da Coruja!
            if (empData.codigoLivro && empData.status !== "rejeitado") {
                livrosEmprestadosCodigos.push(empData.codigoLivro.toUpperCase());
            }
        });

        const querySnapshot = await getDocs(collection(db, "livros"));
        acervoNaMemoria = [];
        querySnapshot.forEach((doc) => { acervoNaMemoria.push(doc.data()); });

        if (acervoNaMemoria.length === 0) {
            containerLista.innerHTML = '<p style="text-align: center; color: #8B0000; margin-top: 40px;">O acervo está vazio no momento.</p>';
            return;
        }
        
        renderizarLista(acervoNaMemoria, "", "todos");
    } catch (error) {
        console.error(error);
        containerLista.innerHTML = '<p style="text-align: center; color: red; margin-top: 40px;">❌ Erro ao acessar os arquivos mágicos.</p>';
    }
});


document.getElementById('fechar-modal-catalogo').addEventListener('click', () => {
    document.getElementById('modal-catalogo').style.display = 'none';
});


// ==========================================
// REGISTRO DE NOVOS MEMBROS
// ==========================================
document.getElementById('salvar-usuario').addEventListener('click', async () => {
    const nome = document.getElementById('nome-usuario').value.trim();
    const email = document.getElementById('email-usuario').value.trim();
    const senha = document.getElementById('senha-usuario').value.trim();
    const nivel = document.getElementById('nivel-usuario').value;

    if (!nome || !email || !senha) { alert("Atenção: Preencha todos os campos."); return; }
    if (!email.includes("@objetivore.edu")) { alert("Selo Incorreto: Use o e-mail @objetivore.edu."); return; }
    if (senha.length < 6) { alert("Proteção Fraca: A senha precisa ter no mínimo 6 caracteres."); return; }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
        await setDoc(doc(db, "usuarios", userCredential.user.uid), {
            nome: nome, email: email, nivel: nivel, criadoEm: new Date()
        });
        alert(`Sucesso! O membro ${nome} foi admitido oficialmente na biblioteca.`);
        
        // ==========================================
        // 🔥 GATILHO DO LOG (Regista a admissão)
        // ==========================================
        if (typeof registrarLog === 'function') registrarLog(`Admitiu o novo membro: "${nome}" (${nivel})`);
        
        document.getElementById('nome-usuario').value = '';
        document.getElementById('email-usuario').value = '';
        document.getElementById('senha-usuario').value = '';
        document.getElementById('nivel-usuario').value = 'aluno';
        document.getElementById('modal-usuario').style.display = 'none';
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            alert("Atenção: Este e-mail já possui um registro.");
        } else {
            alert("O feitiço falhou. Verifique sua conexão.");
        }
    }
});



// ==========================================
// PESQUISAR OBRA (INVOCAR TOMO)
// ==========================================
document.getElementById('btn-invocar-tomo').addEventListener('click', async () => {
    const inputCodigo = document.getElementById('input-busca-codigo').value.trim();
    if (!inputCodigo) { alert("Digite o código mágico da obra primeiro!"); return; }

    const btnOriginal = document.getElementById('btn-invocar-tomo').innerHTML;
    document.getElementById('btn-invocar-tomo').innerHTML = "⏳ Buscando...";

    try {
        const estanteRef = collection(db, "livros");
        const q = query(estanteRef, where("codigo", "==", inputCodigo));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            const qMaiusculo = query(estanteRef, where("codigo", "==", inputCodigo.toUpperCase()));
            const querySnapshotMaiusculo = await getDocs(qMaiusculo);
            
            if (querySnapshotMaiusculo.empty) {
                alert("Obra não encontrada! Verifique o código.");
            } else {
                mostrarTomoEncontrado(querySnapshotMaiusculo);
            }
        } else {
            mostrarTomoEncontrado(querySnapshot);
        }
    } catch (error) {
        alert("Ocorreu um distúrbio mágico na busca.");
    }
    document.getElementById('btn-invocar-tomo').innerHTML = btnOriginal;
});

function mostrarTomoEncontrado(querySnapshot) {
    let livroEncontrado = null;
    querySnapshot.forEach((doc) => { livroEncontrado = doc.data(); });

    const formatarNormaCulta = (texto) => {
        if (!texto) return "Nenhum resumo registrado para esta obra milenar.";
        let formatado = texto.toLowerCase();
        formatado = formatado.charAt(0).toUpperCase() + formatado.slice(1);
        return formatado.replace(/([.!?]\s+)([a-zà-ú])/g, (match, sep, letra) => sep + letra.toUpperCase());
    };

    document.getElementById('capa-titulo').innerText = capitalizar(livroEncontrado.titulo);
    document.getElementById('resultado-titulo').innerText = capitalizar(livroEncontrado.titulo);
    document.getElementById('resultado-autor').innerText = capitalizar(livroEncontrado.autor);
    document.getElementById('resultado-categoria').innerText = capitalizar(livroEncontrado.categoria);
    document.getElementById('resultado-codigo').innerHTML = `Código da Obra:<br><strong style="color: #8B0000; font-size: 1.4rem; display: block; margin-top: 3px;">${livroEncontrado.codigo.toUpperCase()}</strong>`;
    document.getElementById('resultado-resumo').innerText = formatarNormaCulta(livroEncontrado.resumo);

    const capaDiv = document.getElementById('capa-livro');
    const livroAbertoDiv = document.getElementById('livro-aberto');
    
    capaDiv.style.display = 'flex';
    livroAbertoDiv.style.display = 'none';
    capaDiv.onclick = () => { capaDiv.style.display = 'none'; livroAbertoDiv.style.display = 'block'; };

    document.getElementById('input-busca-codigo').value = '';
    document.getElementById('modal-tomo-encontrado').style.display = 'flex';
}

document.getElementById('fechar-modal-tomo').addEventListener('click', () => {
    document.getElementById('modal-tomo-encontrado').style.display = 'none';
});

// ==========================================
// MASMORRA DA GESTÃO
// ==========================================
const btnAbrirGestao = document.getElementById('btn-abrir-gestao');
if (btnAbrirGestao) {
    btnAbrirGestao.addEventListener('click', () => {
        document.getElementById('modal-gestao').style.display = 'flex';
        carregarTabelaGestao();
    });
}

document.getElementById('fechar-modal-gestao').addEventListener('click', () => {
    document.getElementById('modal-gestao').style.display = 'none';
});

async function carregarTabelaGestao() {
    const container = document.getElementById('lista-gestao-container');
    container.innerHTML = "<p style='text-align: center; color: #5c4033; padding: 20px;'>⏳ Invocando registros do acervo...</p>";

    try {
        const querySnapshot = await getDocs(collection(db, "livros"));
        if (querySnapshot.empty) {
            container.innerHTML = "<p style='text-align: center; color: #5c4033; padding: 20px;'>A masmorra está vazia. Nenhum tomo catalogado.</p>";
            return;
        }

        let htmlTabela = `<table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.95rem;">
                <thead>
                    <tr style="border-bottom: 2px solid #8c6d46; color: #8B0000;">
                        <th style="padding: 8px;">Código</th>
                        <th style="padding: 8px;">Título</th>
                        <th style="padding: 8px;">Autor</th>
                        <th style="padding: 8px; text-align: center;">Ações</th>
                    </tr>
                </thead><tbody>`;

        querySnapshot.forEach((docSnap) => {
            const livro = docSnap.data();
            
            // 🌟 APLICANDO O FEITIÇO DE TÍTULO E AUTOR CAPITALIZADOS (Title Case)
            const tituloFmt = typeof capitalizar === 'function' ? capitalizar(livro.titulo) : (livro.titulo || '');
            const autorFmt = typeof capitalizar === 'function' ? capitalizar(livro.autor) : (livro.autor || '');

            htmlTabela += `<tr style="border-bottom: 1px dashed rgba(140,109,70,0.3); color: #333;">
                <td style="padding: 8px; font-weight: bold; color: #8B0000;">${livro.codigo ? livro.codigo.toUpperCase() : '----'}</td>
                <td style="padding: 8px;">${tituloFmt}</td>
                <td style="padding: 8px; font-style: italic;">${autorFmt}</td>
                <td style="padding: 8px; text-align: center; white-space: nowrap;">
                    <button onclick="abrirEdicaoTomo('${docSnap.id}')" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; margin-right: 8px;" title="Editar">✏️</button>
                    <button onclick="excluirTomo('${docSnap.id}', '${livro.titulo}')" style="background: none; border: none; font-size: 1.2rem; cursor: pointer;" title="Excluir">🗑️</button>
                </td></tr>`;
        });
        htmlTabela += `</tbody></table>`;
        container.innerHTML = htmlTabela;
    } catch (error) {
        container.innerHTML = "<p style='text-align: center; color: #8B0000; padding: 20px;'>Falha ao invocar os registros.</p>";
    }
}



window.abrirEdicaoTomo = async function(idDoc) {
    try {
        const docRef = doc(db, "livros", idDoc);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const livro = docSnap.data();
            document.getElementById('edit-id-doc').value = idDoc;
            document.getElementById('edit-titulo').value = livro.titulo || '';
            document.getElementById('edit-autor').value = livro.autor || '';
            document.getElementById('edit-categoria').value = livro.categoria || '';
            document.getElementById('edit-codigo').value = livro.codigo || '';
            document.getElementById('edit-resumo').value = livro.resumo || '';
            document.getElementById('modal-editar').style.display = 'flex';
        }
    } catch (error) { alert("Falha ao invocar os dados do tomo."); }
};

document.getElementById('fechar-modal-editar').addEventListener('click', () => {
    document.getElementById('modal-editar').style.display = 'none';
});

document.getElementById('salvar-edicao').addEventListener('click', async () => {
    const idDoc = document.getElementById('edit-id-doc').value;
    try {
        await updateDoc(doc(db, "livros", idDoc), {
            titulo: document.getElementById('edit-titulo').value.trim(),
            autor: document.getElementById('edit-autor').value.trim(),
            categoria: document.getElementById('edit-categoria').value.trim(),
            codigo: document.getElementById('edit-codigo').value.trim(),
            resumo: document.getElementById('edit-resumo').value.trim()
        });
        alert("O tomo foi reinscrevido com sucesso!");
        document.getElementById('modal-editar').style.display = 'none';
        carregarTabelaGestao(); 
        carregarAcervo();       
    } catch (error) { alert("O feitiço de atualização falhou."); }
});

// ==========================================
// 🏆 LÓGICA DO TORNEIO DA CHAVE (APARIÇÃO E CAPTURA)
// ==========================================
const chaveTorneio = document.getElementById('chave-torneio');
let torneioAtivo = false;
let chaveCapturada = false; // 🛡️ Trava mágica

// Função para verificar o relógio e revelar a chave
async function verificarRelogioTorneio() {
    if (window.usuarioNivelAtual !== "aluno" || chaveCapturada === true) {
        if (chaveTorneio) chaveTorneio.style.display = 'none';
        return;
    }

    try {
        const docRef = doc(db, "configuracoes", "torneioChave");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const config = docSnap.data();
            const agora = new Date();
            
            const dataHoraInicio = new Date(`${config.dataInicio}T${config.horaInicio}:00`);
            const dataHoraFim = new Date(`${config.dataFim}T${config.horaFim}:00`);

            if (agora >= dataHoraInicio && agora <= dataHoraFim) {
                if (!torneioAtivo) {
                    chaveTorneio.style.display = 'block';
                    torneioAtivo = true;
                }
            } else {
                if (torneioAtivo) {
                    chaveTorneio.style.display = 'none';
                    torneioAtivo = false;
                }
            }
        }
    } catch (error) {
        console.error("Erro ao verificar o relógio do torneio:", error);
    }
}

// Checa o tempo a cada 10 segundos
setInterval(verificarRelogioTorneio, 10000);

// Ação de CAPTURAR A CHAVE (Quando o aluno clica)
if (chaveTorneio) {
    chaveTorneio.addEventListener('click', async () => {
        // Esconde a chave e trava imediatamente
        chaveTorneio.style.display = 'none';
        torneioAtivo = false;
        chaveCapturada = true; 

        try {
            // Registra no banco de dados com milissegundos
            await addDoc(collection(db, "torneioVencedores"), {
                emailVencedor: auth.currentUser.email,
                capturadoEm: new Date(),
                timestampExato: Date.now() 
            });

            // 🌟 A MÁGICA VISUAL ACONTECE AQUI! Abre o painel épico!
            const modalVitoria = document.getElementById('modal-vitoria-aluno');
            
            if (modalVitoria) {
                modalVitoria.style.display = 'flex'; // Abre a tela épica
            } else {
                // Se o HTML não for encontrado, ele dá este aviso!
                alert("SUCESSO! O clique foi salvo, mas o navegador não achou a Tela Épica no seu index.html. Verifique se salvou o arquivo!");
            }

        } catch (error) {
            console.error("Erro ao registrar a vitória:", error);
            alert("Houve um distúrbio mágico, mas vimos que você encontrou a chave!");
        }
    });
}


// Fechar a tela de vitória
const btnFecharVitoria = document.getElementById('btn-fechar-vitoria');
if (btnFecharVitoria) {
    btnFecharVitoria.addEventListener('click', () => {
        document.getElementById('modal-vitoria-aluno').style.display = 'none';
    });
}


// ==========================================
// CONFIGURAÇÕES E SUB-ABAS
// ==========================================
const modalConfig = document.getElementById('modal-configuracoes');
const btnAbrirConfig = document.getElementById('btn-config-geral');
const btnFecharConfig = document.getElementById('fechar-modal-config');

if (btnAbrirConfig) btnAbrirConfig.addEventListener('click', () => { modalConfig.style.display = 'flex'; });
if (btnFecharConfig) btnFecharConfig.addEventListener('click', () => { modalConfig.style.display = 'none'; });

const btnSubGeral = document.getElementById('btn-sub-geral');
const btnSubTorneio = document.getElementById('btn-sub-torneio');
const abaGeral = document.getElementById('aba-geral');
const abaTorneio = document.getElementById('aba-torneio');

if (btnSubGeral && btnSubTorneio) {
    btnSubGeral.addEventListener('click', () => {
        abaGeral.style.display = 'block'; abaTorneio.style.display = 'none';
        btnSubGeral.style.backgroundColor = '#8c6d46'; btnSubGeral.style.color = 'white';
        btnSubTorneio.style.backgroundColor = 'transparent'; btnSubTorneio.style.color = '#8c6d46';
    });
    btnSubTorneio.addEventListener('click', () => {
        abaGeral.style.display = 'none'; abaTorneio.style.display = 'block';
        btnSubTorneio.style.backgroundColor = '#8c6d46'; btnSubTorneio.style.color = 'white';
        btnSubGeral.style.backgroundColor = 'transparent'; btnSubGeral.style.color = '#8c6d46';
    });
}

// ==========================================
// SALVAR AGENDAMENTO DO TORNEIO (FIREBASE)
// ==========================================
const btnSalvarTorneio = document.getElementById('btn-salvar-torneio');
if (btnSalvarTorneio) {
    btnSalvarTorneio.addEventListener('click', async () => {
        const dataInicio = document.getElementById('torneio-data-inicio').value;
        const dataFim = document.getElementById('torneio-data-fim').value;
        const horaInicio = document.getElementById('torneio-hora-inicio').value;
        const horaFim = document.getElementById('torneio-hora-fim').value;

        if (!dataInicio || !dataFim || !horaInicio || !horaFim) {
            alert("Preencha todas as datas e horários para invocar a Chave.");
            return;
        }

        try {
            await setDoc(doc(db, "configuracoes", "torneioChave"), {
                dataInicio: dataInicio,
                dataFim: dataFim,
                horaInicio: horaInicio,
                horaFim: horaFim,
                registradoPor: window.usuarioNivelAtual
            });
            alert("✨ Feitiço realizado! A Chave Mágica foi agendada com sucesso.");
        } catch (error) {
            alert("A magia falhou! Verifique a conexão com a biblioteca.");
        }
    });
}


// ==========================================
// 🏆 PAINEL DE RESULTADOS GERAIS (COM ABAS E CERTIFICADOS)
// ==========================================
const btnResultadoGeral = document.getElementById('btn-resultado-geral');
const modalResultado = document.getElementById('modal-resultado');
const btnFecharResultado = document.getElementById('fechar-modal-resultado');

// Elementos do Menu de Abas
const btnTabChave = document.getElementById('btn-tab-chave');
const btnTabRedacao = document.getElementById('btn-tab-redacao');
const btnTabLeitores = document.getElementById('btn-tab-leitores');

// Telas de Conteúdo das Abas
const abaResultadoChave = document.getElementById('aba-resultado-chave');
const abaResultadoRedacao = document.getElementById('aba-resultado-redacao');
const abaResultadoLeitores = document.getElementById('aba-resultado-leitores');

// Feitiço para alternar as abas
function alternarAbaResultado(abaAtiva, btnAtivo) {
    // 1. Esconde todas as abas
    if(abaResultadoChave) abaResultadoChave.style.display = 'none';
    if(abaResultadoRedacao) abaResultadoRedacao.style.display = 'none';
    if(abaResultadoLeitores) abaResultadoLeitores.style.display = 'none';
    
    // 2. Tira a cor "ativa" de todos os botões
    [btnTabChave, btnTabRedacao, btnTabLeitores].forEach(btn => {
        if(btn) {
            btn.style.backgroundColor = 'transparent';
            btn.style.color = '#8c6d46';
        }
    });

    // 3. Mostra só a aba clicada e pinta o botão dela
    if (abaAtiva) abaAtiva.style.display = 'block';
    if (btnAtivo) {
        btnAtivo.style.backgroundColor = '#8c6d46';
        btnAtivo.style.color = 'white';
    }
}

// Eventos de clique nas abas
if (btnTabChave) btnTabChave.addEventListener('click', () => alternarAbaResultado(abaResultadoChave, btnTabChave));
if (btnTabRedacao) btnTabRedacao.addEventListener('click', () => alternarAbaResultado(abaResultadoRedacao, btnTabRedacao));
if (btnTabLeitores) btnTabLeitores.addEventListener('click', () => alternarAbaResultado(abaResultadoLeitores, btnTabLeitores));

// Quando clica no botão "Resultado Geral" no painel principal
if (btnResultadoGeral) {
    btnResultadoGeral.addEventListener('click', async () => {
        modalResultado.style.display = 'flex';
        
        // Garante que, ao abrir, a aba "Torneio da Chave" seja a primeira a aparecer
        alternarAbaResultado(abaResultadoChave, btnTabChave);
        
        const containerResultados = document.getElementById('lista-resultados-container');
        containerResultados.innerHTML = "<p style='text-align: center; color: #5c4033;'>⏳ Lendo os pergaminhos do tempo...</p>";

        try {
            // Busca o ranking do Torneio da Chave no Firebase
            const querySnapshot = await getDocs(collection(db, "torneioVencedores"));
            
            if (querySnapshot.empty) {
                containerResultados.innerHTML = "<p style='text-align: center; color: #5c4033;'>Nenhum aprendiz capturou a chave ainda.</p>";
                return;
            }

            let vencedores = [];
            querySnapshot.forEach((docSnap) => {
                vencedores.push(docSnap.data());
            });

            // Organiza quem clicou primeiro
            vencedores.sort((a, b) => a.timestampExato - b.timestampExato);

            let html = `<table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.95rem;">
                            <thead>
                                <tr style="border-bottom: 2px solid #8c6d46; color: #8B0000;">
                                    <th style="padding: 8px; text-align: center;">Posição</th>
                                    <th style="padding: 8px;">Aprendiz (E-mail)</th>
                                    <th style="padding: 8px;">Horário Exato</th>
                                    <th style="padding: 8px; text-align: center;">Honraria</th>
                                </tr>
                            </thead>
                            <tbody>`;
            
            vencedores.forEach((vencedor, index) => {
                const dataFormatada = vencedor.capturadoEm.toDate().toLocaleString('pt-BR');
                const medalha = index === 0 ? '🥇' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : `${index + 1}º`));
                
                // Botão de Certificado APENAS para os 3 primeiros!
                let botaoCertificado = "";
                if (index <= 2) {
                    botaoCertificado = `<button onclick="emitirPergaminhoVitoria('${vencedor.emailVencedor}', ${index}, '${dataFormatada}')" style="background-color: #8c6d46; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.5);">📜 Emitir</button>`;
                } else {
                    botaoCertificado = `<span style="color: #666; font-style: italic;">Apenas Top 3</span>`;
                }

                html += `<tr style="border-bottom: 1px dashed rgba(140,109,70,0.3); color: #333;">
                            <td style="padding: 8px; font-weight: bold; font-size: 1.2rem; text-align: center;">${medalha}</td>
                            <td style="padding: 8px;">${vencedor.emailVencedor}</td>
                            <td style="padding: 8px;">${dataFormatada}</td>
                            <td style="padding: 8px; text-align: center;">${botaoCertificado}</td>
                         </tr>`;
            });

            html += `</tbody></table>`;
            containerResultados.innerHTML = html;

        } catch (error) {
            console.error("Erro ao carregar resultados:", error);
            containerResultados.innerHTML = "<p style='text-align: center; color: #8B0000;'>Falha ao invocar os resultados do banco de dados.</p>";
        }
    });
}

if (btnFecharResultado) {
    btnFecharResultado.addEventListener('click', () => {
        modalResultado.style.display = 'none';
    });
}

// ==========================================
// 📜 FEITIÇO: EMISSÃO DO PERGAMINHO DE VITÓRIA (CERTIFICADO)
// ==========================================
window.emitirPergaminhoVitoria = function(emailAluno, posicao, dataCaptura) {
    // Define o título mágico baseado na posição
    let tituloMagico = "";
    let corDestaque = "";
    if (posicao === 0) { tituloMagico = "Grão-Mestre da Chave Dourada 🥇"; corDestaque = "#b8860b"; } // Ouro
    else if (posicao === 1) { tituloMagico = "Guardião dos Segredos 🥈"; corDestaque = "#71797E"; } // Prata
    else if (posicao === 2) { tituloMagico = "Rastreador de Pergaminhos 🥉"; corDestaque = "#cd7f32"; } // Bronze

    // Pega a primeira parte do e-mail para usar como nome (ex: joao.silva)
    const nomeAluno = emailAluno.split('@')[0].toUpperCase(); 

    // Cria uma janela invisível para preparar a impressão
    const janelaImpressao = window.open('', '', 'width=900,height=700');
    
    // Desenha o HTML do Certificado Medieval
    janelaImpressao.document.write(`
        <html>
        <head>
            <title>Pergaminho de Honra - ${nomeAluno}</title>
            <style>
                body { font-family: 'Georgia', serif; text-align: center; padding: 40px; background-color: #fdf5e6; color: #333; }
                .moldura { border: 15px solid transparent; border-image: repeating-linear-gradient(45deg, #8c6d46, #8c6d46 10px, #5c4033 10px, #5c4033 20px) 15; padding: 40px; background: #fffaf0; outline: 3px solid #8c6d46; outline-offset: -10px; }
                h1 { color: #8B0000; font-size: 3rem; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 3px; }
                h2 { color: ${corDestaque}; font-size: 2.2rem; margin-top: 0; }
                p { font-size: 1.4rem; line-height: 1.8; }
                .assinatura { margin-top: 80px; display: flex; justify-content: space-around; }
                .linha-assinatura { border-top: 2px solid #333; width: 300px; padding-top: 10px; font-weight: bold; font-size: 1.2rem; }
            </style>
        </head>
        <body>
            <div class="moldura">
                <h1>Biblioteca Objetivo Lê</h1>
                <p style="font-style: italic; font-size: 1.2rem;">Certificado Oficial de Honraria</p>
                <br>
                <p>O Conselho dos Mestres e a Direção do Acervo certificam que o aprendiz</p>
                <h2 style="color: #333; font-size: 2.5rem; text-decoration: underline;">${nomeAluno}</h2>
                <p>demonstrou agilidade, reflexo e atenção excepcionais durante o Torneio da Chave,<br>
                realizado em <strong>${dataCaptura}</strong>, conquistando o título definitivo de:</p>
                <h2>${tituloMagico}</h2>
                <p>Que esta conquista fique registrada para sempre nos anais de nossa história.</p>
                
                <div class="assinatura">
                    <div class="linha-assinatura">Mestre do Acervo (JR)</div>
                    <div class="linha-assinatura">Direção do Colégio</div>
                </div>
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                }
            </script>
        </body>
        </html>
    `);
    janelaImpressao.document.close();
};


// ==========================================
// 📜 FEITIÇO: EMISSÃO DO PERGAMINHO DE VITÓRIA (CERTIFICADO A4)
// ==========================================
window.emitirPergaminhoVitoria = function(emailAluno, posicao, dataCaptura) {
    // Define o título mágico baseado na posição
    let tituloMagico = "";
    let corDestaque = "";
    if (posicao === 0) { tituloMagico = "Grão-Mestre da Chave Dourada 🥇"; corDestaque = "#b8860b"; } // Ouro
    else if (posicao === 1) { tituloMagico = "Guardião dos Segredos 🥈"; corDestaque = "#71797E"; } // Prata
    else if (posicao === 2) { tituloMagico = "Rastreador de Pergaminhos 🥉"; corDestaque = "#cd7f32"; } // Bronze

    // Pega a primeira parte do e-mail para usar como nome (ex: joao.silva)
    const nomeAluno = emailAluno.split('@')[0].toUpperCase(); 

    // Cria uma janela invisível para preparar a impressão
    const janelaImpressao = window.open('', '', 'width=900,height=700');
    
    // Desenha o HTML do Certificado projetado para A4 Paisagem
    janelaImpressao.document.write(`
        <html>
        <head>
            <title>Pergaminho de Honra - ${nomeAluno}</title>
            <style>
                /* Força a impressora a usar papel A4 na horizontal (Paisagem) e zera margens brancas padrão */
                @page { size: A4 landscape; margin: 0; }
                
                body { 
                    font-family: 'Georgia', serif; 
                    text-align: center; 
                    background-color: #fdf5e6; 
                    color: #333; 
                    margin: 0; 
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh; /* Ocupa a tela/papel todo */
                    /* Força a impressora a imprimir as cores de fundo e bordas */
                    -webkit-print-color-adjust: exact !important; 
                    print-color-adjust: exact !important;
                }
                
                /* Medidas exatas para caber dentro da folha A4 com segurança */
                .moldura { 
                    width: 270mm; 
                    height: 180mm; 
                    border: 15px solid transparent; 
                    border-image: repeating-linear-gradient(45deg, #8c6d46, #8c6d46 10px, #5c4033 10px, #5c4033 20px) 15; 
                    padding: 30px; 
                    background: #fffaf0; 
                    outline: 3px solid #8c6d46; 
                    outline-offset: -10px; 
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                
                h1 { color: #8B0000; font-size: 3rem; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 3px; }
                h2 { color: ${corDestaque}; font-size: 2.2rem; margin-top: 5px; }
                p { font-size: 1.4rem; line-height: 1.6; margin: 10px 0; }
            </style>
        </head>
        <body>
            <div class="moldura">
                <h1>Biblioteca Objetivo Lê</h1>
                <p style="font-style: italic; font-size: 1.3rem;">Certificado Oficial de Honraria</p>
                <br>
                <p>O Conselho dos Mestres e a Direção do Acervo certificam que o aprendiz</p>
                <h2 style="color: #333; font-size: 2.8rem; text-decoration: underline; margin: 25px 0;">${nomeAluno}</h2>
                <p>demonstrou agilidade, reflexo e atenção excepcionais durante o Torneio da Chave,<br>
                realizado em <strong>${dataCaptura}</strong>, conquistando o título definitivo de:</p>
                <h2 style="margin-top: 25px;">${tituloMagico}</h2>
                <p style="margin-top: 20px;">Que esta conquista fique registrada para sempre nos anais de nossa história.</p>
            </div>
            
            <script>
                // Assim que desenhar, abre a tela de impressão e depois fecha a janela
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                }
            </script>
        </body>
        </html>
    `);
    janelaImpressao.document.close();
};


// ==========================================
// ⚙️ SISTEMA DE ABAS DA CONFIGURAÇÃO GERAL
// ==========================================
const btnTabConfigTorneio = document.getElementById('btn-tab-config-torneio');
const btnTabConfigLogin = document.getElementById('btn-tab-config-login');
const btnTabConfigSistema = document.getElementById('btn-tab-config-sistema');
const btnTabConfigGeral = document.getElementById('btn-tab-config-geral'); // O 4º botão

const abaConfigTorneio = document.getElementById('aba-config-torneio');
const abaConfigLogin = document.getElementById('aba-config-login');
const abaConfigSistema = document.getElementById('aba-config-sistema');
const abaConfigGeral = document.getElementById('aba-config-geral-conteudo'); // O 4º conteúdo

function alternarAbaConfig(abaAtiva, btnAtivo) {
    // Esconde todas as telas
    if(abaConfigTorneio) abaConfigTorneio.style.display = 'none';
    if(abaConfigLogin) abaConfigLogin.style.display = 'none';
    if(abaConfigSistema) abaConfigSistema.style.display = 'none';
    if(abaConfigGeral) abaConfigGeral.style.display = 'none';
    
    // Tira a cor de todos os botões (deixa transparente com letra marrom)
    [btnTabConfigTorneio, btnTabConfigLogin, btnTabConfigSistema, btnTabConfigGeral].forEach(btn => {
        if(btn) {
            btn.style.backgroundColor = 'transparent';
            btn.style.color = '#8c6d46';
        }
    });

    // Mostra a tela certa e pinta o botão ativado
    if (abaAtiva) abaAtiva.style.display = 'block';
    if (btnAtivo) {
        btnAtivo.style.backgroundColor = '#8c6d46';
        btnAtivo.style.color = 'white';
    }
}

// Escuta os cliques nas abas
if (btnTabConfigTorneio) btnTabConfigTorneio.addEventListener('click', () => alternarAbaConfig(abaConfigTorneio, btnTabConfigTorneio));
if (btnTabConfigLogin) btnTabConfigLogin.addEventListener('click', () => alternarAbaConfig(abaConfigLogin, btnTabConfigLogin));
if (btnTabConfigSistema) btnTabConfigSistema.addEventListener('click', () => alternarAbaConfig(abaConfigSistema, btnTabConfigSistema));
if (btnTabConfigGeral) btnTabConfigGeral.addEventListener('click', () => alternarAbaConfig(abaConfigGeral, btnTabConfigGeral));

// Garante que, ao abrir a janela inteira, a aba do Torneio abra primeiro
const btnAbrirConfigGeralMenu = document.getElementById('btn-config-geral');
if (btnAbrirConfigGeralMenu) {
    btnAbrirConfigGeralMenu.addEventListener('click', () => {
        alternarAbaConfig(abaConfigTorneio, btnTabConfigTorneio);
    });
}


// ==========================================
// 🔍 FEITIÇO DE BUSCA DINÂMICA DE USUÁRIOS
// ==========================================
const inputBuscaUsuario = document.getElementById('input-busca-usuario');
const listaBuscaUsuarios = document.getElementById('lista-busca-usuarios');
const alvoSelecionadoContainer = document.getElementById('alvo-selecionado-container');
const textoAlvoSelecionado = document.getElementById('texto-alvo-selecionado');

// Variáveis globais para a mágica
window.emailAlvoParaAcao = ""; 
let cacheUsuarios = []; 

// Quando o botão da aba "Gestão de Acessos" é clicado, carregamos os usuários escondido
const btnTabConfigLoginBusca = document.getElementById('btn-tab-config-login');
if (btnTabConfigLoginBusca) {
    btnTabConfigLoginBusca.addEventListener('click', async () => {
        // Limpa tudo ao abrir a aba
        if(inputBuscaUsuario) inputBuscaUsuario.value = "";
        if(listaBuscaUsuarios) listaBuscaUsuarios.style.display = 'none';
        if(alvoSelecionadoContainer) alvoSelecionadoContainer.style.display = 'none';
        window.emailAlvoParaAcao = "";
        
        try {
            // Puxa do Firebase todos que estão na coleção "usuarios"
            const querySnapshot = await getDocs(collection(db, "usuarios"));
            cacheUsuarios = [];
            querySnapshot.forEach((docSnap) => {
                cacheUsuarios.push(docSnap.data());
            });
        } catch (error) {
            console.error("Erro ao puxar grimório de usuários:", error);
        }
    });
}

// A mágica de filtrar ENQUANTO o Gestor digita
if (inputBuscaUsuario) {
    inputBuscaUsuario.addEventListener('input', (e) => {
        const termoDigitado = e.target.value.toLowerCase();
        listaBuscaUsuarios.innerHTML = ''; // Limpa a lista anterior
        
        if (termoDigitado.length < 1) {
            listaBuscaUsuarios.style.display = 'none';
            return;
        }

        // Procura se o texto digitado bate com o email do usuário
        const filtrados = cacheUsuarios.filter(user => {
            const emailUser = user.email ? user.email.toLowerCase() : "";
            return emailUser.includes(termoDigitado);
        });

        if (filtrados.length > 0) {
            listaBuscaUsuarios.style.display = 'block'; // Mostra a caixinha suspensa
            
            filtrados.forEach(user => {
                const item = document.createElement('div');
                item.style.padding = '12px';
                item.style.borderBottom = '1px solid rgba(140, 109, 70, 0.3)';
                item.style.cursor = 'pointer';
                item.style.color = '#333';
                item.style.textAlign = 'left';
                item.style.fontWeight = 'bold';
                item.style.fontSize = '0.9rem';
                
                // Efeito Hover (muda de cor ao passar o mouse)
                item.onmouseover = () => { item.style.backgroundColor = '#8c6d46'; item.style.color = 'white'; };
                item.onmouseout = () => { item.style.backgroundColor = 'transparent'; item.style.color = '#333'; };
                
                item.innerHTML = `👤 ${user.email} <span style="font-weight: normal; font-size: 0.8rem;">(Nível: ${user.nivel})</span>`;
                
                // Quando o Gestor clica no nome da lista
                item.addEventListener('click', () => {
                    window.emailAlvoParaAcao = user.email; // Trava o alvo na variável global!
                    inputBuscaUsuario.value = ""; // Limpa a barra de pesquisa
                    listaBuscaUsuarios.style.display = 'none'; // Esconde a lista
                    
                    // Mostra a mira vermelha com o e-mail escolhido
                    textoAlvoSelecionado.innerText = user.email;
                    alvoSelecionadoContainer.style.display = 'inline-block';
                });
                
                listaBuscaUsuarios.appendChild(item);
            });
        } else {
            listaBuscaUsuarios.style.display = 'block';
            listaBuscaUsuarios.innerHTML = '<div style="padding: 12px; color: #8B0000; font-style: italic;">Nenhum aprendiz encontrado.</div>';
        }
    });
}


// ==========================================
// ⚙️ CONFIGURAÇÕES DO ALUNO (BOTÃO E JANELA)
// ==========================================
const btnConfigAluno = document.getElementById('btn-config-aluno');
const modalConfigAluno = document.getElementById('modal-config-aluno');
const btnFecharConfigAluno = document.getElementById('fechar-config-aluno');

// 1. Abre a janela Púrpura
if (btnConfigAluno) {
    btnConfigAluno.addEventListener('click', () => {
        modalConfigAluno.style.display = 'flex';
    });
}

// 2. Fecha a janela
if (btnFecharConfigAluno) {
    btnFecharConfigAluno.addEventListener('click', () => {
        modalConfigAluno.style.display = 'none';
    });
}

// 3. Verifica automaticamente quem está logado (Feitiço Indestrutível Atualizado)
setInterval(() => {
    // Agora o feitiço mira na linha inteira que guarda os 3 botões
    const menuAlunoTop = document.getElementById('menu-aluno-top'); 
    if (menuAlunoTop) {
        if (window.usuarioNivelAtual === "aluno") {
            menuAlunoTop.style.display = 'flex'; // Mostra a linha inteira para o aluno
        } else {
            menuAlunoTop.style.display = 'none'; // Esconde de todos os outros
        }
    }
}, 1000);


// ==========================================
// 🔐 LÓGICA: FORJAR NOVA SENHA DO ALUNO
// ==========================================
const btnSalvarNovaSenhaAluno = document.getElementById('btn-salvar-nova-senha-aluno');
const inputSenhaAtual = document.getElementById('input-senha-atual');
const inputNovaSenha = document.getElementById('input-nova-senha');

if (btnSalvarNovaSenhaAluno) {
    btnSalvarNovaSenhaAluno.addEventListener('click', async () => {
        const senhaAtual = inputSenhaAtual.value;
        const novaSenha = inputNovaSenha.value;
        const usuarioCorrente = auth.currentUser; // Pega quem está logado agora

        // 1. Barreiras de Segurança
        if (!usuarioCorrente) return alert("Erro das trevas: Nenhum aprendiz logado!");
        
        if (!senhaAtual || !novaSenha) {
            return alert("⚠️ O pergaminho está incompleto! Preencha a senha atual e a nova senha.");
        }

        if (novaSenha.length < 6) {
            return alert("⚠️ A magia é fraca! A nova senha deve ter pelo menos 6 caracteres.");
        }

        try {
            // 2. Reautenticar (Para provar ao Firebase que o aluno é o verdadeiro dono da conta)
            await signInWithEmailAndPassword(auth, usuarioCorrente.email, senhaAtual);
            
            // 3. O Golpe Final: Trocar a Senha no banco de dados!
            await updatePassword(usuarioCorrente, novaSenha);
            
            alert("✨ Feitiço selado! Sua nova senha foi gravada com sucesso nas muralhas do acervo.");
            
            // 4. Limpa os campos e fecha a janela mágica automaticamente
            inputSenhaAtual.value = "";
            inputNovaSenha.value = "";
            document.getElementById('modal-config-aluno').style.display = 'none';
            
        } catch (error) {
            console.error("Erro ao trocar senha:", error);
            if (error.code === 'auth/wrong-password') {
                alert("❌ A sua 'Senha Atual' está incorreta. Tente novamente.");
            } else {
                alert("❌ A magia falhou. Certifique-se de que a nova senha é diferente e segura.");
            }
        }
    });
}


// ==========================================
// ❌ FECHAR MODAL: CONFIGURAÇÃO GERAL DA GESTÃO
// ==========================================
const btnFecharConfigGeral = document.getElementById('fechar-configuracoes');
const modalConfigGeral = document.getElementById('modal-configuracoes');

if (btnFecharConfigGeral && modalConfigGeral) {
    btnFecharConfigGeral.addEventListener('click', () => {
        modalConfigGeral.style.display = 'none';
    });
}



// ==========================================
// 🗑️ BANIR TOMO DAS PRATELEIRAS (EXCLUIR LIVRO)
// ==========================================
window.excluirTomo = async function(id, titulo) {
    // 1. Trava de Segurança Hierárquica: Apenas ADM pode deletar. 
    // Alunos e pessoal da Gestão comum (que só cadastram/editam) são barrados!
    const nivelUsuario = String(window.usuarioNivelAtual || "").toLowerCase().trim();
    
    if (nivelUsuario !== "adm" && nivelUsuario !== "admin") {
        alert("🛡️ Acesso negado! Apenas Administradores (ADM) possuem permissão para banir tomos das prateleiras.");
        return;
    }

    if (confirm(`⚠️ Deseja realmente banir e destruir o tomo "${titulo}" das prateleiras do acervo? Esta ação não tem volta!`)) {
        try {
            // Apaga o documento da coleção "livros" usando o ID exato
            await deleteDoc(doc(db, "livros", id));
            
            alert(`🗑️ O tomo "${titulo}" virou cinzas e foi banido para sempre.`);
            
            // Atualiza a lista na tela suavemente sem fechar o sistema
            const btnInvocarTomo = document.getElementById('btn-invocar-tomo');
            if (btnInvocarTomo) {
                btnInvocarTomo.click(); 
            }
            
        } catch (error) {
            console.error("Erro ao banir tomo:", error);
            alert("❌ As forças das trevas impediram a exclusão deste livro.");
        }
    }
};


// ==========================================
// 🛡️ GUARDA DE SEGURANÇA: CONTROLE DE CONTAS
// ==========================================
function verificarPermissaoGerenciamentoContas() {
    const nivel = String(window.usuarioNivelAtual || "").toLowerCase().trim();
    const usuarioAtual = String(window.usuarioEmailAtual || window.usuarioNomeAtual || "").toLowerCase();

    const ehAdm = (nivel === "adm" || nivel === "admin");
    const ehJr12 = usuarioAtual.includes("jr12"); // Identifica o mestre JR 12

    if (!ehAdm && !ehJr12) {
        alert("⛔ Acesso Restrito! Apenas Administradores possuem autoridade para gerenciar contas.");
        return false; // Bloqueia a ação
    }
    return true; // Permite a magia prosseguir
}

// ==========================================
// ⚡ CONEXÃO DOS BOTÕES DE GESTÃO DE CONTAS (FINAL)
// ==========================================

// 1. 🔄 RESETAR SENHA (Guia Manual para 111111)
document.getElementById('btn-acao-resetar')?.addEventListener('click', () => {
    if (!verificarPermissaoGerenciamentoContas()) return;
    
    const emailAlvo = prompt("🪄 Digite o e-mail do aluno que terá a senha redefinida para 111111:");
    
    if (!emailAlvo || !emailAlvo.includes("@")) {
        return alert("⚠️ Operação cancelada.");
    }

    alert(
        `🛡️ [PROTOCOLO DE RESET MANUAL PARA 111111]\n\n` +
        `Como o e-mail de (${emailAlvo}) é interno/fictício:\n\n` +
        `1. Abra o painel do Firebase Console (Authentication).\n` +
        `2. Busque pelo e-mail: ${emailAlvo}\n` +
        `3. Clique nos 3 pontinhos (...) ao lado do usuário.\n` +
        `4. Selecione 'Alterar senha' e defina como: 111111\n\n` +
        `✨ Avise o aluno para logar com '111111' e alterar a senha no perfil dele em seguida!`
    );
});

// 2. 🔑 TROCAR A PRÓPRIA SENHA (ADM muda a sua própria senha)
document.getElementById('btn-acao-trocar')?.addEventListener('click', async () => {
    if (!verificarPermissaoGerenciamentoContas()) return;
    
    const usuarioAtual = auth.currentUser;
    
    if (!usuarioAtual) {
        return alert("❌ Erro: Nenhuma identidade mágica conectada no momento.");
    }

    const novaSenha = prompt("🔑 Digite a sua NOVA senha (mínimo de 6 caracteres):");
    if (!novaSenha) return; 
    
    if (novaSenha.length < 6) {
        return alert("⚠️ A proteção é fraca demais! A senha precisa ter pelo menos 6 caracteres.");
    }

    if (confirm("⚠️ Confirma a troca da SUA PRÓPRIA senha de acesso?")) {
        try {
            await updatePassword(usuarioAtual, novaSenha);
            alert("✨ Feitiço concluído! Sua chave de acesso foi forjada novamente. Lembre-se dela no próximo login!");
        } catch (error) {
            console.error("Erro ao trocar senha:", error);
            if (error.code === 'auth/requires-recent-login') {
                alert("🛡️ Bloqueio de Segurança: Saia do sistema, faça o login novamente e tente trocar a senha logo em seguida.");
            } else {
                alert("❌ Erro ao trocar a senha: " + error.message);
            }
        }
    }
});

// 3. 🚫 BLOQUEAR ACESSO (Atualiza status no Firestore)
document.getElementById('btn-acao-bloquear')?.addEventListener('click', async () => {
    if (!verificarPermissaoGerenciamentoContas()) return;
    
    const emailAlvo = prompt("🪄 Digite o e-mail do membro que terá o acesso BLOQUEADO:");
    if (!emailAlvo || !emailAlvo.includes("@")) return;

    if (confirm(`⚠️ Deseja trancar as portas do acervo para: ${emailAlvo}?`)) {
        try {
            const q = query(collection(db, "usuarios"), where("email", "==", emailAlvo.trim().toLowerCase()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) return alert("❌ Este e-mail não existe nos registros do Firestore.");

            const userDocRef = querySnapshot.docs[0].ref;
            await updateDoc(userDocRef, { bloqueado: true });
            
            alert(`🚫 Acesso bloqueado com sucesso! ${emailAlvo} não passará mais das portas.`);
        } catch (error) {
            console.error("Erro ao bloquear:", error);
            alert("❌ As forças das trevas impediram o bloqueio.");
        }
    }
});

// 4. 🗑️ EXCLUIR CONTA (Deleta o registro do Firestore)
document.getElementById('btn-acao-excluir')?.addEventListener('click', async () => {
    if (!verificarPermissaoGerenciamentoContas()) return;
    
    const emailAlvo = prompt("🪄 Digite o e-mail do membro que será EXCLUÍDO do sistema:");
    if (!emailAlvo || !emailAlvo.includes("@")) return;

    if (confirm(`⚠️ AVISO MÁXIMO: Deseja apagar todos os registros de ${emailAlvo} do Firestore? Esta ação não tem volta!`)) {
        try {
            const q = query(collection(db, "usuarios"), where("email", "==", emailAlvo.trim().toLowerCase()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) return alert("❌ Este e-mail não existe nos registros do Firestore.");

            const userDocRef = querySnapshot.docs[0].ref;
            await deleteDoc(userDocRef);
            
            alert(`🗑️ Conta excluída do banco! ${emailAlvo} foi banido dos registros do acervo.\n\nDica: Lembre-se de apagar o e-mail também na aba 'Authentication' do Firebase Console para exclusão total.`);
        } catch (error) {
            console.error("Erro ao excluir:", error);
            alert("❌ As forças das trevas impediram a exclusão.");
        }
    }
});


// ==========================================
// 📊 NAVEGAÇÃO DA CENTRAL DE RELATÓRIOS
// ==========================================
const btnAbrirRelatorios = document.getElementById('btn-aba-relatorios');
const abaRelatorios = document.getElementById('aba-relatorios');
const acervoMagico = document.getElementById('acervo-magico-container');
const estanteEstatica = document.getElementById('estante-estatica');
const btnFecharRelatorios = document.getElementById('btn-fechar-relatorios');

if (btnAbrirRelatorios) {
    btnAbrirRelatorios.addEventListener('click', () => {
        // Esconde a estante e as buscas
        acervoMagico.style.display = 'none';
        estanteEstatica.style.display = 'none';
        
        // Mostra a aba de relatórios
        abaRelatorios.style.display = 'block';
    });
}

if (btnFecharRelatorios) {
    btnFecharRelatorios.addEventListener('click', () => {
        // Esconde os relatórios
        abaRelatorios.style.display = 'none';
        
        // Mostra a estante e as buscas novamente
        acervoMagico.style.display = 'block';
        estanteEstatica.style.display = 'flex'; // ou block, dependendo de como estava original
    });
}


// ==========================================
// 👥 GERADOR DE RELATÓRIO: MEMBROS (USUÁRIOS)
// ==========================================
document.getElementById('btn-relatorio-usuarios')?.addEventListener('click', async () => {
    const container = document.getElementById('container-tabela-relatorios');
    
    // Mensagem de Carregamento escurecida
    container.innerHTML = '<p style="color: #8c6d46; text-align: center; margin-top: 150px; font-style: italic; font-size: 1.2rem;">⏳ Lendo os pergaminhos de registro... Aguarde.</p>';
    
    try {
        const querySnapshot = await getDocs(collection(db, "usuarios"));
        
        if (querySnapshot.empty) {
            container.innerHTML = '<p style="color: #8c6d46; text-align: center; margin-top: 150px; font-size: 1.2rem;">Nenhuma alma registrada nas muralhas ainda.</p>';
            return;
        }

        // Tabela atualizada com tons de cinza escuro, marrom e vinho
        let tabelaHTML = `
            <table style="width: 100%; border-collapse: collapse; color: #333333; font-family: sans-serif; text-align: left;">
                <thead>
                    <tr style="background-color: rgba(140, 109, 70, 0.15); border-bottom: 2px solid #8B0000;">
                        <th style="padding: 15px; font-size: 1.1rem; color: #8B0000;">Nome do Membro</th>
                        <th style="padding: 15px; font-size: 1.1rem; color: #8B0000;">E-mail (Selo)</th>
                        <th style="padding: 15px; font-size: 1.1rem; color: #8B0000; text-align: center;">Nível</th>
                        <th style="padding: 15px; font-size: 1.1rem; color: #8B0000; text-align: center;">Status</th>
                    </tr>
                </thead>
                <tbody>
        `;

        let totalUsuarios = 0;
        let totalBloqueados = 0;

        querySnapshot.forEach((docSnap) => {
            const dados = docSnap.data();
            const nome = dados.nome || "Membro Anônimo";
            const email = dados.email || "Sem e-mail";
            const nivel = (dados.nivel || "aluno").toUpperCase();
            
            const bloqueado = dados.bloqueado === true;
            const corStatus = bloqueado ? "#ff4d4d" : "#4CAF50"; 
            const textoStatus = bloqueado ? "🚫 Bloqueado" : "✅ Ativo";

            if (bloqueado) totalBloqueados++;
            totalUsuarios++;

            tabelaHTML += `
                <tr style="border-bottom: 1px dashed rgba(140, 109, 70, 0.3); transition: background 0.3s;" onmouseover="this.style.backgroundColor='rgba(140, 109, 70, 0.1)'" onmouseout="this.style.backgroundColor='transparent'">
                    <td style="padding: 12px; font-size: 1.05rem;">${nome}</td>
                    <td style="padding: 12px; font-size: 1rem; font-style: italic; color: #5c4033;">${email}</td>
                    <td style="padding: 12px; text-align: center; font-weight: bold; font-size: 0.9rem; letter-spacing: 1px;">${nivel}</td>
                    <td style="padding: 12px; text-align: center; color: ${corStatus}; font-weight: bold;">${textoStatus}</td>
                </tr>
            `;
        });

        tabelaHTML += `
                </tbody>
            </table>
            
            <div style="margin-top: 25px; padding-top: 15px; text-align: right; color: #8B0000; font-size: 1.1rem; border-top: 2px dashed #8c6d46;">
                <strong>👥 Total de Membros:</strong> ${totalUsuarios} &nbsp;|&nbsp; 
                <strong style="color: #ff4d4d;">🚫 Bloqueados:</strong> ${totalBloqueados}
            </div>
        `;

        container.innerHTML = tabelaHTML;

    } catch (error) {
        console.error("Erro ao gerar relatório de usuários:", error);
        container.innerHTML = '<p style="color: #ff4d4d; text-align: center; margin-top: 150px; font-weight: bold;">❌ Falha ao conjurar os dados. Verifique a conexão com o Firestore.</p>';
    }
});



// ==========================================
// 📚 GERADOR DE RELATÓRIO: ACERVO (LIVROS)
// ==========================================
document.getElementById('btn-relatorio-livros')?.addEventListener('click', async () => {
    const container = document.getElementById('container-tabela-relatorios');
    
    // 1. Mensagem de Carregamento (Cor alterada para marrom do tema)
    container.innerHTML = '<p style="color: #8c6d46; text-align: center; margin-top: 150px; font-style: italic; font-size: 1.2rem;">⏳ Contando os tomos nas prateleiras... Aguarde.</p>';
    
    try {
        // Busca todos os livros na coleção "livros"
        const querySnapshot = await getDocs(collection(db, "livros"));
        
        if (querySnapshot.empty) {
            container.innerHTML = '<p style="color: #8c6d46; text-align: center; margin-top: 150px; font-size: 1.2rem;">O acervo está vazio. Nenhuma obra foi catalogada ainda.</p>';
            return;
        }

        // 2. Prepara a estrutura da Tabela (Cores corrigidas para leitura)
        let tabelaHTML = `
            <table style="width: 100%; border-collapse: collapse; color: #333333; font-family: sans-serif; text-align: left;">
                <thead>
                    <tr style="background-color: rgba(140, 109, 70, 0.15); border-bottom: 2px solid #8B0000;">
                        <th style="padding: 15px; font-size: 1.1rem; color: #8B0000; text-align: center;">Código</th>
                        <th style="padding: 15px; font-size: 1.1rem; color: #8B0000;">Título da Obra</th>
                        <th style="padding: 15px; font-size: 1.1rem; color: #8B0000;">Autor</th>
                        <th style="padding: 15px; font-size: 1.1rem; color: #8B0000; text-align: center;">Categoria</th>
                    </tr>
                </thead>
                <tbody>
        `;

        let totalLivros = 0;

        // 3. Preenche a tabela iterando sobre os documentos
        querySnapshot.forEach((docSnap) => {
            const dados = docSnap.data();
            const codigo = dados.codigo || "0000";
            const titulo = dados.titulo || "Obra Desconhecida";
            const autor = dados.autor || "Desconhecido";
            const categoria = dados.categoria || "Geral";
            
            totalLivros++;

            // Linha da tabela para o livro (Cores corrigidas para leitura)
            tabelaHTML += `
                <tr style="border-bottom: 1px dashed rgba(140, 109, 70, 0.3); transition: background 0.3s;" onmouseover="this.style.backgroundColor='rgba(140, 109, 70, 0.1)'" onmouseout="this.style.backgroundColor='transparent'">
                    <td style="padding: 12px; text-align: center; font-weight: bold; color: #8B0000;">${codigo}</td>
                    <td style="padding: 12px; font-size: 1.05rem;">${titulo}</td>
                    <td style="padding: 12px; font-size: 1rem; font-style: italic; color: #5c4033;">${autor}</td>
                    <td style="padding: 12px; text-align: center; font-size: 0.95rem;">${categoria}</td>
                </tr>
            `;
        });

        // 4. Fechamento da tabela e Resumo Final (Cores corrigidas para leitura)
        tabelaHTML += `
                </tbody>
            </table>
            
            <div style="margin-top: 25px; padding-top: 15px; text-align: right; color: #8B0000; font-size: 1.1rem; border-top: 2px dashed #8c6d46;">
                <strong>📚 Total de Obras no Acervo:</strong> ${totalLivros}
            </div>
        `;

        // Coloca a tabela finalizada na tela
        container.innerHTML = tabelaHTML;

    } catch (error) {
        console.error("Erro ao gerar relatório de livros:", error);
        container.innerHTML = '<p style="color: #ff4d4d; text-align: center; margin-top: 150px; font-weight: bold;">❌ Falha ao conjurar os dados. Verifique a conexão com o Firestore.</p>';
    }
});



// ==========================================
// ⏳ GERADOR DE RELATÓRIO: EMPRÉSTIMOS ATIVOS
// ==========================================
document.getElementById('btn-relatorio-emprestimos')?.addEventListener('click', async () => {
    const container = document.getElementById('container-tabela-relatorios');
    
    container.innerHTML = '<p style="color: #8c6d46; text-align: center; margin-top: 150px; font-style: italic; font-size: 1.2rem;">⏳ Consultando os contratos de empréstimo ativos... Aguarde.</p>';
    
    try {
        const q = query(collection(db, "emprestimos"), where("devolvido", "==", false));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            container.innerHTML = '<p style="color: #4CAF50; text-align: center; margin-top: 150px; font-size: 1.2rem; font-weight: bold;">✅ Todos os livros estão nas estantes! Nenhum empréstimo pendente no momento.</p>';
            return;
        }

        let tabelaHTML = `
            <table style="width: 100%; border-collapse: collapse; color: #333333; font-family: sans-serif; text-align: left;">
                <thead>
                    <tr style="background-color: rgba(140, 109, 70, 0.15); border-bottom: 2px solid #8B0000;">
                        <th style="padding: 15px; font-size: 1.1rem; color: #8B0000;">Obra (Código)</th>
                        <th style="padding: 15px; font-size: 1.1rem; color: #8B0000;">Aluno (Membro)</th>
                        <th style="padding: 15px; font-size: 1.1rem; color: #8B0000; text-align: center;">Data Limite</th>
                        <th style="padding: 15px; font-size: 1.1rem; color: #8B0000; text-align: center;">Status do Prazo</th>
                    </tr>
                </thead>
                <tbody>
        `;

        let totalEmprestimos = 0;
        let totalAtrasados = 0;
        
        const dataHoje = new Date();
        dataHoje.setHours(0, 0, 0, 0);

        querySnapshot.forEach((docSnap) => {
            const dados = docSnap.data();
            const tituloLivro = dados.tituloLivro || "Obra Desconhecida";
            const codigoLivro = dados.codigoLivro || "0000";
            const nomeAluno = dados.nomeAluno || dados.alunoEmail || "Aluno";
            const dataDevolucaoStr = dados.dataDevolucao; 
            
            totalEmprestimos++;

            let statusTexto = "No Prazo";
            let corFundoStatus = "#4CAF50"; 
            let corTextoStatus = "#ffffff";

            if (dataDevolucaoStr) {
                const [ano, mes, dia] = dataDevolucaoStr.split('-');
                const dataLimite = new Date(ano, mes - 1, dia);
                
                const diferencaTempo = dataLimite.getTime() - dataHoje.getTime();
                const diferencaDias = Math.ceil(diferencaTempo / (1000 * 3600 * 24));

                if (diferencaDias < 0) {
                    statusTexto = `Atrasado (${Math.abs(diferencaDias)} dias)`;
                    corFundoStatus = "#ff4d4d"; 
                    totalAtrasados++;
                } else if (diferencaDias === 0) {
                    statusTexto = "Vence Hoje!";
                    corFundoStatus = "#ff4d4d"; 
                    totalAtrasados++; 
                } else if (diferencaDias === 1) {
                    statusTexto = "Vence Amanhã";
                    corFundoStatus = "#d97706"; // Laranja escuro para melhorar legibilidade
                    corTextoStatus = "#ffffff"; 
                } else {
                    statusTexto = `Faltam ${diferencaDias} dias`;
                }
            }

            let dataExibicao = "Sem data";
            if(dataDevolucaoStr) {
                 const partes = dataDevolucaoStr.split('-');
                 dataExibicao = `${partes[2]}/${partes[1]}/${partes[0]}`;
            }

            tabelaHTML += `
                <tr style="border-bottom: 1px dashed rgba(140, 109, 70, 0.3); transition: background 0.3s;" onmouseover="this.style.backgroundColor='rgba(140, 109, 70, 0.1)'" onmouseout="this.style.backgroundColor='transparent'">
                    <td style="padding: 12px; font-size: 1.05rem;"><strong style="color: #8B0000;">${codigoLivro}</strong> - ${tituloLivro}</td>
                    <td style="padding: 12px; font-size: 1rem; font-style: italic; color: #5c4033;">${nomeAluno}</td>
                    <td style="padding: 12px; text-align: center; font-weight: bold; font-size: 1.1rem; color: #333333;">${dataExibicao}</td>
                    <td style="padding: 12px; text-align: center;">
                        <span style="background-color: ${corFundoStatus}; color: ${corTextoStatus}; padding: 6px 12px; border-radius: 20px; font-size: 0.9rem; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
                            ${statusTexto}
                        </span>
                    </td>
                </tr>
            `;
        });

        tabelaHTML += `
                </tbody>
            </table>
            
            <div style="margin-top: 25px; padding-top: 15px; text-align: right; color: #8B0000; font-size: 1.1rem; border-top: 2px dashed #8c6d46;">
                <strong>⏳ Total de Empréstimos Ativos:</strong> ${totalEmprestimos} &nbsp;|&nbsp; 
                <strong style="color: #ff4d4d;">⚠️ Alertas Críticos (Hoje/Atrasados):</strong> ${totalAtrasados}
            </div>
        `;

        container.innerHTML = tabelaHTML;

    } catch (error) {
        console.error("Erro ao gerar relatório de empréstimos:", error);
        container.innerHTML = '<p style="color: #ff4d4d; text-align: center; margin-top: 150px; font-weight: bold;">❌ As forças das trevas impediram a leitura dos contratos.</p>';
    }
});


// ==========================================
// 📖 ABERTURA DO MODAL DE RESERVA (ALUNO)
// ==========================================
const btnSolicitarEmprestimo = document.getElementById('btn-solicitar-emprestimo');
const modalReservaAluno = document.getElementById('modal-reserva-aluno');
const btnFecharReservaAluno = document.getElementById('fechar-modal-reserva');

// 1. Abre a janela de Reserva quando o Aluno clica
if (btnSolicitarEmprestimo) {
    btnSolicitarEmprestimo.addEventListener('click', () => {
        // Limpa o campo sempre que abrir
        const inputCodigo = document.getElementById('input-codigo-reserva');
        if (inputCodigo) inputCodigo.value = "";
        
        modalReservaAluno.style.display = 'flex';
    });
}

// 2. Fecha a janela de Reserva no X
if (btnFecharReservaAluno) {
    btnFecharReservaAluno.addEventListener('click', () => {
        modalReservaAluno.style.display = 'none';
    });
}


// ==========================================
// 📝 ABERTURA DA GESTÃO DE EMPRÉSTIMOS (GESTÃO)
// ==========================================
const btnAbrirGestaoEmprestimos = document.getElementById('btn-abrir-gestao-emprestimos');
const modalGestaoEmprestimos = document.getElementById('modal-gestao-emprestimos');
const btnFecharGestaoEmprestimos = document.getElementById('fechar-gestao-emprestimos');

// Abre a janela e invoca as listas atualizadas
if (btnAbrirGestaoEmprestimos) {
    btnAbrirGestaoEmprestimos.addEventListener('click', () => {
        if (modalGestaoEmprestimos) modalGestaoEmprestimos.style.display = 'flex';
        
        // Puxa a lista de alunos aguardando aprovação
        if (typeof carregarListasEmprestimos === "function") {
            carregarListasEmprestimos();
        }
    });
}

// Fecha a janela no X
if (btnFecharGestaoEmprestimos) {
    btnFecharGestaoEmprestimos.addEventListener('click', () => {
        if (modalGestaoEmprestimos) modalGestaoEmprestimos.style.display = 'none';
    });
}


// ==========================================
// 🪄 LÓGICA DE SOLICITAÇÃO DE EMPRÉSTIMO (ALUNO)
// ==========================================
const btnConfirmarReserva = document.getElementById('btn-confirmar-reserva');

if (btnConfirmarReserva) {
    btnConfirmarReserva.addEventListener('click', async () => {
        const inputCodigo = document.getElementById('input-codigo-reserva');
        const codigo = inputCodigo.value.trim().toUpperCase();

        const regex4Digitos = /^\d{4}$/;
        if (!regex4Digitos.test(codigo)) {
            return alert("⚠️ O código mágico deve conter exatamente 4 números (ex: 0001).");
        }

        const usuarioAtual = auth.currentUser;
        if (!usuarioAtual) {
            return alert("❌ Erro das trevas: Nenhum aprendiz identificado.");
        }

        const textoOriginal = btnConfirmarReserva.innerHTML;
        btnConfirmarReserva.innerHTML = "⏳ A consultar os oráculos...";
        btnConfirmarReserva.disabled = true;

        try {
            const qLivro = query(collection(db, "livros"), where("codigo", "==", codigo));
            const snapLivro = await getDocs(qLivro);

            if (snapLivro.empty) {
                alert("❌ Obra não encontrada! Verifica se o código mágico está correto.");
                btnConfirmarReserva.innerHTML = textoOriginal;
                btnConfirmarReserva.disabled = false;
                return;
            }

            let livroDados = null;
            snapLivro.forEach(doc => { livroDados = doc.data(); });

            const qEmprestimo = query(
                collection(db, "emprestimos"), 
                where("codigoLivro", "==", codigo),
                where("devolvido", "==", false)
            );
            const snapEmprestimo = await getDocs(qEmprestimo);

            if (!snapEmprestimo.empty) {
                alert(`⚠️ O tomo "${livroDados.titulo}" já se encontra reservado ou em posse de outro aprendiz.`);
                btnConfirmarReserva.innerHTML = textoOriginal;
                btnConfirmarReserva.disabled = false;
                return;
            }

            let nomeDoAluno = "Aluno Anónimo";
            const userDocRef = doc(db, "usuarios", usuarioAtual.uid);
            const userSnap = await getDoc(userDocRef);
            
            if (userSnap.exists() && userSnap.data().nome) {
                nomeDoAluno = userSnap.data().nome; 
            }

            await addDoc(collection(db, "emprestimos"), {
                codigoLivro: codigo,
                tituloLivro: livroDados.titulo,
                alunoEmail: usuarioAtual.email,
                nomeAluno: nomeDoAluno, 
                dataSolicitacao: new Date().toISOString(),
                dataDevolucao: "", 
                status: "pendente", 
                devolvido: false,
                aprovadoPor: "" // Fica vazio até a Gestão aprovar
            });

            alert(`✨ Pedido selado com sucesso!\nSolicitaste a obra: "${livroDados.titulo}".\n\nAguarda a aprovação da Gestão para retirares o tomo físico.`);
            
            // ==========================================
            // 🔥 GATILHO DO LOG (Regista o pedido do aluno)
            // ==========================================
            if (typeof registrarLog === 'function') registrarLog(`Solicitou o empréstimo da obra: "${livroDados.titulo}" (Cód: ${codigo})`);
            
            inputCodigo.value = "";
            document.getElementById('modal-reserva-aluno').style.display = 'none';

        } catch (error) {
            console.error("Erro ao registrar reserva:", error);
            alert("❌ Ocorreu um distúrbio na magia. Tenta novamente.");
        }

        btnConfirmarReserva.innerHTML = textoOriginal;
        btnConfirmarReserva.disabled = false;
    });
}



// ==========================================
// 🛡️ FEITIÇO DE AUDITORIA: IDENTIFICAR QUEM ESTÁ APROVANDO (BLINDADO)
// ==========================================

// 1. Escuta o momento exato do login da Gestão e congela a identidade!
document.getElementById('btn-login-colegio')?.addEventListener('click', () => {
    const emailInput = document.getElementById('colegio-email');
    if (emailInput) {
        const emailValor = emailInput.value.trim();
        if (emailValor.toUpperCase() === "JR") {
            window.gestorOficialLogado = "Mestre JR (Direção)";
        } else if (emailValor.includes('@')) {
            window.gestorOficialLogado = emailValor.toLowerCase();
        }
    }
});

// 2. A função que diz quem está aprovando
function identificarGestor() {
    // Tenta primeiro usar a identidade congelada (À prova de conflitos com alunos)
    if (window.gestorOficialLogado) {
        return window.gestorOficialLogado;
    }
    
    // Se a página for atualizada (F5), a memória congela some, mas o Firebase lembra:
    if (auth && auth.currentUser && auth.currentUser.email) {
        return auth.currentUser.email; 
    }
    
    // Proteção final
    return "Gestão do Acervo";
}


// ==========================================
// ⚡ LÓGICA DE EMPRÉSTIMO BALCÃO (PRESENCIAL)
// ==========================================
const btnEmprestarBalcao = document.getElementById('btn-emprestar-balcao');
if (btnEmprestarBalcao) {
    btnEmprestarBalcao.addEventListener('click', async () => {
        const inputCodigo = document.getElementById('input-codigo-balcao');
        const inputEmail = document.getElementById('input-email-balcao');
        
        const codigo = inputCodigo.value.trim().toUpperCase();
        const emailAluno = inputEmail.value.trim().toLowerCase();
        
        // Puxa o nome real de quem está no comando agora!
        const gestorAtual = identificarGestor();

        if (!/^\d{4}$/.test(codigo)) return alert("⚠️️ Código inválido. Use 4 dígitos numéricos.");
        if (!emailAluno || !emailAluno.includes('@')) return alert("⚠️ Digite um e-mail válido para o aluno.");

        try {
            const qLivro = query(collection(db, "livros"), where("codigo", "==", codigo));
            const snapLivro = await getDocs(qLivro);
            if (snapLivro.empty) return alert("❌ Obra não encontrada no acervo.");
            
            let tituloLivro = "";
            snapLivro.forEach(doc => { tituloLivro = doc.data().titulo; });

            const qEmprestimo = query(collection(db, "emprestimos"), where("codigoLivro", "==", codigo), where("devolvido", "==", false));
            const snapEmprestimo = await getDocs(qEmprestimo);
            if (!snapEmprestimo.empty) return alert("⚠️ Este livro já está emprestado ou reservado!");

            const dias = prompt(`Quantos dias de empréstimo para "${tituloLivro}"?`, "7");
            if (!dias || isNaN(dias)) return alert("⚠️ Empréstimo cancelado. Prazo inválido.");

            const dataDev = new Date();
            dataDev.setDate(dataDev.getDate() + parseInt(dias));
            const dataFormatada = `${dataDev.getFullYear()}-${String(dataDev.getMonth() + 1).padStart(2, '0')}-${String(dataDev.getDate()).padStart(2, '0')}`;

            await addDoc(collection(db, "emprestimos"), {
                codigoLivro: codigo,
                tituloLivro: tituloLivro,
                alunoEmail: emailAluno,
                nomeAluno: emailAluno.split('@')[0], 
                dataSolicitacao: new Date().toISOString(),
                dataDevolucao: dataFormatada,
                status: "aprovado",
                devolvido: false,
                aprovadoPor: gestorAtual // AUDITORIA CORRETA AQUI!
            });

            // 🔥 GATILHO DO LOG (Empréstimo de Balcão)
            if (typeof registrarLog === 'function') {
                registrarLog(`Emprestou no balcão a obra: "${tituloLivro}" para o aluno: ${emailAluno.split('@')[0]}`);
            }

            alert(`✅ Empréstimo de Balcão concluído!\nLivro liberado por: ${gestorAtual}`);
            inputCodigo.value = "";
            inputEmail.value = "";
            carregarListasEmprestimos(); 

        } catch (error) {
            console.error(error);
            alert("❌ Erro ao realizar o empréstimo de balcão.");
        }
    });
}



// ==========================================
// 📋 VARIÁVEIS DO CARROSSEL (MEMÓRIA)
// ==========================================
window.pedidosPendentes = [];
window.indexPendentes = 0;

window.emprestimosAtivos = [];
window.indexAtivos = 0;

// ==========================================
// 📋 GERENCIAR CARROSSEL (LÓGICA PRINCIPAL)
// ==========================================
window.carregarListasEmprestimos = async function() {
    const listaPendentes = document.getElementById('lista-pedidos-pendentes');
    const listaAtivos = document.getElementById('lista-emprestimos-ativos');
    
    if(!listaPendentes || !listaAtivos) return;

    listaPendentes.innerHTML = "<p style='text-align:center; width:100%; color:#8c6d46;'>⏳ Lendo oráculos...</p>";
    listaAtivos.innerHTML = "<p style='text-align:center; width:100%; color:#8c6d46;'>⏳ Lendo oráculos...</p>";

    try {
        const q = query(collection(db, "emprestimos"), where("devolvido", "==", false));
        const snapshot = await getDocs(q);

        window.pedidosPendentes = [];
        window.emprestimosAtivos = [];

        snapshot.forEach((docSnap) => {
            const emp = docSnap.data();
            emp.id = docSnap.id; // Salva o ID junto

            if (emp.status === "pendente") {
                window.pedidosPendentes.push(emp);
            } else if (emp.status === "aprovado") {
                window.emprestimosAtivos.push(emp);
            }
        });

        // Reinicia os índices
        window.indexPendentes = 0;
        window.indexAtivos = 0;

        // Desenha a tela
        renderizarPendentes();
        renderizarAtivos();

    } catch (error) {
        console.error(error);
        listaPendentes.innerHTML = "<p style='color:red; width:100%;'>Erro ao ler oráculos.</p>";
        listaAtivos.innerHTML = "<p style='color:red; width:100%;'>Erro ao ler oráculos.</p>";
    }
};

// Faz a lista carregar automaticamente quando abre a janela
const btnTriggerListas = document.getElementById('btn-abrir-gestao-emprestimos');
if(btnTriggerListas) {
    btnTriggerListas.addEventListener('click', () => {
        if(typeof carregarListasEmprestimos === "function") carregarListasEmprestimos();
    });
}

// ==========================================
// 🎨 DESENHAR CARTÃO PENDENTE (1 POR VEZ)
// ==========================================
function renderizarPendentes() {
    const container = document.getElementById('lista-pedidos-pendentes');
    const contador = document.getElementById('contador-pendentes');
    const total = window.pedidosPendentes.length;

    if (total === 0) {
        contador.innerText = "0 de 0";
        container.innerHTML = "<p style='text-align:center; width:100%; color:#555; font-style:italic; font-size: 0.95rem;'>Nenhum pedido online aguardando.</p>";
        return;
    }

    contador.innerText = `${window.indexPendentes + 1} de ${total}`;
    const emp = window.pedidosPendentes[window.indexPendentes];

    // 📏 AJUSTE: height: 100% para colar no topo e base da janela, fontes reduzidas e botões vazados.
    container.innerHTML = `
        <div style="width: 100%; height: 100%; display: flex; justify-content: space-between; align-items: center; background: white; padding: 15px 20px; border-radius: 8px; border-left: 6px solid #8B0000; box-shadow: 0 2px 6px rgba(0,0,0,0.05); box-sizing: border-box;">
            <div style="flex: 1; padding-right: 20px; font-family: inherit;">
                <strong style="color: #8B0000; font-size: 1.1rem;">${emp.codigoLivro}</strong> <span style="font-size: 1.1rem; color: #333; font-weight: bold;">- ${emp.tituloLivro}</span><br>
                <span style="font-size: 0.95rem; color: #555; display: inline-block; margin-top: 8px;">👤 Solicitado por: <strong style="color: #000;">${emp.nomeAluno}</strong> (${emp.alunoEmail})</span>
            </div>
            <div style="display: flex; gap: 10px; min-width: 200px; justify-content: flex-end;">
                <!-- BOTÃO APROVAR VAZADO -->
                <button onclick="aprovarEmprestimo('${emp.id}', '${emp.tituloLivro}')" style="background: transparent; color: #8c6d46; border: 2px solid #8c6d46; padding: 10px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.9rem; text-transform: uppercase; transition: 0.3s;" onmouseover="this.style.backgroundColor='#8c6d46'; this.style.color='white'" onmouseout="this.style.backgroundColor='transparent'; this.style.color='#8c6d46'">✅ Aprovar</button>
                
                <!-- BOTÃO RECUSAR VAZADO -->
                <button onclick="rejeitarEmprestimo('${emp.id}')" style="background: transparent; color: #8B0000; border: 2px solid #8B0000; padding: 10px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.9rem; text-transform: uppercase; transition: 0.3s;" onmouseover="this.style.backgroundColor='#8B0000'; this.style.color='white'" onmouseout="this.style.backgroundColor='transparent'; this.style.color='#8B0000'">✖ Recusar</button>
            </div>
        </div>
    `;
}

// ==========================================
// 🎨 DESENHAR CARTÃO ATIVO E SEMÁFORO (GESTÃO)
// ==========================================
function renderizarAtivos() {
    const container = document.getElementById('lista-emprestimos-ativos');
    const contador = document.getElementById('contador-ativos');
    const total = window.emprestimosAtivos.length;

    if (total === 0) {
        contador.innerText = "0 de 0";
        container.innerHTML = "<p style='text-align:center; width:100%; color:#555; font-style:italic; font-size: 0.95rem;'>Nenhum livro fora do acervo.</p>";
        return;
    }

    contador.innerText = `${window.indexAtivos + 1} de ${total}`;
    const emp = window.emprestimosAtivos[window.indexAtivos];

    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    
    let statusCor = "#006400"; // Verde Escuro Puro
    let statusTexto = "NO PRAZO";
    let dataExibicao = "Sem prazo";

    if(emp.dataDevolucao) {
        const [ano, mes, dia] = emp.dataDevolucao.split('-');
        const dataLimite = new Date(ano, mes - 1, dia);
        dataExibicao = `${dia}/${mes}/${ano}`;
        
        const diffTempo = dataLimite.getTime() - hoje.getTime();
        const diffDias = Math.ceil(diffTempo / (1000 * 3600 * 24));

        if (diffDias < 0) {
            statusCor = "#8B0000"; // Vermelho
            statusTexto = `⚠️ ATRASADO ${Math.abs(diffDias)} DIA(S)`;
        } else if (diffDias === 0) {
            statusCor = "#006400"; // Verde Escuro Puro
            statusTexto = `✅ VENCE HOJE`;
        } else if (diffDias === 1) {
            statusCor = "#935116"; // Bronze Avermelhado (Legibilidade Absoluta)
            statusTexto = `⚠️ VENCE AMANHÃ`;
        } else {
            statusCor = "#006400"; // Verde Escuro Puro
            statusTexto = `⏳ FALTAM ${diffDias} DIAS`;
        }
    }

    container.innerHTML = `
        <div style="width: 100%; height: 100%; display: flex; justify-content: space-between; align-items: center; background-color: white !important; padding: 15px 20px; border-radius: 8px; border-left: 6px solid ${statusCor} !important; box-shadow: 0 2px 6px rgba(0,0,0,0.05); box-sizing: border-box;">
            <div style="flex: 1; padding-right: 20px; font-family: inherit;">
                <strong style="color: #8B0000 !important; font-size: 1.1rem;">${emp.codigoLivro}</strong> <span style="font-size: 1.1rem; color: #333 !important; font-weight: bold;">- ${emp.tituloLivro}</span><br>
                <div style="margin-top: 8px; line-height: 1.5;">
                    <span style="font-size: 0.95rem; color: #333 !important;">👤 Com: <strong>${emp.nomeAluno || emp.alunoEmail}</strong></span><br>
                    
                    <!-- SEMÁFORO BLINDADO: FORÇA O VAZADO COM !IMPORTANT -->
                    <span style="display: inline-block; margin-top: 6px; background-color: transparent !important; border: 2px solid ${statusCor} !important; color: ${statusCor} !important; padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 0.85rem; box-shadow: none !important;">${statusTexto} (Até ${dataExibicao})</span>
                    
                    <span style="font-size: 0.8rem; color: #8c6d46 !important; display: block; margin-top: 6px; font-style: italic;">🛡️ Aprovado por: ${emp.aprovadoPor || 'Gestão'}</span>
                </div>
            </div>
            <div style="min-width: 160px; text-align: right;">
                <button onclick="devolverEmprestimo('${emp.id}', '${emp.tituloLivro}')" style="background-color: transparent !important; color: #8c6d46 !important; border: 2px solid #8c6d46 !important; padding: 12px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; width: 100%; font-size: 0.95rem; text-transform: uppercase; transition: 0.3s;" onmouseover="this.style.backgroundColor='#8c6d46' !important; this.style.color='white' !important" onmouseout="this.style.backgroundColor='transparent' !important; this.style.color='#8c6d46' !important">📚 Receber</button>
            </div>
        </div>
    `;
}


// ==========================================
// 🖱️ CONTROLES DAS SETAS DO CARROSSEL
// ==========================================
document.getElementById('btn-prev-pendentes')?.addEventListener('click', () => {
    if (window.pedidosPendentes.length > 0) {
        window.indexPendentes = (window.indexPendentes - 1 + window.pedidosPendentes.length) % window.pedidosPendentes.length;
        renderizarPendentes();
    }
});
document.getElementById('btn-next-pendentes')?.addEventListener('click', () => {
    if (window.pedidosPendentes.length > 0) {
        window.indexPendentes = (window.indexPendentes + 1) % window.pedidosPendentes.length;
        renderizarPendentes();
    }
});

document.getElementById('btn-prev-ativos')?.addEventListener('click', () => {
    if (window.emprestimosAtivos.length > 0) {
        window.indexAtivos = (window.indexAtivos - 1 + window.emprestimosAtivos.length) % window.emprestimosAtivos.length;
        renderizarAtivos();
    }
});
document.getElementById('btn-next-ativos')?.addEventListener('click', () => {
    if (window.emprestimosAtivos.length > 0) {
        window.indexAtivos = (window.indexAtivos + 1) % window.emprestimosAtivos.length;
        renderizarAtivos();
    }
});


// ==========================================
// ⚡ FEITIÇOS DE APROVAÇÃO, REJEIÇÃO E DEVOLUÇÃO
// ==========================================
window.aprovarEmprestimo = async function(id, titulo) {
    const gestorAtual = identificarGestor();
    const dias = prompt(`Aprovar "${titulo}". Quantos dias de prazo?`, "7");
    if (!dias || isNaN(dias)) return alert("Aprovação cancelada.");

    const dataDev = new Date();
    dataDev.setDate(dataDev.getDate() + parseInt(dias));
    const dataFormatada = `${dataDev.getFullYear()}-${String(dataDev.getMonth() + 1).padStart(2, '0')}-${String(dataDev.getDate()).padStart(2, '0')}`;

    try {
        await updateDoc(doc(db, "emprestimos", id), { status: "aprovado", dataDevolucao: dataFormatada, aprovadoPor: gestorAtual });
        alert(`✅ Livro liberado com sucesso por ${gestorAtual}!`);
        if (typeof registrarLog === 'function') registrarLog(`Aprovou e libertou a obra: "${titulo}"`);
        carregarListasEmprestimos(); 
    } catch (error) { alert("❌ Falha ao aprovar."); }
};

window.devolverEmprestimo = async function(id, titulo) {
    const gestorAtual = identificarGestor();
    if (confirm(`O aluno vai devolver o livro "${titulo}" agora?`)) {
        try {
            await updateDoc(doc(db, "emprestimos", id), { devolvido: true, recebidoPor: gestorAtual, dataDevolucaoReal: new Date().toISOString() });
            alert("📚 Livro guardado nas prateleiras com sucesso!");
            if (typeof registrarLog === 'function') registrarLog(`Recebeu a devolução da obra: "${titulo}"`);
            carregarListasEmprestimos(); 
        } catch (error) { alert("❌ Falha ao registrar devolução."); }
    }
};

window.rejeitarEmprestimo = async function(id) {
    // Nova frase para confirmar que é o código certo!
    if (confirm("Tem certeza que deseja RECUSAR este pedido? A Coruja vai entregar uma notificação vermelha ao aluno!")) {
        try {
            // Em vez de deleteDoc, usamos updateDoc!
            await updateDoc(doc(db, "emprestimos", id), { 
                status: "rejeitado",
                devolvido: false 
            });
            if (typeof registrarLog === 'function') registrarLog(`Recusou um pedido de empréstimo.`);
            carregarListasEmprestimos(); 
        } catch (error) { alert("❌ Falha ao rejeitar."); }
    }
};




// ==========================================
// 🦉 FEITIÇO DO CORREIO CORUJA (MENSAGEIRO MÁGICO)
// ==========================================
window.verificarAlertas = async function(emailUsuario, nivelUsuario) {
    if (!emailUsuario) return;
    
    // 🛡️ BLINDAGEM DE SEGURANÇA: Normaliza o nível para minúsculas (evita que "Admin" ou "Gestão" sejam tratados como alunos)
    const nivel = nivelUsuario ? String(nivelUsuario).toLowerCase().trim() : "aluno";
    
    // 1. CORUJA PARA GESTÃO E ADMINISTRAÇÃO
    if (nivel === "adm" || nivel === "admin" || nivel === "gestao" || nivel === "gestão" || nivel === "direcao" || nivel === "direção") {
        try {
            let htmlAlertasGestao = "";
            let mostrarModalGestao = false;

            // A. Verifica pedidos pendentes
            const qGestao = query(collection(db, "emprestimos"), where("status", "==", "pendente"));
            const snapGestao = await getDocs(qGestao);
            
            if (!snapGestao.empty) {
                htmlAlertasGestao += `
                    <div style="background-color: transparent !important; border: 2px solid #8c6d46 !important; padding: 15px; border-radius: 8px; border-left: 8px solid #8c6d46 !important; box-shadow: none !important; margin-bottom: 10px;">
                        <strong style="color: #8c6d46 !important; font-size: 1.1rem;">🦉 Correio da Gestão</strong><br>
                        <span style="font-size: 0.95rem; color: #333 !important;">Existem <strong>${snapGestao.size}</strong> pedido(s) aguardando avaliação no Painel de Operações.</span>
                    </div>
                `;
                mostrarModalGestao = true;
            }

            // B. Calcula o Top 3 para informar a Gestão
            const snapTodos = await getDocs(collection(db, "emprestimos"));
            const contagem = {};
            const nomes = {};
            snapTodos.forEach(d => {
                const e = d.data();
                if(e.status !== "rejeitado" && e.alunoEmail) {
                    const mail = e.alunoEmail.toLowerCase();
                    contagem[mail] = (contagem[mail] || 0) + 1;
                    nomes[mail] = typeof capitalizar === 'function' ? capitalizar(e.nomeAluno || mail.split('@')[0]) : (e.nomeAluno || mail.split('@')[0]);
                }
            });
            
            const ranking = Object.keys(contagem).sort((a,b) => contagem[b] - contagem[a]);
            const top3 = ranking.slice(0, 3);
            
            // Verifica se a Gestão já ocultou o aviso de pódio HOJE
            const hojeStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
            const avisoGestaoOculto = localStorage.getItem('gestao_podio_oculto_' + hojeStr);

            if (top3.length > 0 && !avisoGestaoOculto) {
                let textoGanhadores = "";
                if(top3[0]) textoGanhadores += `<strong>🥇 1º</strong> ${nomes[top3[0]]} (${contagem[top3[0]]} ${contagem[top3[0]] === 1 ? 'obra' : 'obras'})<br>`;
                if(top3[1]) textoGanhadores += `<strong>🥈 2º</strong> ${nomes[top3[1]]} (${contagem[top3[1]]} ${contagem[top3[1]] === 1 ? 'obra' : 'obras'})<br>`;
                if(top3[2]) textoGanhadores += `<strong>🥉 3º</strong> ${nomes[top3[2]]} (${contagem[top3[2]]} ${contagem[top3[2]] === 1 ? 'obra' : 'obras'})`;

                htmlAlertasGestao = `
                    <div style="background-color: transparent !important; border: 2px solid #FFD700 !important; padding: 15px; border-radius: 8px; border-left: 8px solid #FFD700 !important; box-shadow: none !important; margin-bottom: 15px;">
                        <strong style="color: #B8860B !important; font-size: 1.1rem;">🏆 Resumo do Pódio Atual</strong><br>
                        <span style="font-size: 0.95rem; color: #333 !important; display: inline-block; margin-top: 8px; line-height: 1.6;">
                            Estes são os líderes de leitura do Colégio no momento:<br>
                            ${textoGanhadores}<br>
                            <em style="color: #5c4033; font-size: 0.85rem; display: block; margin-top: 8px;">Acesse a Câmara do Sistema para emitir os Diplomas.</em>
                        </span>
                        <div style="margin-top: 12px; text-align: right;">
                            <button onclick="ocultarAvisoPodioGestao('${hojeStr}')" style="background-color: #B8860B; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; font-weight: bold; transition: 0.2s;" onmouseover="this.style.backgroundColor='#8c6d46'" onmouseout="this.style.backgroundColor='#B8860B'">
                                👁️ Ocultar Relatório Hoje
                            </button>
                        </div>
                    </div>
                ` + htmlAlertasGestao;
                mostrarModalGestao = true;
            }

            // Exibe a janela para a Gestão
            if (mostrarModalGestao && htmlAlertasGestao !== "") {
                document.getElementById('conteudo-alertas-aluno').innerHTML = htmlAlertasGestao;
                document.getElementById('modal-alertas-aluno').style.display = 'flex';
            }
        } catch (error) { console.error("Erro na Coruja da Gestão:", error); }
        
        return; // ⛔ MURALHA DE FOGO: Daqui para baixo, a Gestão não passa!
    }

    // ========================================================
    // 2. CORUJA PARA ALUNOS (Recados Normais e Atrasos)
    // ========================================================
    try {
        const qAluno = query(collection(db, "emprestimos"), where("alunoEmail", "==", emailUsuario), where("devolvido", "==", false));
        const snapshot = await getDocs(qAluno);
        
        let htmlAlertas = "";
        let mostrarModal = false;
        
        if (!snapshot.empty) {
            const hoje = new Date();
            hoje.setHours(0,0,0,0);

            snapshot.forEach((docSnap) => {
                const emp = docSnap.data();
                const docId = docSnap.id; 

                if (emp.status === "pendente") {
                    htmlAlertas += `
                        <div style="background-color: transparent !important; border: 2px solid #8c6d46 !important; padding: 15px; border-radius: 8px; border-left: 8px solid #8c6d46 !important; box-shadow: none !important; margin-bottom: 10px;">
                            <strong style="color: #8c6d46 !important; font-size: 1.1rem;">${emp.tituloLivro}</strong><br>
                            <span style="font-size: 0.95rem; color: #333 !important;">⏳ O seu pedido foi enviado e aguarda a aprovação da Gestão.</span>
                        </div>
                    `;
                    mostrarModal = true;
                } 
                else if (emp.status === "rejeitado") {
                    htmlAlertas += `
                        <div style="background-color: transparent !important; border: 2px solid #8B0000 !important; padding: 15px; border-radius: 8px; border-left: 8px solid #8B0000 !important; box-shadow: none !important; margin-bottom: 10px;">
                            <strong style="color: #8B0000 !important; font-size: 1.1rem;">❌ Pedido Recusado: ${emp.tituloLivro}</strong><br>
                            <span style="font-size: 0.95rem; color: #333 !important; display: inline-block; margin-top: 5px;">
                                As forças maiores do colégio recusaram este pedido. Por favor, procure a <strong>Secretaria</strong> para verificar eventuais pendências.
                            </span>
                            <div style="margin-top: 12px; text-align: right;">
                                <button onclick="dispensarCoruja('${docId}')" style="background-color: #8B0000; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; font-weight: bold; transition: 0.2s;" onmouseover="this.style.backgroundColor='#5c0000'" onmouseout="this.style.backgroundColor='#8B0000'">
                                    📩 Estou Ciente
                                </button>
                            </div>
                        </div>
                    `;
                    mostrarModal = true;
                }
                else if (emp.status === "aprovado" && emp.dataDevolucao) {
                    const [ano, mes, dia] = emp.dataDevolucao.split('-');
                    const dataLimite = new Date(ano, mes - 1, dia);
                    const dataExibicao = `${dia}/${mes}/${ano}`;
                    const diffDias = Math.ceil((dataLimite.getTime() - hoje.getTime()) / (1000 * 3600 * 24));

                    let corBorda = diffDias < 0 ? "#8B0000" : (diffDias === 0 ? "#006400" : (diffDias === 1 ? "#935116" : "#006400"));
                    let icone = diffDias < 0 ? "🔴" : (diffDias === 0 ? "🟢" : (diffDias === 1 ? "🟠" : "⏳"));
                    let msg = diffDias < 0 ? `<strong>ATRASADO ${Math.abs(diffDias)} DIA(S)!</strong> Devolva imediatamente.` : (diffDias === 0 ? `<strong>VENCE HOJE!</strong> Devolva a obra hoje.` : `Prazo de devolução: ${dataExibicao}`);

                    htmlAlertas += `
                        <div style="background-color: transparent !important; border: 2px solid ${corBorda} !important; padding: 15px; border-radius: 8px; border-left: 8px solid ${corBorda} !important; box-shadow: none !important; margin-bottom: 10px;">
                            <strong style="color: ${corBorda} !important; font-size: 1.1rem;">${icone} ${emp.tituloLivro}</strong><br>
                            <span style="font-size: 0.95rem; color: #333 !important; display: inline-block; margin-top: 5px;">${msg}</span>
                        </div>
                    `;
                    mostrarModal = true;
                }
            });
        }

        // ========================================================
        // 🥇 3. CORUJA DE OURO: AVISO DE PÓDIO (SÓ ALUNOS!)
        // ========================================================
        try {
            // Em vez de calcular do zero, a Coruja procura a CARTA OFICIAL enviada pela Gestão!
            const refCarta = doc(db, "podio_ativo", emailUsuario.toLowerCase());
            const cartaSnap = await getDoc(refCarta);
            
            if (cartaSnap.exists()) {
                const dadosCarta = cartaSnap.data();
                
                // Só mostra o aviso se o aluno ainda não tiver confirmado!
                if (dadosCarta.statusConfirmacao === "aguardando_visualizacao") {
                    const posStr = dadosCarta.posicao;
                    const medalha = posStr === 1 ? "🥇" : (posStr === 2 ? "🥈" : "🥉");
                    
                    htmlAlertas = `
                        <div style="background-color: transparent !important; border: 2px solid #FFD700 !important; padding: 15px; border-radius: 8px; border-left: 8px solid #FFD700 !important; box-shadow: none !important; margin-bottom: 15px;">
                            <strong style="color: #B8860B !important; font-size: 1.1rem;">${medalha} Correio de Honra!</strong><br>
                            <span style="font-size: 0.95rem; color: #333 !important; display: inline-block; margin-top: 5px;">
                                Extraordinário! Você conquistou o <strong>${posStr}º Lugar</strong> nesta temporada como Maior Leitor do Colégio! A Direção e a Gestão da Biblioteca já prepararam o seu prêmio. <strong>Dirija-se à biblioteca para receber em mãos o seu Diploma de Honra Oficial!</strong>
                            </span>
                            <div style="margin-top: 12px; text-align: right;">
                                <button onclick="confirmarLeituraCoruja('${emailUsuario.toLowerCase()}')" style="background-color: #B8860B; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; font-weight: bold; transition: 0.2s;" onmouseover="this.style.backgroundColor='#8c6d46'" onmouseout="this.style.backgroundColor='#B8860B'">
                                    🌟 Fantástico! Já entendi
                                </button>
                            </div>
                        </div>
                    ` + htmlAlertas;
                    mostrarModal = true;
                }
            }
        } catch(e) { console.error("A Coruja Dourada falhou:", e); }

        if (mostrarModal && htmlAlertas !== "") {
            document.getElementById('conteudo-alertas-aluno').innerHTML = htmlAlertas;
            document.getElementById('modal-alertas-aluno').style.display = 'flex';
        }

    } catch (error) { console.error("Erro Coruja Aluno:", error); }
};







// ==========================================
// Botão de Estou Ciente (Dispensar Coruja)
// ==========================================
window.dispensarCoruja = async function(docId) {
    try {
        await deleteDoc(doc(db, "emprestimos", docId));
        alert("Aviso compreendido e descartado com sucesso!");
        document.getElementById('modal-alertas-aluno').style.display = 'none';
        
        const nivelLimpo = window.usuarioNivelAtual ? String(window.usuarioNivelAtual).toLowerCase().trim() : "aluno";
        verificarAlertas(auth.currentUser.email, nivelLimpo); 
    } catch (error) { console.error("Erro ao dispensar coruja:", error); }
};




// 🪄 AUTO-INVOCAÇÃO INTELIGENTE
auth.onAuthStateChanged((user) => {
    if (user && user.email) {
        setTimeout(() => { 
            const nivelLimpo = window.usuarioNivelAtual ? String(window.usuarioNivelAtual).toLowerCase().trim() : "aluno";
            verificarAlertas(user.email, nivelLimpo); 
        }, 1500);
    }
});



// ==========================================
// 📜 FEITIÇO DOS BOTÕES DE RELATÓRIO (PINTAR O ATIVO)
// ==========================================
const botoesRelatorio = [
    'btn-relatorio-usuarios',
    'btn-relatorio-livros',
    'btn-relatorio-emprestimos',
    'btn-relatorio-historico'
];

function pintarBotaoAtivo(botaoClicadoId) {
    botoesRelatorio.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            if (id === botaoClicadoId) {
                // PINTADO (Ativo)
                btn.style.backgroundColor = '#8B0000';
                btn.style.color = 'white';
                btn.setAttribute('data-ativo', 'true');
            } else {
                // VAZADO (Inativo)
                btn.style.backgroundColor = 'transparent';
                btn.style.color = '#8B0000';
                btn.setAttribute('data-ativo', 'false');
            }
            
            // Ajusta o rato (hover) para não desmanchar a pintura
            btn.onmouseover = function() {
                this.style.backgroundColor = '#8B0000';
                this.style.color = 'white';
            };
            btn.onmouseout = function() {
                if (this.getAttribute('data-ativo') !== 'true') {
                    this.style.backgroundColor = 'transparent';
                    this.style.color = '#8B0000';
                }
            };
        }
    });
}

// Escuta os cliques nos botões da aba de relatórios
botoesRelatorio.forEach(id => {
    const btn = document.getElementById(id);
    if(btn) {
        btn.addEventListener('click', () => {
            pintarBotaoAtivo(id);
            // Aviso temporário até fazermos a tabela funcionar
            document.getElementById('container-tabela-relatorios').innerHTML = `<p style="text-align:center; color:#8c6d46; margin-top: 150px; font-size: 1.2rem; font-style: italic;">⏳ Lendo os pergaminhos do banco de dados...</p>`;
            document.getElementById('ferramentas-relatorio').style.display = 'block'; // Mostra o botão de exportar
        });
    }
});


// ==========================================
// 🌫️ NÉVOA MÁGICA: FEITIÇO ABSOLUTO (TUDO NO JS)
// ==========================================
// 1. Criamos e estilizamos a névoa diretamente aqui (fura qualquer cache de CSS!)
let nevoa = document.getElementById('nevoa-absoluta');

if (!nevoa) {
    nevoa = document.createElement('div');
    nevoa.id = 'nevoa-absoluta';
    
    // Estilos mágicos aplicados à força pelo JavaScript
    nevoa.style.position = 'fixed';
    nevoa.style.top = '0';
    nevoa.style.left = '0';
    nevoa.style.width = '100vw';
    nevoa.style.height = '100vh';
    nevoa.style.pointerEvents = 'none'; // O rato clica através da névoa
    nevoa.style.zIndex = '9999999'; // Fica por cima de absolutamente tudo
    nevoa.style.opacity = '0'; // Começa invisível
    nevoa.style.transition = 'opacity 3s ease-in-out'; // Surge suavemente
    
    // O segredo do nevoeiro perfeito: Desfoque do fundo + brilho fantasmagórico
    nevoa.style.backdropFilter = 'blur(12px) brightness(0.6)';
    nevoa.style.webkitBackdropFilter = 'blur(12px) brightness(0.6)';
    nevoa.style.background = 'radial-gradient(circle, rgba(200,200,200,0.15) 0%, rgba(50,30,20,0.5) 100%)';
    
    // Injeta a névoa no ecrã
    document.body.appendChild(nevoa);
}

let tempoInativo;

function invocarFumaca() {
    nevoa.style.opacity = '1'; // A névoa aparece!
}

function dissiparFumaca() {
    nevoa.style.opacity = '0'; // A névoa desaparece!
    clearTimeout(tempoInativo);
    
    // ⏳ Está configurado para 3000 milissegundos (3 segundos) para poder testar já!
    // Assim que vir a névoa a funcionar, altere o 3000 abaixo para 60000 (60 segundos).
    tempoInativo = setTimeout(invocarFumaca, 300000);
}

// 2. Escuta qualquer movimento de rato, clique ou teclado
window.addEventListener('mousemove', dissiparFumaca);
window.addEventListener('keypress', dissiparFumaca);
window.addEventListener('click', dissiparFumaca);
window.addEventListener('scroll', dissiparFumaca);

// Dá a largada na contagem assim que o sistema abre
dissiparFumaca();


// ==========================================
// 📖 NAVEGAÇÃO DA CENTRAL DE HISTÓRICO (BACKUP)
// ==========================================
const btnRelatorioHistorico = document.getElementById('btn-relatorio-historico');
const menuRelatoriosPrincipal = document.getElementById('menu-relatorios-principal');
const menuRelatoriosHistorico = document.getElementById('menu-relatorios-historico');
const btnVoltarRelatorios = document.getElementById('btn-voltar-relatorios');
const tituloRelatorios = document.getElementById('titulo-relatorios');
const ferramentasRelatorio = document.getElementById('ferramentas-relatorio');
const containerTabelaRelatorios = document.getElementById('container-tabela-relatorios');

// 1. Quando clica no botão principal "HISTÓRICO"
if (btnRelatorioHistorico) {
    btnRelatorioHistorico.addEventListener('click', () => {
        // Esconde o menu comum e mostra o menu do histórico
        menuRelatoriosPrincipal.style.display = 'none';
        menuRelatoriosHistorico.style.display = 'flex';
        
        // Mostra o botão Voltar e ajusta o título
        btnVoltarRelatorios.style.display = 'inline-block';
        tituloRelatorios.innerText = "📖 Histórico e Backup do Acervo";
        
        // Esconde a barra de exportação até escolher uma aba do histórico
        ferramentasRelatorio.style.display = 'none';
        
        // Mensagem inicial na tela
        containerTabelaRelatorios.innerHTML = `
            <p style="color: #5c4033; font-style: italic; text-align: center; margin-top: 150px; font-size: 1.2rem;">
                🪄 Escolha uma das categorias acima (Membros, Acervo ou Empréstimos) para auditar os registos completos.
            </p>
        `;
    });
}

// 2. Quando clica no botão "VOLTAR"
if (btnVoltarRelatorios) {
    btnVoltarRelatorios.addEventListener('click', () => {
        // Restaura o menu principal e esconde o do histórico
        menuRelatoriosHistorico.style.display = 'none';
        menuRelatoriosPrincipal.style.display = 'flex';
        
        // Esconde o botão Voltar e restaura o título original
        btnVoltarRelatorios.style.display = 'none';
        tituloRelatorios.innerText = "📜 Registros do Acervo";
        
        // Esconde a barra de ferramentas e limpa o caldeirão
        ferramentasRelatorio.style.display = 'none';
        containerTabelaRelatorios.innerHTML = `
            <p style="color: #8c6d46; font-style: italic; text-align: center; margin-top: 150px; font-size: 1.2rem;">
                🪄 Selecione um dos feitiços acima para conjurar os dados...
            </p>
        `;
    });
}


// ==========================================
// 🧠 MEMÓRIA UNIVERSAL DO HISTÓRICO (BACKUP)
// ==========================================
window.dadosBackupAtual = []; 
window.tipoBackupAtual = "";  

// 🛡️ FUNÇÃO BLINDADA DE SEGURANÇA MÁXIMA
function verificarSeEAdmin() {
    // Força a leitura exata, removendo espaços e letras maiúsculas que possam enganar o sistema
    const nivelAtual = String(window.usuarioNivelAtual || "").toLowerCase().trim();
    return (nivelAtual === 'adm' || nivelAtual === 'admin');
}

// ==========================================
// 👥 1. HISTÓRICO DE MEMBROS 
// ==========================================
const btnHistMembros = document.getElementById('btn-hist-membros');
if (btnHistMembros) {
    btnHistMembros.addEventListener('click', async () => {
        [btnHistMembros, document.getElementById('btn-hist-acervo'), document.getElementById('btn-hist-emprestimos')].forEach(b => {
            if(b) { b.style.backgroundColor = 'transparent'; b.style.color = '#8c6d46'; }
        });
        btnHistMembros.style.backgroundColor = '#8c6d46';
        btnHistMembros.style.color = 'white';

        document.getElementById('ferramentas-relatorio').style.display = 'flex';
        containerTabelaRelatorios.innerHTML = '<p style="color: #5c4033; text-align: center; margin-top: 150px; font-style: italic;">⏳ A extrair o registo de membros...</p>';

        try {
            const querySnapshot = await getDocs(collection(db, "usuarios"));
            if (querySnapshot.empty) {
                containerTabelaRelatorios.innerHTML = '<p style="text-align: center; margin-top: 150px;">Nenhum membro encontrado.</p>';
                window.dadosBackupAtual = [];
                return;
            }

            window.tipoBackupAtual = "Membros";
            window.dadosBackupAtual = [];
            
            // Usa a nova blindagem para decidir se mostra o cabeçalho
            const isAdmin = verificarSeEAdmin();
            const cabecalhoAcao = isAdmin ? `<th style="padding: 12px; color: #8B0000; text-align: center;">Ação</th>` : "";

            let tabelaHTML = `<table style="width: 100%; border-collapse: collapse; color: #333; text-align: left; font-size: 0.9rem;">
                <thead><tr style="background-color: rgba(140, 109, 70, 0.2); border-bottom: 2px solid #8B0000;">
                    <th style="padding: 12px; color: #8B0000;">Nome Completo</th><th style="padding: 12px; color: #8B0000;">E-mail (Selo)</th>
                    <th style="padding: 12px; color: #8B0000; text-align: center;">Nível</th><th style="padding: 12px; color: #8B0000; text-align: center;">Status</th>
                    ${cabecalhoAcao}
                </tr></thead><tbody>`;

            querySnapshot.forEach((docSnap) => {
                const dados = docSnap.data();
                const idDoc = docSnap.id;
                const nome = dados.nome || "Anónimo"; const email = dados.email || "Sem e-mail";
                const nivel = (dados.nivel || "aluno").toUpperCase();
                const statusTexto = (dados.bloqueado === true) ? "BLOQUEADO" : "ATIVO";
                const corStatus = (dados.bloqueado === true) ? "#8B0000" : "#2E7D32";

                window.dadosBackupAtual.push({ nome, email, nivel, status: statusTexto });

                const colunaAcao = isAdmin ? `<td style="padding: 10px; text-align: center;"><button onclick="eliminarRegistoTeste('usuarios', '${idDoc}', 'btn-hist-membros')" style="background:none; border:none; cursor:pointer; font-size:1.2rem; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.3)'" onmouseout="this.style.transform='scale(1)'" title="Eliminar Definitivamente">🗑️</button></td>` : "";

                tabelaHTML += `<tr style="border-bottom: 1px dashed rgba(140, 109, 70, 0.3);">
                    <td style="padding: 10px; font-weight: bold;">${nome}</td><td style="padding: 10px; font-style: italic; color: #5c4033;">${email}</td>
                    <td style="padding: 10px; text-align: center;">${nivel}</td><td style="padding: 10px; text-align: center; font-weight: bold; color: ${corStatus};">${statusTexto}</td>
                    ${colunaAcao}
                </tr>`;
            });
            containerTabelaRelatorios.innerHTML = tabelaHTML + `</tbody></table>`;
        } catch (error) { containerTabelaRelatorios.innerHTML = '<p style="color: red; text-align: center;">Erro ao carregar membros.</p>'; }
    });
}

// ==========================================
// 📚 2. HISTÓRICO DE ACERVO
// ==========================================
const btnHistAcervo = document.getElementById('btn-hist-acervo');
if (btnHistAcervo) {
    btnHistAcervo.addEventListener('click', async () => {
        [document.getElementById('btn-hist-membros'), btnHistAcervo, document.getElementById('btn-hist-emprestimos')].forEach(b => {
            if(b) { b.style.backgroundColor = 'transparent'; b.style.color = '#8c6d46'; }
        });
        btnHistAcervo.style.backgroundColor = '#8c6d46';
        btnHistAcervo.style.color = 'white';

        document.getElementById('ferramentas-relatorio').style.display = 'flex';
        containerTabelaRelatorios.innerHTML = '<p style="color: #5c4033; text-align: center; margin-top: 150px; font-style: italic;">⏳ A abrir os cofres da biblioteca...</p>';

        try {
            const querySnapshot = await getDocs(collection(db, "livros"));
            if (querySnapshot.empty) {
                containerTabelaRelatorios.innerHTML = '<p style="text-align: center; margin-top: 150px;">Nenhuma obra encontrada.</p>';
                window.dadosBackupAtual = [];
                return;
            }

            window.tipoBackupAtual = "Acervo";
            window.dadosBackupAtual = [];
            
            const isAdmin = verificarSeEAdmin();
            const cabecalhoAcao = isAdmin ? `<th style="padding: 12px; color: #8B0000; text-align: center;">Ação</th>` : "";

            let tabelaHTML = `<table style="width: 100%; border-collapse: collapse; color: #333; text-align: left; font-size: 0.9rem;">
                <thead><tr style="background-color: rgba(140, 109, 70, 0.2); border-bottom: 2px solid #8B0000;">
                    <th style="padding: 12px; color: #8B0000;">Código</th><th style="padding: 12px; color: #8B0000;">Título da Obra</th>
                    <th style="padding: 12px; color: #8B0000;">Autor / Sábio</th><th style="padding: 12px; color: #8B0000;">Categoria</th>
                    ${cabecalhoAcao}
                </tr></thead><tbody>`;

            querySnapshot.forEach((docSnap) => {
                const dados = docSnap.data();
                const idDoc = docSnap.id;
                const codigo = dados.codigo || "0000"; const titulo = dados.titulo || "Desconhecido";
                const autor = dados.autor || "Desconhecido"; const categoria = dados.categoria || "Geral";

                window.dadosBackupAtual.push({ codigo, titulo, autor, categoria });

                const colunaAcao = isAdmin ? `<td style="padding: 10px; text-align: center;"><button onclick="eliminarRegistoTeste('livros', '${idDoc}', 'btn-hist-acervo')" style="background:none; border:none; cursor:pointer; font-size:1.2rem; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.3)'" onmouseout="this.style.transform='scale(1)'" title="Eliminar Definitivamente">🗑️</button></td>` : "";

                tabelaHTML += `<tr style="border-bottom: 1px dashed rgba(140, 109, 70, 0.3);">
                    <td style="padding: 10px; font-weight: bold; color: #8B0000;">${codigo}</td><td style="padding: 10px; font-weight: bold;">${titulo}</td>
                    <td style="padding: 10px; font-style: italic; color: #5c4033;">${autor}</td><td style="padding: 10px;">${categoria}</td>
                    ${colunaAcao}
                </tr>`;
            });
            containerTabelaRelatorios.innerHTML = tabelaHTML + `</tbody></table>`;
        } catch (error) { containerTabelaRelatorios.innerHTML = '<p style="color: red; text-align: center;">Erro ao carregar acervo.</p>'; }
    });
}

// ==========================================
// ⏳ 3. HISTÓRICO DE EMPRÉSTIMOS
// ==========================================
const btnHistEmprestimos = document.getElementById('btn-hist-emprestimos');
if (btnHistEmprestimos) {
    btnHistEmprestimos.addEventListener('click', async () => {
        [document.getElementById('btn-hist-membros'), document.getElementById('btn-hist-acervo'), btnHistEmprestimos].forEach(b => {
            if(b) { b.style.backgroundColor = 'transparent'; b.style.color = '#8c6d46'; }
        });
        btnHistEmprestimos.style.backgroundColor = '#8c6d46';
        btnHistEmprestimos.style.color = 'white';

        document.getElementById('ferramentas-relatorio').style.display = 'flex';
        containerTabelaRelatorios.innerHTML = '<p style="color: #5c4033; text-align: center; margin-top: 150px; font-style: italic;">⏳ A abrir os contratos antigos...</p>';

        try {
            const querySnapshot = await getDocs(collection(db, "emprestimos"));
            if (querySnapshot.empty) {
                containerTabelaRelatorios.innerHTML = '<p style="text-align: center; margin-top: 150px;">Nenhum registo de empréstimo encontrado.</p>';
                window.dadosBackupAtual = [];
                return;
            }

            window.tipoBackupAtual = "Emprestimos";
            window.dadosBackupAtual = [];
            
            const isAdmin = verificarSeEAdmin();
            const cabecalhoAcao = isAdmin ? `<th style="padding: 12px; color: #8B0000; text-align: center;">Ação</th>` : "";

            let tabelaHTML = `<table style="width: 100%; border-collapse: collapse; color: #333; text-align: left; font-size: 0.9rem;">
                <thead><tr style="background-color: rgba(140, 109, 70, 0.2); border-bottom: 2px solid #8B0000;">
                    <th style="padding: 12px; color: #8B0000;">Obra Emprestada</th><th style="padding: 12px; color: #8B0000;">Estudante (Selo)</th>
                    <th style="padding: 12px; color: #8B0000; text-align: center;">Data de Saída</th><th style="padding: 12px; color: #8B0000; text-align: center;">Data de Retorno</th>
                    ${cabecalhoAcao}
                </tr></thead><tbody>`;

            querySnapshot.forEach((docSnap) => {
                const dados = docSnap.data();
                const idDoc = docSnap.id;
                const titulo = dados.tituloLivro || "Desconhecido";
                const aluno = dados.nomeAluno || dados.alunoEmail || "Anónimo";
                
                let dataSaida = "Sem registo";
                if (dados.dataSolicitacao) {
                    const d = new Date(dados.dataSolicitacao);
                    dataSaida = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2, '0')}/${d.getFullYear()}`;
                }

                let dataRetorno = "⏳ Pendente";
                if (dados.devolvido && dados.dataDevolucaoReal) {
                    const d = new Date(dados.dataDevolucaoReal);
                    dataRetorno = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2, '0')}/${d.getFullYear()}`;
                } else if (dados.devolvido) {
                    dataRetorno = "✅ Devolvido"; 
                }

                window.dadosBackupAtual.push({ titulo, aluno, dataSaida, dataRetorno });

                const colunaAcao = isAdmin ? `<td style="padding: 10px; text-align: center;"><button onclick="eliminarRegistoTeste('emprestimos', '${idDoc}', 'btn-hist-emprestimos')" style="background:none; border:none; cursor:pointer; font-size:1.2rem; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.3)'" onmouseout="this.style.transform='scale(1)'" title="Eliminar Definitivamente">🗑️</button></td>` : "";

                tabelaHTML += `<tr style="border-bottom: 1px dashed rgba(140, 109, 70, 0.3);">
                    <td style="padding: 10px; font-weight: bold; color: #8B0000;">${titulo}</td><td style="padding: 10px; font-style: italic; color: #5c4033;">${aluno}</td>
                    <td style="padding: 10px; text-align: center;">${dataSaida}</td><td style="padding: 10px; text-align: center; font-weight: bold;">${dataRetorno}</td>
                    ${colunaAcao}
                </tr>`;
            });
            containerTabelaRelatorios.innerHTML = tabelaHTML + `</tbody></table>`;
        } catch (error) { containerTabelaRelatorios.innerHTML = '<p style="color: red; text-align: center;">Erro ao carregar empréstimos.</p>'; }
    });
}

// ==========================================
// 💾 4. FUNÇÃO UNIVERSAL DE EXPORTAR (EXCEL)
// ==========================================
const btnExportarPlanilha = document.getElementById('btn-exportar-planilha');
if (btnExportarPlanilha) {
    const novoBtnExportar = btnExportarPlanilha.cloneNode(true);
    btnExportarPlanilha.parentNode.replaceChild(novoBtnExportar, btnExportarPlanilha);

    novoBtnExportar.addEventListener('click', () => {
        if (window.dadosBackupAtual.length === 0) return alert("⚠️ Nenhuns dados carregados para exportar!");

        let csvContent = "\uFEFF"; 
        let nomeFicheiro = "backup_sistema.csv";

        if (window.tipoBackupAtual === "Membros") {
            nomeFicheiro = "backup_membros_objetivo.csv";
            csvContent += "Nome Completo;E-mail (Selo);Nível;Status do Sistema\n";
            window.dadosBackupAtual.forEach(row => { csvContent += `"${row.nome}";"${row.email}";"${row.nivel}";"${row.status}"\n`; });
        } 
        else if (window.tipoBackupAtual === "Acervo") {
            nomeFicheiro = "backup_acervo_objetivo.csv";
            csvContent += "Código;Título da Obra;Autor / Sábio;Categoria\n";
            window.dadosBackupAtual.forEach(row => { csvContent += `"${row.codigo}";"${row.titulo}";"${row.autor}";"${row.categoria}"\n`; });
        }
        else if (window.tipoBackupAtual === "Emprestimos") {
            nomeFicheiro = "backup_emprestimos_objetivo.csv";
            csvContent += "Obra Emprestada;Estudante (Selo);Data de Saida;Data de Retorno\n";
            window.dadosBackupAtual.forEach(row => { csvContent += `"${row.titulo}";"${row.aluno}";"${row.dataSaida}";"${row.dataRetorno}"\n`; });
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = nomeFicheiro;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

// ==========================================
// 🗑️ 5. FEITIÇO DE EXCLUSÃO DEFINITIVA (BLINDADO)
// ==========================================
window.eliminarRegistoTeste = async function(colecao, idDoc, idBotaoAtualizar) {
    
    // A barreira final de segurança antes de comunicar com a base de dados
    if (!verificarSeEAdmin()) {
        return alert("⛔ Acesso Negado! Apenas Administradores têm o poder de apagar registos da história.");
    }

    if (confirm("⚠ AVISO MÁXIMO: Tem a certeza absoluta que deseja ELIMINAR PERMANENTEMENTE este registo? Esta magia não tem volta e apagará o ficheiro do cofre!")) {
        try {
            const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            
            await deleteDoc(doc(db, colecao, idDoc));
            alert("🗑️ O registo foi incinerado com sucesso!");
            
            document.getElementById(idBotaoAtualizar).click();
            
        } catch (error) {
            console.error("Erro ao apagar registo:", error);
            alert("❌ As forças das trevas impediram a exclusão deste ficheiro.");
        }
    }
};


// ==========================================
// ⚙️ CONTROLO DA ABA SISTEMA (BACKUPS E LOGS)
// ==========================================
const conteudoSistemaAdmin = document.getElementById('conteudo-sistema-admin');
const mensagemSistemaBloqueado = document.getElementById('mensagem-sistema-bloqueado');
const btnCarregarLogs = document.getElementById('btn-carregar-logs');
const containerLogsSistema = document.getElementById('container-logs-sistema');

const btnFazerBackup = document.getElementById('btn-fazer-backup');
const btnAbrirRestauracao = document.getElementById('btn-abrir-restauracao');
const painelRestauracao = document.getElementById('painel-restauracao');
const listaBackupsServidor = document.getElementById('lista-backups-servidor');

// 1. DESTRANCAR A PORTA (Verificação de Acesso)
if (btnTabConfigSistema) {
    btnTabConfigSistema.addEventListener('click', () => {
        if (typeof verificarSeEAdmin === 'function' && verificarSeEAdmin()) {
            conteudoSistemaAdmin.style.display = 'flex';
            mensagemSistemaBloqueado.style.display = 'none';
        } else {
            conteudoSistemaAdmin.style.display = 'none';
            mensagemSistemaBloqueado.style.display = 'block';
        }
    });
}

// 2. O FEITIÇO DO BACKUP DUPLO (Servidor + Excel)
if (btnFazerBackup) {
    btnFazerBackup.addEventListener('click', async () => {
        const textoOriginal = btnFazerBackup.innerHTML;
        btnFazerBackup.innerHTML = "⏳ A GUARDAR NO COFRE (Aguarde)...";
        btnFazerBackup.disabled = true;

        try {
            // A. LER TUDO DO BANCO DE DADOS
            const snapMembros = await getDocs(collection(db, "usuarios"));
            const snapAcervo = await getDocs(collection(db, "livros"));
            const snapEmprestimos = await getDocs(collection(db, "emprestimos"));

            // B. PREPARAR A CÁPSULA PARA O SERVIDOR
            const backupDados = {
                data: new Date().toISOString(),
                usuarios: [],
                livros: [],
                emprestimos: []
            };

            // C. PREPARAR O EXCEL (CSV)
            let csvContent = "\uFEFF=== BACKUP SUPREMO DO SISTEMA ===\n\n";

            csvContent += "--- 1. MEMBROS ---\nNome;Email;Nivel;Status\n";
            snapMembros.forEach(d => {
                backupDados.usuarios.push({ id: d.id, ...d.data() });
                csvContent += `"${d.data().nome || ''}";"${d.data().email || ''}";"${d.data().nivel || ''}";"${d.data().bloqueado ? 'BLOQUEADO' : 'ATIVO'}"\n`;
            });

            csvContent += "\n--- 2. ACERVO ---\nCodigo;Titulo;Autor;Categoria\n";
            snapAcervo.forEach(d => {
                backupDados.livros.push({ id: d.id, ...d.data() });
                csvContent += `"${d.data().codigo || ''}";"${d.data().titulo || ''}";"${d.data().autor || ''}";"${d.data().categoria || ''}"\n`;
            });

            csvContent += "\n--- 3. EMPRÉSTIMOS ---\nObra;Estudante;DataSaida;Devolvido\n";
            snapEmprestimos.forEach(d => {
                backupDados.emprestimos.push({ id: d.id, ...d.data() });
                let dataS = d.data().dataSolicitacao ? new Date(d.data().dataSolicitacao).toLocaleDateString('pt-BR') : '';
                csvContent += `"${d.data().tituloLivro || ''}";"${d.data().nomeAluno || d.data().alunoEmail || ''}";"${dataS}";"${d.data().devolvido ? 'SIM' : 'NAO'}"\n`;
            });

            // D. GRAVAR NO SERVIDOR FIREBASE
            await addDoc(collection(db, "backups_gerais"), backupDados);
            
            // Regista a ação nos logs
            if (typeof registrarLog === 'function') registrarLog("Gerou um Backup Completo do Sistema (Servidor + Excel).");

            // E. DESCARREGAR EXCEL PARA O COMPUTADOR
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Backup_Sistema_Objetivo_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            alert("✅ MAGIA CONCLUÍDA!\nO Backup foi guardado em segurança no Servidor e o ficheiro Excel foi descarregado.");
        } catch (error) {
            console.error("Erro no Backup Duplo:", error);
            alert("❌ As forças das trevas impediram o backup. Verifique a consola.");
        }

        btnFazerBackup.innerHTML = textoOriginal;
        btnFazerBackup.disabled = false;
    });
}

// 3. ABRIR O PAINEL DE RESTAURAÇÃO
if (btnAbrirRestauracao) {
    btnAbrirRestauracao.addEventListener('click', async () => {
        if (painelRestauracao.style.display === 'block') {
            painelRestauracao.style.display = 'none'; // Esconde se já estiver aberto
            return;
        }
        
        painelRestauracao.style.display = 'block';
        listaBackupsServidor.innerHTML = '<p style="text-align: center; color: #8c6d46; font-style: italic;">⏳ A abrir o cofre do servidor...</p>';

        try {
            const snaps = await getDocs(collection(db, "backups_gerais"));
            if (snaps.empty) {
                listaBackupsServidor.innerHTML = '<p style="text-align: center; color: #8B0000; font-weight: bold;">Nenhum backup encontrado no servidor.</p>';
                return;
            }

            let backups = [];
            snaps.forEach(doc => backups.push({ id: doc.id, ...doc.data() }));
            
            // Ordena para mostrar o mais recente primeiro
            backups.sort((a, b) => new Date(b.data) - new Date(a.data));

            let htmlList = "";
            backups.forEach(b => {
                const dataFormatada = new Date(b.data).toLocaleString('pt-BR');
                // Conta quantos itens têm no backup
                const totalMembros = b.usuarios ? b.usuarios.length : 0;
                const totalLivros = b.livros ? b.livros.length : 0;

                htmlList += `
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(140, 109, 70, 0.4); padding: 8px 0;">
                    <div style="text-align: left;">
                        <span style="color: #5c4033; font-weight: bold; font-size: 0.95rem;">📅 ${dataFormatada}</span><br>
                        <span style="color: #333; font-size: 0.8rem; font-style: italic;">${totalLivros} Livros | ${totalMembros} Membros</span>
                    </div>
                    <button onclick="executarRestauracaoSuprema('${b.id}')" style="padding: 6px 12px; background-color: #8B0000; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.8rem; transition: 0.2s;" onmouseover="this.style.backgroundColor='#5a0000'" onmouseout="this.style.backgroundColor='#8B0000'">
                        ⚠️ RESTAURAR
                    </button>
                </div>`;
            });
            listaBackupsServidor.innerHTML = htmlList;

        } catch (error) {
            listaBackupsServidor.innerHTML = '<p style="color: red; text-align: center;">Erro ao ler o cofre.</p>';
        }
    });
}

// 4. O FEITIÇO MÁXIMO DE RESTAURAÇÃO DE SISTEMA
window.executarRestauracaoSuprema = async function(backupId) {
    if (!confirm("⚠️ PERIGO MÁXIMO!\n\nEsta magia apagará todos os registos atuais e reconstruirá o sistema exatamente como estava nesta data.\n\nTem a certeza ABSOLUTA que deseja prosseguir?")) return;

    try {
        // Importa as ferramentas cirúrgicas do Firebase
        const { doc, getDoc, getDocs, collection, deleteDoc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        
        alert("⏳ A INICIAR A RESTAURAÇÃO!\nPor favor, NÃO FECHE a página nem clique em mais nada até aparecer a mensagem de sucesso.");

        // 1. Ir buscar a "fotografia" do backup
        const docBackup = await getDoc(doc(db, "backups_gerais", backupId));
        if (!docBackup.exists()) {
            return alert("❌ Backup não encontrado!");
        }
        const dadosBackup = docBackup.data();

        // 2. Função para apagar tudo de uma coleção atual
        const limparColecaoAtual = async (nomeCol) => {
            const snaps = await getDocs(collection(db, nomeCol));
            for (let d of snaps.docs) {
                await deleteDoc(doc(db, nomeCol, d.id));
            }
        };

        // 3. Função para reconstruir os dados preservando os IDs originais
        const reconstruirColecao = async (nomeCol, arrayDados) => {
            if (!arrayDados) return;
            for (let item of arrayDados) {
                const idOriginal = item.id;
                const dadosParaGravar = { ...item };
                delete dadosParaGravar.id; // Remove a chave ID de dentro dos dados
                await setDoc(doc(db, nomeCol, idOriginal), dadosParaGravar);
            }
        };

        // EXECUÇÃO: Limpa o presente e reconstrói o passado!
        await limparColecaoAtual("usuarios");
        await limparColecaoAtual("livros");
        await limparColecaoAtual("emprestimos");

        await reconstruirColecao("usuarios", dadosBackup.usuarios);
        await reconstruirColecao("livros", dadosBackup.livros);
        await reconstruirColecao("emprestimos", dadosBackup.emprestimos);

        if (typeof registrarLog === 'function') registrarLog(`Usou a Joia do Tempo: Restaurou o sistema para a versão de ${new Date(dadosBackup.data).toLocaleString('pt-BR')}`);

        alert("✨ RESTAURAÇÃO SUPREMA CONCLUÍDA COM SUCESSO!\n\nO sistema regressou no tempo. A página vai ser reiniciada agora.");
        window.location.reload();

    } catch (error) {
        console.error("Erro crítico na restauração:", error);
        alert("❌ As forças das trevas causaram um erro fatal na restauração. Consulte a consola (F12).");
    }
};

// ==========================================
// 5. LEITOR E ESCRITOR DO REGISTO DE ATIVIDADES (LOGS)
// ==========================================
const btnLimparLogs = document.getElementById('btn-limpar-logs');

// A. LER OS LOGS
if (btnCarregarLogs) {
    btnCarregarLogs.addEventListener('click', async () => {
        containerLogsSistema.innerHTML = '<p style="text-align:center; color: #8c6d46; font-style: italic; margin-top: 50px;">⏳ A ler os pergaminhos de atividade...</p>';
        try {
            const snapLogs = await getDocs(collection(db, "logs"));
            if (snapLogs.empty) {
                containerLogsSistema.innerHTML = '<p style="text-align:center; color: #5c4033; font-style: italic; margin-top: 50px;">Nenhuma atividade mágica foi registada ainda.</p>';
                return;
            }

            let logsArray = [];
            snapLogs.forEach(doc => logsArray.push(doc.data()));
            logsArray.sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));
            
            const ultimos100 = logsArray.slice(0, 100);
            let htmlLogs = "";
            ultimos100.forEach(log => {
                const dataFormatada = new Date(log.dataHora).toLocaleString('pt-BR');
                htmlLogs += `
                    <div style="border-bottom: 1px dashed rgba(140, 109, 70, 0.3); padding: 8px 0; margin-bottom: 4px;">
                        <span style="color: #8B0000; font-weight: bold; font-size: 0.8rem;">[${dataFormatada}]</span> 
                        <span style="color: #2E7D32; font-weight: bold; font-size: 0.85rem;">${log.usuario}</span> » 
                        <span style="color: #333; font-size: 0.9rem;">${log.acao}</span>
                    </div>`;
            });
            containerLogsSistema.innerHTML = htmlLogs;
        } catch (error) {
            containerLogsSistema.innerHTML = '<p style="color:red; text-align:center; margin-top: 50px;">Erro ao ler os pergaminhos.</p>';
        }
    });
}

// B. LIMPAR (INCINERAR) OS LOGS
if (btnLimparLogs) {
    btnLimparLogs.addEventListener('click', async () => {
        if (!verificarSeEAdmin()) {
            return alert("⛔ Acesso Negado! Apenas Administradores podem apagar os registos históricos.");
        }

        if (confirm("⚠️️ AVISO MÁXIMO:\n\nTem a certeza absoluta que deseja APAGAR TODOS os registos de atividade (Logs)?\nEsta ação não pode ser desfeita!")) {
            try {
                const textoBtnOriginal = btnLimparLogs.innerHTML;
                btnLimparLogs.innerHTML = "⏳ A incinerar...";
                btnLimparLogs.disabled = true;

                const { doc, getDocs, collection, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
                const snapLogs = await getDocs(collection(db, "logs"));
                
                if (snapLogs.empty) {
                    alert("📜 O pergaminho já está vazio!");
                    btnLimparLogs.innerHTML = textoBtnOriginal;
                    btnLimparLogs.disabled = false;
                    return;
                }

                // Varre a coleção e apaga um por um
                for (let d of snapLogs.docs) {
                    await deleteDoc(doc(db, "logs", d.id));
                }

                containerLogsSistema.innerHTML = '<p style="text-align:center; color: #5c4033; font-style: italic; margin-top: 50px;">✨ Todos os registos foram limpos com sucesso!</p>';
                alert("🗑️️ Os registos de testes foram totalmente incinerados!");

                btnLimparLogs.innerHTML = textoBtnOriginal;
                btnLimparLogs.disabled = false;

            } catch (error) {
                console.error("Erro ao limpar logs:", error);
                alert("❌ As forças das trevas impediram a limpeza.");
                btnLimparLogs.innerHTML = "🗑️ Limpar";
                btnLimparLogs.disabled = false;
            }
        }
    });
}

// C. ESCREVER NOVOS LOGS AUTOMATICAMENTE
window.registrarLog = async function(acaoDetalhada) {
    try {
        let usuarioAtual = "Sistema (Desconhecido)";
        
        if (window.gestorOficialLogado) {
            usuarioAtual = window.gestorOficialLogado;
        } else if (auth.currentUser && auth.currentUser.email) {
            usuarioAtual = auth.currentUser.email;
        } else if (window.usuarioLogadoEmail) {
            usuarioAtual = window.usuarioLogadoEmail;
        }

        await addDoc(collection(db, "logs"), {
            usuario: usuarioAtual,
            acao: acaoDetalhada,
            dataHora: new Date().toISOString()
        });
    } catch (error) {
        console.error("Erro silencioso ao gravar log:", error);
    }
};


// ==========================================
// 🏆 PÓDIO DOS MAIORES LEITORES E CERTIFICADOS
// ==========================================
window.carregarTopLeitores = async function() {
    const container = document.getElementById('podio-leitores-container');
    if(!container) return;
    
    container.innerHTML = '<p style="color: #8c6d46; font-style: italic; margin-top: 50px;">⏳ Invocando os registos mágicos de leitura...</p>';
    
    try {
        const querySnapshot = await getDocs(collection(db, "emprestimos"));
        const leituras = {};
        const nomes = {};
        
        querySnapshot.forEach(doc => {
            const emp = doc.data();
            // 1️⃣ A MAGIA DA TEMPORADA: Conta APENAS os livros que NÃO estão marcados como encerrados!
            if (emp.status !== "rejeitado" && emp.alunoEmail && emp.temporadaEncerrada !== true) {
                const email = emp.alunoEmail.toLowerCase();
                leituras[email] = (leituras[email] || 0) + 1;
                nomes[email] = typeof capitalizar === 'function' ? capitalizar(emp.nomeAluno || email.split('@')[0]) : (emp.nomeAluno || email.split('@')[0]);
            }
        });
        
        const ranking = Object.keys(leituras).map(email => {
            return { email: email, nome: nomes[email], total: leituras[email] };
        }).sort((a, b) => b.total - a.total);
        
        // 2️⃣ CONTROLO DO PAINEL: Mostrar apenas para a Gestão
        const painelGestao = document.getElementById('painel-gestao-temporada');
        const nivel = window.usuarioNivelAtual ? String(window.usuarioNivelAtual).toLowerCase().trim() : "aluno";
        const ehGestao = (nivel === "adm" || nivel === "admin" || nivel === "gestao" || nivel === "gestão" || nivel === "direcao" || nivel === "direção");
        
        if (painelGestao) {
            painelGestao.style.display = ehGestao ? 'block' : 'none';
        }
        
        if (ranking.length === 0) {
            container.innerHTML = '<p style="color: #8B0000; margin-top: 50px; font-weight: bold;">Ainda não há registros suficientes neste ciclo.</p>';
            if (ehGestao) document.getElementById('status-confirmacoes-podio').innerHTML = "<em style='color: #666;'>Nenhum aluno no pódio atual.</em>";
            return;
        }
        
        // 3️⃣ Desenha o Pódio
        const top3 = ranking.slice(0, 3);
        let htmlPodio = "";
        
        if (top3[1]) htmlPodio += criarPilarPodio(top3[1], 2, "🥈", "#C0C0C0", "80px");
        if (top3[0]) htmlPodio += criarPilarPodio(top3[0], 1, "🥇", "#FFD700", "120px");
        if (top3[2]) htmlPodio += criarPilarPodio(top3[2], 3, "🥉", "#cd7f32", "50px");
        
        container.innerHTML = htmlPodio;
        
        // 4️⃣ MEMÓRIA DA TEMPORADA: Guarda quem são os vencedores para o botão "Anunciar" usar!
        if (ehGestao) {
            window.top3TemporadaAtual = top3;
            // Opcional: Aqui poderíamos ir ao banco ver se já foram anunciados (vamos fazer no Passo 3)
            document.getElementById('status-confirmacoes-podio').innerHTML = "<em style='color: #8c6d46;'>Pronto para disparar! Clique em 'Anunciar Vencedores' para notificar os alunos.</em>";
        }
        
    } catch (error) {
        console.error("Erro ao carregar top leitores:", error);
        container.innerHTML = '<p style="color: red; margin-top: 50px;">❌ Falha ao invocar os oráculos.</p>';
    }
};




function criarPilarPodio(aluno, posicao, medalha, corOuro, altura) {
    const nomeFmt = typeof capitalizar === 'function' ? capitalizar(aluno.nome) : aluno.nome;
    // Lógica mágica do Português: Singular ou Plural!
    const textoObra = aluno.total === 1 ? "Obra" : "Obras"; 
    
    return `
        <div style="display: flex; flex-direction: column; align-items: center; width: 120px; margin: 0 5px;">
            <div style="font-size: 2rem; margin-bottom: 0px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">${medalha}</div>
            <strong style="color: #333; font-size: 0.95rem; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; margin-bottom: 0px;" title="${nomeFmt}">${nomeFmt}</strong>
            <span style="color: #8B0000; font-weight: bold; font-size: 0.85rem; margin-bottom: 3px;">${aluno.total} ${textoObra}</span>
            
            <div style="background: linear-gradient(180deg, ${corOuro} 0%, rgba(0,0,0,0.85) 100%); width: 100%; height: ${altura}; border-radius: 8px 8px 0 0; display: flex; justify-content: center; align-items: flex-start; padding-top: 5px; border: 2px solid ${corOuro}; border-bottom: none; box-shadow: 0 -4px 10px rgba(0,0,0,0.3);">
                <span style="color: white; font-size: 1.6rem; font-weight: bold; text-shadow: 0 2px 5px rgba(0,0,0,0.9);">${posicao}º</span>
            </div>
            
            <button onclick="emitirCertificadoMagico('${aluno.nome}', ${posicao}, ${aluno.total})" style="margin-top: 5px; background-color: ${corOuro}; color: #333; font-weight: bold; border: 1px solid #333; padding: 4px 5px; border-radius: 6px; cursor: pointer; width: 100%; font-size: 0.8rem; box-shadow: 0 4px 6px rgba(0,0,0,0.3); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                📜 Diploma
            </button>
        </div>
    `;
}




// ==========================================
// O Gerador Épico de Diplomas para Impressão (COM PONTE PARA O LOG)
// ==========================================
window.emitirCertificadoMagico = function(nome, posicao, total) {
    
    // 🌉 PONTE MÁGICA: Pegamos a função de Log do sistema e "colamos" na vitrine da aba principal
    // para que a nova aba do Certificado consiga enxergar e chamar!
    if (typeof registrarLog === 'function') {
        window.logDoCertificado = registrarLog;
    }

    const titulos = { 1: "Grão-Mestre da Leitura", 2: "Sábio de Prata", 3: "Guardião de Bronze" };
    const cores = { 1: "#FFD700", 2: "#C0C0C0", 3: "#cd7f32" };
    
    // Lógica mágica do Português: Singular ou Plural para o texto do diploma!
    const textoObrasLiterarias = total === 1 ? "obra literária" : "obras literárias";

    const janelaTexto = `
        <html>
        <head>
            <title>Certificado de Honra - ${nome}</title>
            <style>
                body { margin: 0; padding: 15px; background-color: #5c4033; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'Georgia', serif; }
                .certificado { background-color: #fdf5e6; width: 680px; padding: 50px 30px; border: 10px solid ${cores[posicao]}; border-radius: 12px; text-align: center; box-shadow: inset 0 0 30px rgba(0,0,0,0.1), 0 0 20px rgba(0,0,0,0.6); position: relative; }
                .certificado::before { content: ''; position: absolute; top: 8px; left: 8px; right: 8px; bottom: 8px; border: 2px dashed ${cores[posicao]}; pointer-events: none; }
                h1 { color: #8B0000; font-size: 2.4rem; margin-top: 10px; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 2px; border-bottom: 2px solid ${cores[posicao]}; display: inline-block; padding-bottom: 5px; }
                h2 { color: #5c4033; font-size: 1.4rem; margin: 20px 0; font-style: italic; }
                p { font-size: 1.15rem; color: #333; line-height: 1.6; margin: 20px 25px; }
                .nome-aluno { font-size: 2.2rem; color: #8c6d46; font-weight: bold; margin: 25px 0; text-transform: capitalize; text-shadow: 1px 1px 2px rgba(0,0,0,0.1); }
                .rodape { margin-top: 50px; margin-bottom: 10px; display: flex; justify-content: space-around; align-items: center; }
                .assinatura { font-size: 1rem; color: #5c4033; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
                .selo { width: 80px; height: 80px; background-color: ${cores[posicao]}; border-radius: 50%; border: 2px dashed #8B0000; display: flex; justify-content: center; align-items: center; color: #8B0000; font-weight: bold; font-size: 1rem; transform: rotate(-15deg); box-shadow: 3px 3px 10px rgba(0,0,0,0.4); text-align: center; line-height: 1.2; }
                @media print { 
                    body { background-color: white; padding: 0; } 
                    .btn-imprimir { display: none !important; } 
                    .certificado { box-shadow: none; width: 100%; border: 8px solid ${cores[posicao]}; margin: 0 auto; }
                }
            </style>
        </head>
        <body>
            <div class="certificado">
                <h1>Certificado de Honra</h1>
                <h2>Condecoração: ${titulos[posicao]}</h2>
                <p>O <strong>Colégio Objetivo RE</strong> certifica e reconhece solenemente o esforço, a dedicação e o amor pelas letras demonstrados pelo(a) aluno(a):</p>
                <div class="nome-aluno">${nome.toLowerCase()}</div>
                <p>Por ter conquistado o brilhante <strong>${posicao}º Lugar</strong> no Ranking Geral, devorando o incrível total de <strong>${total} ${textoObrasLiterarias}</strong> dos nossos arquivos mágicos.</p>
                <div class="rodape">
                    <div class="assinatura">Direção Escolar</div>
                    <div class="selo">TOP<br>${posicao}</div>
                    <div class="assinatura">Gestão da<br>Biblioteca</div>
                </div>
                
                <!-- Agora o botão usa a Ponte Mágica (logDoCertificado) para falar com a aba principal -->
                <button class="btn-imprimir" onclick="
                    try { 
                        if (window.opener && window.opener.logDoCertificado) { 
                            window.opener.logDoCertificado('Imprimiu o Certificado de Honra (${posicao}º Lugar) do aluno: ${nome}'); 
                        } 
                    } catch(e) { console.error('Erro na ponte do Log:', e); } 
                    window.print();
                " style="margin-top: 30px; padding: 8px 18px; font-size: 0.95rem; cursor: pointer; background: #5c4033; color: white; border: none; border-radius: 6px; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.3); transition: 0.2s;" onmouseover="this.style.background='#3e2a20'" onmouseout="this.style.background='#5c4033'">🖨️ Imprimir Diploma Oficial</button>
            </div>
        </body>
        </html>
    `;
    
    const novaJanela = window.open("", "_blank");
    novaJanela.document.write(janelaTexto);
    novaJanela.document.close();
};


// ==========================================
// 💾 GERENCIADOR DE BACKUP DE LOGS
// ==========================================
const btnSalvarLogs = document.getElementById('btn-salvar-logs');
const containerLogs = document.getElementById('container-logs-sistema');

if (btnSalvarLogs && containerLogs) {
    // 1. Feitiço para baixar o ficheiro TXT
    btnSalvarLogs.addEventListener('click', () => {
        // Pega todos os textos de logs que estão na tela (ignorando o HTML de enfeite)
        const textoLogs = containerLogs.innerText || containerLogs.textContent;
        
        if (textoLogs.includes('Clique em "Atualizar"') || textoLogs.trim() === "") {
            return alert("⚠️ Não há registos na tela para salvar. Clique em Atualizar primeiro.");
        }

        const dataHoje = new Date();
        const dataFormatada = `${dataHoje.getFullYear()}-${String(dataHoje.getMonth() + 1).padStart(2, '0')}-${String(dataHoje.getDate()).padStart(2, '0')}`;
        
        // Cria o ficheiro de texto
        const blob = new Blob(["=== BACKUP DE AUDITORIA: OBJETIVO RE ===\n\n" + textoLogs], { type: "text/plain;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Backup-Auditoria-${dataFormatada}.txt`;
        link.click();
        
        // Remove a classe de piscar caso estivesse ativa, já que agora está salvo
        btnSalvarLogs.classList.remove('piscar-salvar');
        URL.revokeObjectURL(link.href);
        
        alert("✅ Backup dos logs baixado com sucesso! Pode limpar o sistema com segurança.");
    });

    // 2. Olho Mágico (MutationObserver) para vigiar quando a caixa enche!
    // Sempre que os logs atualizarem, ele conta se tem mais de 90 e faz o botão piscar
    const vigiaDeLogs = new MutationObserver(() => {
        // Conta quantas divs ou linhas (logs) existem dentro do container
        const quantidadeDeLogs = containerLogs.querySelectorAll('div').length || containerLogs.innerText.split('\n').filter(linha => linha.trim().length > 10).length;
        
        // Se estiver perto do limite (90 ou mais), ativa o pisca!
        if (quantidadeDeLogs >= 10) {
            btnSalvarLogs.classList.add('piscar-salvar');
            btnSalvarLogs.title = "⚠️ ATENÇÃO: Limite próximo (90+ logs). Faça backup!";
        } else {
            btnSalvarLogs.classList.remove('piscar-salvar');
            btnSalvarLogs.title = "Baixar histórico para o computador";
        }
    });

    // Avisa o Vigia para ficar olhando tudo o que muda no container de logs
    vigiaDeLogs.observe(containerLogs, { childList: true, subtree: true, characterData: true });
}


// ==========================================
// 🤫 FUNÇÕES PARA OCULTAR OS AVISOS DO PÓDIO
// ==========================================
window.ocultarAvisoPodioGestao = function(dataStr) {
    // Guarda na memória que a gestão já viu o pódio hoje
    localStorage.setItem('gestao_podio_oculto_' + dataStr, 'true');
    document.getElementById('modal-alertas-aluno').style.display = 'none';
    
    // Atualiza os alertas (para mostrar só os pedidos pendentes, se houver)
    const nivelLimpo = window.usuarioNivelAtual ? String(window.usuarioNivelAtual).toLowerCase().trim() : "gestao";
    verificarAlertas(auth.currentUser.email, nivelLimpo);
};

window.ocultarAvisoPodioAluno = function(email, totalObras) {
    // Guarda na memória que o aluno já viu que ganhou com X obras
    localStorage.setItem('aluno_podio_oculto_' + email, totalObras);
    document.getElementById('modal-alertas-aluno').style.display = 'none';
    
    // Atualiza os alertas (para mostrar atrasos ou pendências normais)
    const nivelLimpo = window.usuarioNivelAtual ? String(window.usuarioNivelAtual).toLowerCase().trim() : "aluno";
    verificarAlertas(auth.currentUser.email, nivelLimpo);
};


// ==========================================
// ⚙️ COMANDOS DA TEMPORADA (SÓ PARA GESTÃO)
// ==========================================

// 1. Botão "Anunciar Vencedores"
window.dispararCorujasDeOuro = async function() {
    const top3 = window.top3TemporadaAtual;
    if (!top3 || top3.length === 0) {
        alert("⚠️ O pódio ainda está vazio! Os alunos precisam ler obras nesta temporada para serem anunciados.");
        return;
    }

    const confirmacao = confirm(`Deseja enviar as Corujas de Ouro oficiais para os ${top3.length} líderes atuais?`);
    if (!confirmacao) return;

    document.getElementById('status-confirmacoes-podio').innerHTML = "<em style='color: #8c6d46;'>A enviar corujas pelas chaminés... 🦉✉️</em>";

    try {
        // Envia as "cartas" gravando na coleção temporária "podio_ativo"
        for (let i = 0; i < top3.length; i++) {
            const aluno = top3[i];
            const email = aluno.email;
            await setDoc(doc(db, "podio_ativo", email), {
                nome: aluno.nome,
                posicao: i + 1,
                total: aluno.total,
                statusConfirmacao: "aguardando_visualizacao"
            });
        }
        
        alert("✅ Corujas enviadas com sucesso! O painel será atualizado.");
        
        if (typeof registrarLog === 'function') {
            registrarLog(`Anunciou os Vencedores da Temporada: 1º ${top3[0]?.nome || ''}`);
        }
        
        atualizarStatusConfirmacoes(); // Atualiza a tela de quem já viu
        
    } catch (error) {
        console.error("Erro ao enviar corujas:", error);
        alert("❌ Erro ao disparar. (Dica: Certifique-se de que 'setDoc' e 'doc' estão importados no topo do app.js)");
    }
};

// 2. Lê quem já visualizou o aviso
window.atualizarStatusConfirmacoes = async function() {
    const statusDiv = document.getElementById('status-confirmacoes-podio');
    if (!statusDiv) return;

    try {
        const snap = await getDocs(collection(db, "podio_ativo"));
        if (snap.empty) {
            statusDiv.innerHTML = "<em style='color: #666;'>Aguardando o disparo das Corujas...</em>";
            return;
        }

        let htmlStatus = "<strong style='color: #8B0000;'>Status das Entregas (Corujas):</strong><br><br>";
        let alunos = [];
        snap.forEach(d => alunos.push({ email: d.id, ...d.data() }));
        
        // Ordena 1º, 2º e 3º
        alunos.sort((a,b) => a.posicao - b.posicao);

        alunos.forEach(a => {
            const icone = a.statusConfirmacao === "confirmado" ? "✅ Viu e Entendeu" : "⏳ Aguardando Aluno";
            const cor = a.statusConfirmacao === "confirmado" ? "#006400" : "#B8860B";
            htmlStatus += `
                <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #ccc; padding: 6px 0;">
                    <span><strong>${a.posicao}º</strong> ${a.nome}</span>
                    <span style="color: ${cor}; font-weight: bold; font-size: 0.85rem;">${icone}</span>
                </div>`;
        });

        statusDiv.innerHTML = htmlStatus;
    } catch(e) { console.error("Erro ao ler status:", e); }
};

// 3. Botão "Encerrar Temporada"
window.encerrarTemporada = async function() {
    const confirmacao = confirm("⚠️ ATENÇÃO GESTÃO!\n\nTem certeza de que deseja ENCERRAR A TEMPORADA ATUAL?\n\n- O histórico será preservado no banco para sempre.\n- O pódio atual será ZERADO para iniciar uma nova corrida.\n- Esta ação não pode ser desfeita!");
    if (!confirmacao) return;

    document.getElementById('status-confirmacoes-podio').innerHTML = "<em style='color: #8B0000;'>A arquivar os livros no Histórico Eterno... ⏳</em>";

    try {
        // Pega todos os empréstimos e marca como "temporadaEncerrada: true"
        const snapTodos = await getDocs(collection(db, "emprestimos"));
        let atualizados = 0;
        
        for (const documento of snapTodos.docs) {
            const emp = documento.data();
            if (emp.temporadaEncerrada !== true) {
                await updateDoc(doc(db, "emprestimos", documento.id), {
                    temporadaEncerrada: true
                });
                atualizados++;
            }
        }

        // Limpa a tabela de notificações do pódio
        const snapPodio = await getDocs(collection(db, "podio_ativo"));
        for (const pDoc of snapPodio.docs) {
            await deleteDoc(doc(db, "podio_ativo", pDoc.id));
        }

        alert(`🏁 TEMPORADA ENCERRADA COM SUCESSO!\n\n${atualizados} obras foram arquivadas. O pódio foi limpo para a nova corrida!`);
        
        if (typeof registrarLog === 'function') {
            registrarLog(`Encerrou a Temporada. Obras arquivadas no histórico: ${atualizados}`);
        }

        carregarTopLeitores(); // Recarrega (ficará vazio)
        atualizarStatusConfirmacoes(); // Limpa a telinha
        
    } catch (error) {
        console.error("Erro ao encerrar:", error);
        alert("❌ Erro ao encerrar a temporada. (Dica: Certifique-se de que 'updateDoc' e 'deleteDoc' estão importados no topo do app.js)");
    }
};

// Um pequeno truque: Sempre que abrir a tela de Leitores, a Gestão já vê o status atualizado e o Nome do Ciclo!
const antigoCarregarLeitores = window.carregarTopLeitores;
window.carregarTopLeitores = async function() {
    await antigoCarregarLeitores();
    if (typeof atualizarStatusConfirmacoes === 'function') atualizarStatusConfirmacoes();
    if (typeof carregarNomeCiclo === 'function') carregarNomeCiclo(); // 🌟 NOVA LINHA MÁGICA ADICIONADA!
};



// ==========================================
// 📩 CONFIRMAÇÃO DO ALUNO (CORUJA DE OURO)
// ==========================================
window.confirmarLeituraCoruja = async function(email) {
    try {
        // Atualiza a carta no banco de dados avisando a Gestão que o aluno leu!
        await updateDoc(doc(db, "podio_ativo", email), {
            statusConfirmacao: "confirmado"
        });
        
        // Esconde a janela de alertas
        document.getElementById('modal-alertas-aluno').style.display = 'none';
        
        // Atualiza para ver se há outros recados (ex: livros atrasados)
        const nivelLimpo = window.usuarioNivelAtual ? String(window.usuarioNivelAtual).toLowerCase().trim() : "aluno";
        verificarAlertas(email, nivelLimpo);
        
    } catch (error) {
        console.error("Erro ao confirmar leitura:", error);
        alert("❌ Ocorreu um erro ao confirmar. Verifique a conexão.");
    }
};


// ==========================================
// 🏷️ GESTÃO DO NOME DA TEMPORADA (CICLO)
// ==========================================

window.definirPeriodoCiclo = async function() {
    const novoNome = prompt("Digite o nome ou período do novo ciclo mágico:\n(Ex: 4º Bimestre, Temporada de Inverno, Março a Junho/2026)");
    
    if (!novoNome || novoNome.trim() === "") return;

    try {
        // Guarda o nome na coleção "configuracoes" usando o documento "sistema"
        // O { merge: true } garante que não apagamos outras configurações do sistema!
        await setDoc(doc(db, "configuracoes", "sistema"), {
            nomeCicloAtual: novoNome.trim()
        }, { merge: true });

        alert(`✅ O ciclo foi batizado com sucesso como: "${novoNome.trim()}"!`);
        
        if (typeof registrarLog === 'function') {
            registrarLog(`Alterou o nome da temporada para: ${novoNome.trim()}`);
        }

        carregarNomeCiclo(); // Atualiza na tela instantaneamente
        
    } catch (error) {
        console.error("Erro ao nomear ciclo:", error);
        alert("❌ Erro ao guardar o nome. Verifique a sua conexão.");
    }
};

window.carregarNomeCiclo = async function() {
    const spanNome = document.getElementById('nome-ciclo-tela');
    if (!spanNome) return;

    try {
        // Vai buscar o nome oficial ao banco de dados
        const docSnap = await getDoc(doc(db, "configuracoes", "sistema"));
        if (docSnap.exists() && docSnap.data().nomeCicloAtual) {
            spanNome.innerHTML = `⭐ ${docSnap.data().nomeCicloAtual} ⭐`;
        } else {
            spanNome.innerHTML = "⭐ Temporada Atual ⭐"; // Texto padrão
        }
    } catch (error) {
        console.error("Erro ao ler nome do ciclo:", error);
        spanNome.innerHTML = "⭐ Temporada Atual ⭐";
    }
};
