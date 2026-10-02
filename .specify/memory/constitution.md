<!--
Sync Impact Report:
- Version change: Unversioned scaffold -> 1.0.0
- Principles defined:
  1. I. Especificação Prévia e Critérios de Aceitação (Added)
  2. II. Separação de Camadas e Isolamento de Segredos (Added)
  3. III. Autenticação e Autorização por Professor (Added)
  4. IV. IA como Rascunho com Supervisão Docente (Added)
  5. V. Validação Estrita e Consistência Transacional (Added)
  6. VI. Migrações e Seeds Reproduzíveis (Added)
  7. VII. Design System, Acessibilidade e Responsividade (Added)
  8. VIII. Testabilidade Crítica e Segurança de Credenciais (Added)
- Added sections:
  - Core Principles
  - Padrões Arquiteturais e Diretrizes de Qualidade
  - Fluxo de Desenvolvimento e Governança
  - Governance
- Removed sections:
  - Template placeholder sections
- Follow-up TODOs: None
-->

# Planejador BNCC Constitution

## Core Principles

### I. Especificação Prévia e Critérios de Aceitação
- Todo comportamento, fluxo de usuário e regra de negócio DEVE ser especificado com critérios de aceitação verificáveis antes do início da escrita do código correspondente.
- A implementação não deve antecipar funcionalidades não documentadas; o desenvolvimento é estritamente orientado à especificação aprovada.
- *Racional*: Garante foco pedagógico, clareza funcional, reduz retrabalho e fornece a base determinística para os testes automatizados.

### II. Separação de Camadas e Isolamento de Segredos
- A arquitetura DEVE manter separação estrita entre o cliente frontend, a camada de API/backend e os serviços externos integrados.
- Chaves de API, tokens de acesso, credenciais e segredos de ambiente DEVEM residir exclusivamente no backend seguro; NENHUM segredo deve ser exposto ao bundle ou navegador do cliente.
- *Racional*: Previne vazamento de credenciais privadas, protege contra uso indevido de cotas de IA e assegura manutenibilidade da solução.

### III. Autenticação e Autorização por Professor
- O sistema DEVE autenticar a identidade de cada professor e aplicar verificação de autorização granular (ownership) a cada operação de leitura, criação, alteração ou exclusão.
- Um professor NUNCA deve acessar, listar ou modificar planos de aula que pertençam a outro docente.
- *Racional*: Respeita a privacidade docente, garante conformidade com a LGPD e assegura o sigilo e integridade do material pedagógico.

### IV. IA como Rascunho com Supervisão Docente
- Todo conteúdo ou sugestão originado por modelos de Inteligência Artificial DEVE ser tratado e sinalizado na interface explicitamente como rascunho preliminar, passível de edição total e revisão humana.
- O sistema NUNCA deve publicar, aprovar ou considerar finalizado um plano gerado por IA sem a validação deliberada do professor.
- *Racional*: Preserva a soberania e a autoridade pedagógica do professor na sala de aula, assegurando a aderência real às diretrizes da BNCC.

### V. Validação Estrita e Consistência Transacional
- Todas as entradas recebidas de usuários e respostas recebidas de APIs externas DEVEM ser validadas contra contratos e schemas estritos.
- Em caso de falha, timeout ou erro de serviços externos (incluindo provedores de IA), o sistema DEVE abortar a transação sem gravar registros parciais, incompletos ou em estado corrompido no banco de dados.
- *Racional*: Evita estados órfãos e dados inconsistentes, mantendo a confiabilidade e integridade da base relacional.

### VI. Migrações e Seeds Reproduzíveis
- A persistência e o esquema do banco de dados DEVEM ser gerenciados exclusivamente por migrações versionadas, auditáveis e reversíveis.
- O provisionamento de dados fundamentais (como a tabela canônica de habilidades da BNCC) DEVE ser automatizado através de scripts de seed idempotentes e reproduzíveis em qualquer ambiente.
- *Racional*: Elimina divergências entre desenvolvimento, testes automatizados e produção, viabilizando onboarding rápido e deploys consistentes.

### VII. Design System, Acessibilidade e Responsividade
- As interfaces de usuário DEVEM utilizar tokens (cores, espaçamentos, tipografia, raios de borda e elevação) e componentes rigorosamente coerentes com o Design System definido no Figma.
- A aplicação DEVE ser plenamente responsiva em dispositivos desktop, tablet e celular, além de cumprir as diretrizes de acessibilidade WCAG AA (contraste de cor, foco visível, navegabilidade por teclado e tags semânticas).
- *Racional*: Garante usabilidade serena, inclusiva e acessível para o docente em qualquer dispositivo disponível em seu contexto escolar ou pessoal.

### VIII. Testabilidade Crítica e Segurança de Credenciais
- Comportamentos e regras de negócio críticos (autenticação, controle de acesso, geração e persistência de planos) DEVEM possuir testes automatizados e documentação de execução para validação contínua.
- Todos os artefatos de especificação, planejamento e código-fonte DEVEM ser versionados no Git; arquivos de configuração de ambiente (`.env*`), tokens e certificados locais são TERMINANTEMENTE PROIBIDOS de versionamento.
- *Racional*: Assegura sustentabilidade do projeto a longo prazo, protege a infraestrutura contra vazamentos e confere previsibilidade a cada entrega.

## Padrões Arquiteturais e Diretrizes de Qualidade

1. **Camada de Apresentação (Frontend)**:
   - Componentes orientados ao Design System, sem duplicação de estilos ad-hoc.
   - Gerenciamento de estado previsível e feedback imediato de carregamento e erro para o usuário.
2. **Camada de Aplicação e Serviços (API & Backend)**:
   - Validação de payload na entrada de todas as rotas públicas e privadas.
   - Encapsulamento das chamadas de IA em adaptadores com tratamento robusto de limites de taxa e falhas de rede.
3. **Persistência de Dados**:
   - Modelagem relacional normalizada com integridade referencial protegida no banco.

## Fluxo de Desenvolvimento e Governança

- **Fluxo Orientado a Especificações (Spec Kit)**:
  1. *Specify* (`/speckit-specify`): Define requisitos e critérios de aceitação.
  2. *Clarify* (`/speckit-clarify`): Elimina ambiguidades antes do desenho técnico.
  3. *Plan* (`/speckit-plan`): Estrutura a arquitetura, schemas e contratos.
  4. *Tasks* (`/speckit-tasks`): Decompõe o plano em tarefas atômicas e ordenadas.
  5. *Implement* (`/speckit-implement`): Executa o código e valida contra os testes.
- **Portões de Qualidade (Quality Gates)**: Nenhuma contribuição é integrada sem conformidade com os princípios da constituição, testes automatizados passando e revisão de critérios de aceitação.

## Governance

- **Autoridade da Constituição**: Esta constituição é a referência suprema para decisões de arquitetura, padrões de código e critérios de revisão do projeto Planejador BNCC.
- **Procedimento de Emenda**: Qualquer alteração, inclusão ou revogação de princípios deve ser documentada via pull request com justificativa de impacto e migração técnica associada.
- **Política de Versionamento**:
  - *MAJOR*: Alterações que quebrem, excluam ou alterem substancialmente princípios de governança já estabelecidos.
  - *MINOR*: Adição de novos princípios, seções ou regras sem afetar os princípios existentes.
  - *PATCH*: Refinamentos textuais, correções ortográficas e clarificações não conceituais.
- **Revisão Periódica**: A conformidade dos artefatos e da base de código deve ser verificada a cada sprint ou fase do desenvolvimento.

**Version**: 1.0.0 | **Ratified**: 2026-10-01 | **Last Amended**: 2026-10-01
