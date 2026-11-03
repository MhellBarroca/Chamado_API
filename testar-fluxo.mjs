// Teste de fluxo da API de chamados. Uso: node testar-fluxo.mjs
// Requer a API rodando em http://localhost:3000 e o seed já executado.
const BASE = process.env.API_URL ?? 'http://localhost:3000';
const sufixo = Date.now();
let ok = 0;
let falhas = 0;

async function req(metodo, caminho, token, corpo) {
  const res = await fetch(BASE + caminho, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  let dados = null;
  try {
    dados = await res.json();
  } catch {}
  return { status: res.status, dados };
}

function checar(nome, condicao, detalhe = '') {
  if (condicao) {
    ok++;
    console.log(`  OK      ${nome}`);
  } else {
    falhas++;
    console.log(`  FALHOU  ${nome} ${detalhe}`);
  }
}

async function login(email, senha) {
  const r = await req('POST', '/auth/login', null, { email, senha });
  return { token: r.dados?.access_token, usuario: r.dados?.usuario, status: r.status };
}

async function main() {
  console.log('\n== Preparação ==');
  const admin = await login('tecnico@empresa.com', 'Trocar@12345');
  checar('login do técnico inicial', admin.status === 200 && !!admin.token);
  if (!admin.token) throw new Error('Sem login do técnico inicial. Rode o seed.');

  const senha = 'Senha@12345';
  const emailTec = `tec${sufixo}@teste.com`;
  const emailSol = `sol${sufixo}@teste.com`;

  const criaTec = await req('POST', '/usuarios/tecnicos', admin.token, { nome: 'Tec Teste', email: emailTec, senha });
  checar('técnico cria outro técnico', criaTec.status === 201 && criaTec.dados?.perfil === 'TECNICO', JSON.stringify(criaTec.dados));

  const criaSol = await req('POST', '/usuarios', null, { nome: 'Sol Teste', email: emailSol, senha });
  checar('cadastro público cria SOLICITANTE', criaSol.status === 201 && criaSol.dados?.perfil === 'SOLICITANTE');

  const dup = await req('POST', '/usuarios', null, { nome: 'Sol Teste', email: emailSol, senha });
  checar('regra 1: e-mail repetido é recusado (409)', dup.status === 409);

  const invalido = await req('POST', '/usuarios', null, { nome: 'X', email: 'nao-e-email', senha });
  checar('regra 1: e-mail inválido é recusado (400)', invalido.status === 400);

  const tec = await login(emailTec, senha);
  const sol = await login(emailSol, senha);
  checar('login do técnico e do solicitante novos', !!tec.token && !!sol.token);

  const tipos = await req('GET', '/tipos-problema', sol.token);
  const tipoId = tipos.dados?.find((t) => t.ativo)?.id;
  checar('lista de tipos de problema disponível', !!tipoId);

  console.log('\n== Abertura de chamado (regras 6 a 11) ==');
  const curto = await req('POST', '/chamados', sol.token, { titulo: 'abc', descricao: 'descrição válida aqui', tipoProblemaId: tipoId });
  checar('regra 10: título curto é recusado', curto.status === 400);

  const descCurta = await req('POST', '/chamados', sol.token, { titulo: 'Título válido', descricao: 'curta', tipoProblemaId: tipoId });
  checar('regra 10: descrição curta é recusada', descCurta.status === 400);

  const prioInv = await req('POST', '/chamados', sol.token, { titulo: 'Título válido', descricao: 'descrição válida aqui', tipoProblemaId: tipoId, prioridade: 'URGENTE' });
  checar('regra 11: prioridade fora da lista é recusada', prioInv.status === 400);

  const tecAbre = await req('POST', '/chamados', tec.token, { titulo: 'Título válido', descricao: 'descrição válida aqui', tipoProblemaId: tipoId });
  checar('regra 9: técnico não abre chamado', tecAbre.status === 403);

  const c = await req('POST', '/chamados', sol.token, { titulo: 'Rede fora do ar', descricao: 'A rede do setor caiu hoje cedo', tipoProblemaId: tipoId });
  checar('chamado criado', c.status === 201, JSON.stringify(c.dados));
  checar('regra 8: nasce ABERTO e sem técnico', c.dados?.status === 'ABERTO' && c.dados?.tecnicoId === null);
  checar('regra 11: prioridade padrão MEDIA', c.dados?.prioridade === 'MEDIA');
  const id = c.dados?.id;

  console.log('\n== Designação e fluxo (regras 12 a 16) ==');
  const iniciar = await req('PATCH', `/chamados/${id}/status`, sol.token, { status: 'EM_ATENDIMENTO' });
  checar('regra 13: não inicia atendimento sem técnico', iniciar.status === 400);

  const solDesigna = await req('PATCH', `/chamados/${id}/designar`, sol.token, { tecnicoId: tec.usuario.id });
  checar('solicitante não designa técnico (403)', solDesigna.status === 403);

  const naoTec = await req('PATCH', `/chamados/${id}/designar`, tec.token, { tecnicoId: sol.usuario.id });
  checar('regra 12: só técnico pode ser designado', naoTec.status === 400);

  const desig = await req('PATCH', `/chamados/${id}/designar`, tec.token, { tecnicoId: tec.usuario.id });
  checar('regra 13: designar inicia atendimento', desig.status === 200 && desig.dados?.status === 'EM_ATENDIMENTO', JSON.stringify(desig.dados));

  const salto = await req('PATCH', `/chamados/${id}/status`, tec.token, { status: 'FECHADO' });
  checar('regra 14: EM_ATENDIMENTO -> FECHADO é proibido', salto.status === 400);

  console.log('\n== Comentários (regras 19 a 21) ==');
  const com = await req('POST', `/chamados/${id}/comentarios`, sol.token, { conteudo: 'Ainda sem rede.' });
  checar('solicitante comenta', com.status === 201);
  const com2 = await req('POST', `/chamados/${id}/comentarios`, tec.token, { conteudo: 'Estou verificando.' });
  checar('técnico responsável comenta', com2.status === 201);

  const vazio = await req('POST', `/chamados/${id}/comentarios`, sol.token, { conteudo: '   ' });
  checar('regra 20: comentário vazio é recusado', vazio.status === 400);

  const outroTecEmail = `tecb${sufixo}@teste.com`;
  await req('POST', '/usuarios/tecnicos', admin.token, { nome: 'Outro Tec', email: outroTecEmail, senha });
  const outro = await login(outroTecEmail, senha);
  const comOutro = await req('POST', `/chamados/${id}/comentarios`, outro.token, { conteudo: 'Posso ajudar?' });
  checar('regra 19: outro técnico não comenta', comOutro.status === 403);

  const edita = await req('PATCH', `/chamados/${id}/comentarios/${com.dados?.id}`, sol.token, { conteudo: 'x' });
  const apaga = await req('DELETE', `/chamados/${id}/comentarios/${com.dados?.id}`, sol.token);
  checar('regra 21: comentário não pode ser editado nem apagado', edita.status === 404 && apaga.status === 404);

  console.log('\n== Resolução e encerramento (regras 14 a 16) ==');
  const resolve = await req('PATCH', `/chamados/${id}/status`, tec.token, { status: 'RESOLVIDO' });
  checar('regra 16: resolvidoEm registrado', resolve.status === 200 && !!resolve.dados?.resolvidoEm);

  const reabre = await req('PATCH', `/chamados/${id}/status`, sol.token, { status: 'EM_ATENDIMENTO' });
  checar('RESOLVIDO -> EM_ATENDIMENTO (problema persiste)', reabre.status === 200);
  await req('PATCH', `/chamados/${id}/status`, tec.token, { status: 'RESOLVIDO' });

  const fecha = await req('PATCH', `/chamados/${id}/status`, sol.token, { status: 'FECHADO' });
  checar('RESOLVIDO -> FECHADO', fecha.status === 200);

  const comFechado = await req('POST', `/chamados/${id}/comentarios`, sol.token, { conteudo: 'Obrigado!' });
  checar('regra 15: chamado fechado não recebe comentário', comFechado.status === 400);

  const editaFechado = await req('PATCH', `/chamados/${id}`, sol.token, { titulo: 'Novo título válido' });
  checar('regra 15: chamado fechado não pode ser alterado', editaFechado.status === 400);

  const voltaFechado = await req('PATCH', `/chamados/${id}/status`, tec.token, { status: 'EM_ATENDIMENTO' });
  checar('regra 14: FECHADO não volta a nenhuma situação', voltaFechado.status === 400);

  const detalhe = await req('GET', `/chamados/${id}`, sol.token);
  checar('chamado traz a conversa completa', detalhe.status === 200 && detalhe.dados?.comentarios?.length === 2);

  console.log('\n== Cancelamento ==');
  const c2 = await req('POST', '/chamados', sol.token, { titulo: 'Impressora travada', descricao: 'Papel preso na impressora', tipoProblemaId: tipoId, prioridade: 'ALTA' });
  const cancela = await req('PATCH', `/chamados/${c2.dados?.id}/status`, sol.token, { status: 'CANCELADO' });
  checar('ABERTO -> CANCELADO', cancela.status === 200);
  const recancela = await req('PATCH', `/chamados/${c2.dados?.id}/status`, sol.token, { status: 'ABERTO' });
  checar('regra 15: cancelado não muda mais', recancela.status === 400);

  console.log('\n== Limite de 5 chamados em atendimento (regra 17) ==');
  const ids = [];
  for (let i = 1; i <= 6; i++) {
    const r = await req('POST', '/chamados', sol.token, { titulo: `Chamado em massa ${i}`, descricao: 'Chamado para testar o limite', tipoProblemaId: tipoId, prioridade: 'CRITICA' });
    ids.push(r.dados?.id);
  }
  const resultados = [];
  for (const cid of ids) {
    const r = await req('PATCH', `/chamados/${cid}/designar`, tec.token, { tecnicoId: tec.usuario.id });
    resultados.push(r.status);
  }
  checar('5 primeiras designações aceitas', resultados.slice(0, 5).every((s) => s === 200), JSON.stringify(resultados));
  checar('6ª designação recusada', resultados[5] === 400, JSON.stringify(resultados));

  console.log('\n== Consulta com filtros ==');
  const filtrado = await req('GET', `/chamados?status=EM_ATENDIMENTO&prioridade=CRITICA&tecnicoId=${tec.usuario.id}`, tec.token);
  checar('filtros por situação, prioridade e técnico', filtrado.status === 200 && filtrado.dados?.length === 5, `retornou ${filtrado.dados?.length}`);
  const porTipo = await req('GET', `/chamados?tipoProblemaId=${tipoId}`, tec.token);
  checar('filtro por tipo de problema', porTipo.status === 200 && porTipo.dados?.length >= 8);
  const minhas = await req('GET', '/chamados', sol.token);
  checar('solicitante só vê os próprios chamados', minhas.status === 200 && minhas.dados?.every((x) => x.solicitanteId === sol.usuario.id));

  console.log('\n== Remoção e desativação (regras 3, 4 e 7) ==');
  const delUsuario = await req('DELETE', `/usuarios/${sol.usuario.id}`, admin.token);
  checar('regra 4: usuário envolvido em chamado não é removido (409)', delUsuario.status === 409);
  const delTipo = await req('DELETE', `/tipos-problema/${tipoId}`, admin.token);
  checar('regra 7: tipo usado em chamado não é removido (409)', delTipo.status === 409);

  const novoTipo = await req('POST', '/tipos-problema', admin.token, { nome: `Tipo ${sufixo}` });
  checar('tipo de problema criado', novoTipo.status === 201);
  const repetido = await req('POST', '/tipos-problema', admin.token, { nome: `Tipo ${sufixo}` });
  checar('regra 5: nome de tipo repetido é recusado (409)', repetido.status === 409);
  await req('PATCH', `/tipos-problema/${novoTipo.dados?.id}/desativar`, admin.token);
  const emDesativado = await req('POST', '/chamados', sol.token, { titulo: 'Tipo desativado', descricao: 'Tentando usar tipo desativado', tipoProblemaId: novoTipo.dados?.id });
  checar('regra 6: não abre chamado em tipo desativado', emDesativado.status === 400);

  await req('PATCH', `/usuarios/${sol.usuario.id}/desativar`, admin.token);
  const inativoAbre = await req('POST', '/chamados', sol.token, { titulo: 'Usuário inativo', descricao: 'Tentando abrir chamado inativo', tipoProblemaId: tipoId });
  checar('regra 3: usuário inativo não abre chamado', inativoAbre.status === 400);
  const loginInativo = await login(emailSol, senha);
  checar('usuário inativo não faz login', loginInativo.status === 401);

  console.log(`\nResumo: ${ok} OK, ${falhas} FALHARAM`);
  process.exitCode = falhas > 0 ? 1 : 0;
}

main().catch((e) => {
  console.error('\nErro ao executar o teste:', e.message);
  process.exitCode = 1;
});
