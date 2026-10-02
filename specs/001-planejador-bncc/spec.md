# Feature Specification: Planejador BNCC

**Feature Branch**: `docs/especificacao`

**Created**: 2026-10-01

**Status**: Draft

**Input**: User description: "Desenvolver o Planejador BNCC para uso de professores. O professor entra com uma conta de demonstração previamente cadastrada. Após o login, consulta habilidades BNCC por nível, ano quando aplicável, eixo, código ou texto e seleciona uma ou mais habilidades. Informa uma instrução pedagógica, duração em minutos e se utilizará recursos digitais. Ao confirmar, visualiza um estado de preparação. O serviço de IA recebe a solicitação. Se a resposta for válida, a aplicação salva um plano privado em estado RASCUNHO, com indicação de auxílio por IA. O professor vê o Markdown, pode editá-lo, visualizar sua apresentação, salvar explicitamente e consultar a lista de seus rascunhos. Se a geração falhar, os campos são preservados e nenhum plano parcial é salvo. Uma nova tentativa é iniciada somente por ação do professor. Outro professor não pode ler nem editar o rascunho. Incluir login, logout, sessão, catálogo mínimo e duas contas de demonstração para testar o acesso privado. Sem cadastro público nem administração. Sem PDF, finalização, versionamento de planos ou publicação pública deles. Defina histórias priorizadas e critérios de aceitação verificáveis. Ainda não implemente código."

## Clarifications

### Session 2026-10-01

- Q: Como o sistema deve responder quando um professor autenticado tentar acessar diretamente pela URL um plano de aula pertencente a outro docente? → A: Retornar código HTTP 404 (Plano não encontrado) e redirecionar para a listagem "Meus planos", obscurecendo a existência do recurso para terceiros e protegendo a privacidade contra enumeração de IDs.
- Q: Como deve ser estruturada a interface de login para o acesso das duas contas de demonstração pré-cadastradas? → A: Disponibilizar botões de acesso rápido com 1 clique para cada conta demo ("Entrar como Profª Ana Souza" e "Entrar como Prof. Carlos Lima") na tela inicial, além de formulário tradicional com campos de e-mail e senha.
- Q: Como deve ser modelada a integração com o serviço de IA para viabilizar testes automatizados determinísticos e execução sem dependência obrigatória de chave externa? → A: Adotar arquitetura de adaptador com suporte a Provedor Simulado (Mock) determinístico para testes automatizados e execução sem credenciais externas, e Provedor Real configurado exclusivamente no backend.
- Q: Ao salvar alterações no rascunho, quais validações mínimas de conteúdo o sistema deve aplicar antes de confirmar a gravação? → A: Exigir apenas que o título do plano e o corpo do texto em Markdown não estejam vazios (desconsiderando espaços em branco), assegurando flexibilidade pedagógica ao professor sem engessar a estrutura interna.
- Q: Como o erro de falha na geração da IA e a ação de nova tentativa manual devem ser apresentados na interface? → A: Exibir banner de alerta semântico de erro no topo do formulário ("Não foi possível gerar - Nenhum plano foi salvo"), preservando 100% dos dados preenchidos e reabilitando o botão de ação para nova tentativa manual.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Autenticação Segura e Isolamento de Sessão Docente (Priority: P1)

Como professor, quero me autenticar no sistema utilizando uma conta de demonstração previamente cadastrada — seja por clique rápido ou inserindo credenciais — para acessar meu espaço exclusivo de trabalho pedagógico e garantir que meus rascunhos fiquem protegidos contra acessos não autorizados.

**Why this priority**: A autenticação é a fundação da privacidade e da autorização em nível de registro (Princípio III da Constituição). Sem controle de sessão, nenhum rascunho pode ser confiavelmente atribuído ou protegido.

**Independent Test**: Pode ser testado de forma autônoma realizando login com as credenciais ou pelo botão de acesso rápido da Conta Demo 1, verificando o estabelecimento da sessão com identificação visual do professor, realizando logout e confirmando o bloqueio de acesso a páginas e rotas autenticadas.

**Acceptance Scenarios**:

1. **Given** que o usuário está na tela de login não autenticado, **When** clica no botão de acesso rápido de uma das contas demo (ex.: "Entrar como Profª Ana Souza") ou insere credenciais válidas e confirma, **Then** o sistema estabelece a sessão ativa, redireciona o professor para o painel principal ("Meus planos") e exibe o nome do docente na barra superior.
2. **Given** que o usuário tenta autenticar-se com credenciais incorretas ou inexistentes, **When** submete o formulário de login, **Then** o sistema rejeita a autenticação, exibe mensagem clara de erro e não cria sessão.
3. **Given** que o professor está autenticado, **When** clica na opção de logout / sair, **Then** a sessão é destruída, dados temporários da sessão são invalidados e o usuário é redirecionado à tela de login.
4. **Given** que um usuário anônimo tenta acessar diretamente qualquer rota ou recurso restrito a professores, **When** faz a requisição, **Then** o acesso é impedido e o usuário é redirecionado à página de login.

---

### User Story 2 - Consulta e Seleção de Habilidades da BNCC (Priority: P2)

Como professor autenticado, quero consultar o catálogo canônico da BNCC aplicando filtros combinados (nível de ensino, ano escolar, eixo/componente, código ou texto da habilidade) e selecionar uma ou mais habilidades para fundamentar meu planejamento pedagógico.

**Why this priority**: A ancoragem em habilidades oficiais da BNCC é o núcleo metodológico da aplicação cívico-educacional; a precisão na busca poupa tempo docente e garante conformidade pedagógica.

**Independent Test**: Pode ser testado de forma independente realizando buscas textuais, filtrando por ano e componente curricular no catálogo mínimo da BNCC, selecionando múltiplos itens e verificando a adição e remoção dinâmica dos chips de habilidades.

**Acceptance Scenarios**:

1. **Given** que o professor acessa a área de criação de plano, **When** aplica filtros por nível de ensino, ano escolar (ex.: 5º ano) ou componente curricular (ex.: Ciências), **Then** a listagem exibe apenas as habilidades da BNCC correspondentes aos critérios selecionados.
2. **Given** que o professor digita um código (ex.: `EF05CI02`) ou termo descritivo no campo de busca, **When** a consulta é processada, **Then** os resultados exibem as habilidades que contenham o termo no código ou na descrição pedagógica.
3. **Given** que habilidades são exibidas na lista de resultados, **When** o professor marca uma ou mais habilidades, **Then** cada item selecionado é apresentado como um chip visual contendo o código da habilidade e um botão de remoção (`x`).
4. **Given** que um ou mais chips de habilidades estão ativos, **When** o professor clica no ícone de remoção (`x`) de um chip específico, **Then** a habilidade correspondente é desmarcada e removida da lista de seleção ativa.

---

### User Story 3 - Geração Assistida por IA com Transação Segura e Estado de Preparação (Priority: P3)

Como professor autenticado, quero informar a duração da aula, orientações pedagógicas complementares e o uso de recursos digitais para gerar um rascunho estruturado por IA, visualizando o estado de preparação e tendo a garantia de que falhas não criarão registros corrompidos nem apagarão minhas entradas.

**Why this priority**: Representa o valor central da ferramenta — assistência por IA com soberania docente. A garantia de atomicidade (Princípio V) protege o docente contra retrabalho e inconsistências na base de dados.

**Independent Test**: Pode ser testado submetendo o formulário de geração com habilidades e parâmetros válidos: durante a espera, verifica-se o estado de carregamento com tempo estimado; ao concluir com sucesso, confirma-se o rascunho salvo com selo "Auxílio por IA"; em simulação de falha da IA, confirma-se que nenhum registro foi criado no banco e os dados preenchidos no formulário continuam disponíveis na tela para nova tentativa manual.

**Acceptance Scenarios**:

1. **Given** que o professor selecionou ao menos uma habilidade, informou a duração da aula em minutos (> 0), sinalizou a opção de recursos digitais e preencheu a instrução pedagógica, **When** clica em "Gerar rascunho", **Then** a interface apresenta imediatamente o estado de preparação com indicador de progresso e aviso de tempo ("Isso pode levar até 60 segundos"), desabilitando novos cliques concorrentes.
2. **Given** que o serviço de IA responde com uma estrutura pedagógica válida dentro do tempo limite, **When** a resposta é recebida, **Then** o sistema persiste o plano com status `RASCUNHO`, marcado com a etiqueta de procedência `Auxílio por IA` e associado exclusivamente ao professor logado, redirecionando-o para a visualização/edição do plano.
3. **Given** que ocorre uma falha na chamada de IA (timeout, erro de serviço ou payload inválido), **When** a exceção é capturada, **Then** o sistema aborta a transação sem gravar nenhum plano parcial ou corrompido no banco de dados, exibe um banner de alerta semântico de erro no topo do formulário ("Não foi possível gerar - Nenhum plano foi salvo") e preserva 100% dos dados preenchidos pelo professor no formulário.
4. **Given** que ocorreu uma falha de geração e o banner de erro foi exibido, **When** o professor analisa a mensagem, **Then** o sistema NÃO realiza nova tentativa automática e reabilita o botão "Gerar rascunho" para que o professor possa acionar uma nova tentativa manual quando desejar.
5. **Given** que o professor tenta acionar a geração com duração inválida (ex.: zero ou campo vazio) ou sem habilidades selecionadas, **When** clica em "Gerar rascunho", **Then** a submissão é bloqueada com indicação visual de validação no campo específico ("Informe uma duração maior que zero") sem acionar a IA.

---

### User Story 4 - Edição em Markdown, Pré-visualização e Persistência Manual do Rascunho (Priority: P4)

Como professor autenticado, quero revisar e editar o conteúdo do plano em Markdown, alternar para uma pré-visualização formatada e salvar explicitamente minhas modificações para manter o controle total do planejamento pedagógico.

**Why this priority**: Consolida o princípio de "Human-in-the-Loop" (Princípio IV da Constituição), assegurando que o professor ajuste o plano à sua realidade de sala de aula e confirme deliberadamente as alterações.

**Independent Test**: Pode ser testado abrindo um rascunho existente, alternando entre as abas "Editor Markdown" e "Pré-visualização", modificando o texto no editor, salvando as alterações e verificando a notificação de confirmação e a persistência dos dados no recarregamento.

**Acceptance Scenarios**:

1. **Given** que o professor está na tela de visualização do rascunho, **When** alterna entre a aba "Editor Markdown" e a aba "Pré-visualização", **Then** o sistema apresenta na aba de edição o texto em Markdown puro editável e na aba de pré-visualização o conteúdo renderizado com estilos tipográficos adequados (títulos, listas, ênfases).
2. **Given** que o professor faz alterações no texto do rascunho com título e corpo não vazios, **When** clica no botão "Salvar", **Then** o sistema grava as atualizações no banco de dados mantendo o status `RASCUNHO`, atualiza o registro de data/hora da última alteração e exibe um toast de confirmação ("Alterações salvas com sucesso.").
3. **Given** que o professor apaga o título ou o corpo do Markdown deixando o campo vazio ou apenas com espaços, **When** tenta clicar em "Salvar", **Then** o sistema impede a gravação, exibe mensagem visual de validação no campo obrigatório e preserva a tela de edição sem alterar o banco de dados.
4. **Given** que o professor realizou alterações no rascunho e ainda não as salvou, **When** tenta navegar para fora da página ou fechar o plano, **Then** o sistema exibe um diálogo modal de confirmação ("Sair sem salvar? As alterações feitas neste rascunho serão perdidas") com as opções "Continuar editando" e "Sair sem salvar".

---

### User Story 5 - Gestão e Acesso Exclusivo à Lista de Rascunhos Docentes (Priority: P5)

Como professor autenticado, quero acessar a listagem de todos os meus rascunhos criados e ter a certeza de que outro professor autenticado não poderá ler, listar nem editar meus planos.

**Why this priority**: Garante o isolamento estrito de dados entre docentes e a privacidade pedagógica (Princípio III da Constituição), viabilizando a validação independente entre as duas contas de demonstração.

**Independent Test**: Pode ser testado autenticando com a Conta Demo 1, criando um rascunho, verificando sua exibição na lista "Meus planos", autenticando subsequentemente com a Conta Demo 2 e conferindo que a lista da Conta Demo 2 não exibe o plano da Conta Demo 1, além de testar que requisições diretas ao identificador do plano por outro professor recebam recusa de acesso (403 ou 404).

**Acceptance Scenarios**:

1. **Given** que o professor autenticado possui rascunhos salvos, **When** acessa a tela "Meus planos", **Then** visualiza a tabela/cards com o título do plano, componente curricular/ano, data/hora da última atualização e o badge de status `RASCUNHO`.
2. **Given** que um professor autenticado não possui nenhum plano criado, **When** acessa "Meus planos", **Then** a interface apresenta um estado vazio amigável ("Nenhum rascunho ainda - Crie seu primeiro plano com habilidades da BNCC") acompanhado de botão de ação para criar um novo plano.
3. **Given** que o Professor 1 criou o rascunho com ID `PLANO-101`, **When** o Professor 2 (autenticado com sua própria conta demo) tenta acessar o detalhe ou editar `PLANO-101` diretamente por URL ou chamada de API, **Then** o sistema nega a operação retornando status HTTP 404 (Não Encontrado) e redireciona o usuário para "Meus planos", obscurecendo a existência do recurso e impedindo a confirmação do ID de outro docente.

---

### Edge Cases

- **Timeout do provedor de IA**: Se a chamada ao serviço de IA ultrapassar o tempo limite estabelecido (60 segundos), a requisição é cancelada, os campos do formulário são retidos na tela, nenhum plano é persistido no banco e um alerta de erro de tempo esgotado é apresentado ao professor.
- **Payload corrompido ou resposta vazia da IA**: Se o modelo retornar texto em formato ilegível, vazio ou fora do schema estruturado esperado, a resposta é rejeitada na validação de entrada, a persistência é abortada e uma mensagem informativa orienta o professor a submeter novamente.
- **Sessão expirada durante a edição**: Se a sessão do professor expirar enquanto ele digita um plano, ao clicar em "Salvar", o sistema bloqueia a gravação silenciosa com falha, preserva o conteúdo editado no estado local/cliente se possível e solicita reautenticação sem sobrescrever dados.
- **Busca sem correspondência no catálogo**: Quando o professor digita um termo ou aplica filtros que não correspondam a nenhuma habilidade da BNCC, o catálogo exibe mensagem informativa contextual ("Nenhuma habilidade encontrada para os filtros aplicados") sem quebrar a interface.
- **Tentativa de invasão entre contas demo**: Tentativas deliberadas de alteração de payload ou manipulação de ID no cliente para gravar ou ler rascunho de outro professor são interceptadas e bloqueadas no backend com base no identificador da sessão ativa, respondendo com status 404 e redirecionando para a listagem "Meus planos" do professor logado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE disponibilizar autenticação por sessão baseada em duas contas de demonstração pré-configuradas (Profª Ana Souza e Prof. Carlos Lima), oferecendo botões de acesso rápido com 1 clique na tela de login além de formulário com campos de e-mail e senha, com fluxo completo de login e logout.
- **FR-002**: O sistema DEVE proteger todas as rotas e operações pedagógicas contra usuários anônimos, exigindo autenticação válida prévia.
- **FR-003**: O sistema DEVE fornecer um catálogo canônico mínimo de habilidades da BNCC, contendo código oficial, descrição, nível de ensino, ano escolar (quando aplicável) e componente curricular/eixo.
- **FR-004**: O sistema DEVE permitir a filtragem do catálogo da BNCC por nível, ano escolar, componente curricular e busca textual combinada por código ou palavra-chave na descrição.
- **FR-005**: O sistema DEVE permitir ao professor selecionar uma ou múltiplas habilidades da BNCC, exibindo-as como chips visuais com botão para remoção individual.
- **FR-006**: O sistema DEVE disponibilizar formulário de planejamento contendo: habilidades selecionadas, instrução pedagógica complementar, duração em minutos (inteiro positivo obrigatório) e indicador de uso de recursos digitais (booleano).
- **FR-007**: O sistema DEVE validar os dados do formulário no cliente e no servidor antes do envio, exigindo ao menos uma habilidade selecionada e duração maior que zero.
- **FR-008**: O sistema DEVE exibir um estado de preparação visual ("loading") durante o processamento da IA, informando a estimativa de tempo e prevenindo submissões duplicadas.
- **FR-009**: O sistema DEVE desacoplar a integração de IA por meio de um adaptador no backend com suporte a dois modos: Provedor Simulado (Mock) determinístico para testes e Provedor Real para integrações com chave externa, validando a estrutura e o schema da resposta antes de qualquer persistência.
- **FR-010**: O sistema DEVE persistir o plano de aula no banco de dados apenas após resposta válida da IA, atribuindo-o obrigatoriamente ao identificador do professor autenticado, com status fixo `RASCUNHO` e indicação visual de procedência `Auxílio por IA`.
- **FR-011**: Em caso de falha de conexão, erro do serviço de IA, timeout ou resposta fora do contrato, o sistema DEVE abortar a transação sem gravar plano parcial ou fragmentado, DEVE manter todos os campos do formulário preenchidos na tela e DEVE exibir um banner de alerta semântico de erro ("Não foi possível gerar - Nenhum plano foi salvo"), reabilitando o botão de ação para nova tentativa manual pelo docente.
- **FR-012**: O sistema NUNCA deve executar re-tentativas automáticas de geração após falha da IA; qualquer nova tentativa deve ser iniciada explicitamente por ação voluntária do professor.
- **FR-013**: O sistema DEVE fornecer visualização e edição do plano de aula gerado com suporte a abas de "Editor Markdown" e "Pré-visualização" formatada.
- **FR-014**: O sistema DEVE permitir ao professor salvar manualmente alterações realizadas no conteúdo do rascunho, validando previamente que o título e o corpo do Markdown não estejam vazios, confirmando a gravação com notificação visual (toast).
- **FR-015**: O sistema DEVE exibir diálogo modal de confirmação ("Sair sem salvar?") caso o professor tente sair da página de edição contendo alterações pendentes não salvas.
- **FR-016**: O sistema DEVE listar na tela "Meus planos" exclusivamente os rascunhos pertencentes ao professor atualmente autenticado, ordenados pela atualização mais recente.
- **FR-017**: O sistema DEVE impedir terminantemente que um professor visualize, edite ou exclua rascunhos criados por outro professor, aplicando checagem de autorização (*ownership*) em todas as consultas e mutações. Qualquer requisição a um plano de outro proprietário DEVE responder com status HTTP 404 (Não Encontrado) e redirecionamento para "Meus planos", obscurecendo a existência do recurso.
- **FR-018**: As interfaces DEVEM implementar os tokens de design (cores, tipografia Inter, espaçamentos em escala 4px, raios e sombras) e componentes definidos no Design System do Figma, assegurando acessibilidade WCAG AA e responsividade para dispositivos móveis, tablets e desktop.

### Limites Explícitos de Escopo (Out of Scope)

- **Sem cadastro público de novos usuários**: Acesso restrito exclusivamente às contas de demonstração fornecidas.
- **Sem módulo de administração ou gestão de usuários**: Sem telas de gestão de permissões ou auditoria administrativa.
- **Sem exportação para PDF ou impressão externa**: O plano permanece em formato digital e Markdown no sistema.
- **Sem finalização de planos**: O ciclo de vida do plano se encerra no estado `RASCUNHO`; não há transição para "Publicado", "Concluído" ou "Arquivado".
- **Sem versionamento histórico de planos**: O salvamento atualiza o registro do rascunho existente; não há histórico de diffs ou versões anteriores.
- **Sem compartilhamento público ou repositório aberto**: Nenhum plano pode ser compartilhado por link público ou listado para outros professores.

### Key Entities *(include if feature involves data)*

- **Professor / Usuário Demo**: Representa o docente autenticado no sistema. Atributos conceituais: identificador único, nome completo, e-mail institucional fictício e perfil pedagógico.
- **Habilidade BNCC**: Representa a competência canônica do catálogo educacional. Atributos conceituais: código oficial (ex.: `EF05CI02`), descrição do objetivo de aprendizagem, nível de ensino (ex.: Ensino Fundamental), ano escolar (ex.: 5º ano) e componente curricular/eixo (ex.: Ciências).
- **Plano de Aula**: Representa a unidade de planejamento pedagógico criada pelo professor. Atributos conceituais: identificador único, vínculo ao professor proprietário, título, habilidades associadas, duração estimada (minutos), uso de recursos digitais (sim/não), orientações pedagógicas fornecidas, conteúdo da aula em Markdown, estado do ciclo de vida (`RASCUNHO`), indicador de auxílio por IA (`true`), data/hora de criação e data/hora da última atualização.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos planos de aula gerados com sucesso são criados exclusivamente com status `RASCUNHO`, identificados com `Auxílio por IA` e vinculados ao ID do professor proprietário.
- **SC-002**: Zero planos parciais, registros órfãos ou inconsistências persistidas no banco de dados em 100% dos cenários de teste de falha, erro de conexão ou timeout da IA.
- **SC-003**: 100% das informações preenchidas no formulário (habilidades, duração, instrução pedagógica e opção digital) são preservadas na tela após falha de geração por IA, dispensando redigitação pelo professor.
- **SC-004**: Isolamento estrito de 100% entre as contas de demonstração: em nenhum cenário a Conta Demo 2 consegue listar, visualizar ou editar planos gerados pela Conta Demo 1.
- **SC-005**: Tempo de resposta na filtragem e busca no catálogo da BNCC inferior a 1 segundo para o usuário em ambiente padrão de teste.
- **SC-006**: A alternância entre as abas de edição Markdown e pré-visualização formatada ocorre de forma imediata (inferior a 200 milissegundos) e sem perda de dados digitados.

## Assumptions

- O ambiente proverá um catálogo inicial da BNCC pré-carregado com volume suficiente de habilidades representativas para validar os filtros de nível, ano e componente curricular.
- Duas contas de demonstração com credenciais conhecidas serão fornecidas no provisionamento inicial (seed) para validação dos fluxos isolados e dos testes de segurança de acesso.
- O serviço de IA opera de forma desacoplada no backend, respeitando tempo de resposta de até 60 segundos com retorno estruturado em formato compatível com o plano em Markdown.
- As regras de persistência operam sob transações relacionais que garantem atomicidade completa entre a gravação do plano e o vínculo com as habilidades selecionadas.
