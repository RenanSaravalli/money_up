# Validação da entrega

Verificações realizadas em 5 de novembro de 2026, com Node.js 24.14.0, npm 11.9.0 e as versões fixadas em `package-lock.json`.

## Resultados

| Verificação | Resultado |
| --- | --- |
| `npm run lint` | Aprovado, sem erros ou avisos. |
| `npm run typecheck` | Aprovado. |
| `npm test` | 18 testes aprovados, nenhuma falha. |
| `npm run build` | Aprovado com Next.js 16.4.5 e Webpack. |
| `npm run db:generate` após o schema final | Nenhuma diferença pendente; migration inicial e snapshot estão versionados. |
| Servidor de produção, `/dashboard`, sem configuração | HTTP 307 para `/login`, com `Cache-Control: private, no-cache, no-store`. |
| Servidor de produção, `/login` | HTTP 200. |
| Servidor de produção, `/api/finance`, sem sessão | HTTP 401, com `Cache-Control: private, no-store, max-age=0`. |
| `/manifest.webmanifest` | HTTP 200 e tipo `application/manifest+json`. |
| `/sw.js` | HTTP 200 e `Cache-Control: no-cache, no-store, must-revalidate`. |
| `/icons/icon-512.png` | HTTP 200 e tipo `image/png`. |

## Cobertura dos testes

- Conversão e formatação de valores brasileiros em centavos exatos, inclusive agregados acima da precisão de `Number`.
- Recusa de valores ambíguos, negativos quando proibidos e acima do limite permitido.
- Receitas, despesas, edição e exclusão no cálculo de saldo.
- Conservação do saldo total em transferências e cálculo das contas de reserva.
- Resultado mensal e limites de período no fuso de São Paulo.
- Grupos de despesas por dia, semana e mês.
- Conversão de datas, incluindo o horário de verão histórico de São Paulo.
- Validações de transações e do cadastro básico de cartões.
- Aplicação da migration SQL em uma engine PostgreSQL descartável (PGlite).
- Chaves estrangeiras que bloqueiam contas de outro usuário e categorias incompatíveis.
- Constraints para transferências, valores e cartões, com rollback após uma falha.
- Fluxo real do Better Auth com adaptador Drizzle: provisionamento, bloqueio do cadastro público, recusa de senha inválida, login, cookie, sessão persistida e revogação no logout.

As fixtures são exclusivas dos testes. Nenhuma conta ou movimentação fictícia foi adicionada à aplicação ou ao Neon.

## Conferência visual e de interação

As duas referências fornecidas foram abertas e analisadas antes da implementação. Os arquivos estão em `docs/references/dashboard.png` e `docs/references/statistics.png`.

A aplicação foi conferida no navegador em tamanho de celular e desktop. Foram observados o gradiente superior azul, o destaque do saldo, os quatro botões de ações, os estados vazios, os cards e a navegação em cápsula com botão circular azul. A conferência também incluiu o bottom sheet de cadastro de conta, seu formulário, o bloqueio de gravação sem Neon, a troca para o período mensal e a seleção de um mês no gráfico, que atualizou o intervalo exibido.

Capturas de conferência ficam em `docs/previews/`. As capturas mostram estados vazios de desenvolvimento, pois credenciais do banco não foram fornecidas. O navegador usado pelo ambiente aplica escala própria; as capturas não substituem uma validação de instalação e navegação em um dispositivo físico.

## Limites de verificação

- Não foi possível executar uma migração ou um fluxo autenticado contra uma instância **Neon real**, pois `DATABASE_URL` e os segredos de autenticação não foram fornecidos. Os testes do schema e do Better Auth usaram PostgreSQL descartável, com a mesma migration e a mesma configuração de autenticação.
- O deploy Vercel e a instalação da PWA em Android/iOS não foram executados. O projeto contém as instruções de configuração e publicação no README.
- O build padrão do Turbopack encontrou uma restrição de abertura de porta interna no ambiente, inclusive após tentativa autorizada. O comando de build foi configurado para `next build --webpack`, que concluiu com sucesso. O modo de desenvolvimento continua usando Turbopack.
- A auditoria npm após as atualizações apontou **quatro ocorrências moderadas na cadeia do Drizzle Kit / esbuild antigo**. O Drizzle Kit é uma ferramenta de desenvolvimento/migrations e não é chamado pelos handlers financeiros. As ocorrências estão interligadas ao mesmo esbuild transitivo; não foi aplicado downgrade incompatível do Drizzle Kit. A vulnerabilidade alta inicialmente apontada no Sharp e os avisos de minimatch foram corrigidos por atualização/override. A auditoria deve ser revisitada antes da publicação conforme novas versões estiverem disponíveis.
- Compras a crédito, faturas, parcelamentos, notificações reais e metas avançadas estão fora desta entrega e são indicados como indisponíveis na interface.

Os servidores temporários utilizados na conferência foram encerrados. Para continuar localmente, execute `npm run dev`.

## Atualização: conexão Neon em 6 de novembro de 2026

A configuração local foi concluída com a conexão pooled fornecida pelo usuário. A URL e o segredo aleatório do Better Auth estão somente em `.env.local`, ignorado pelo Git e com permissões `600`. A URL local da autenticação é `http://localhost:3000`.

- A migration inicial foi aplicada com `npm run db:migrate`: nove tabelas no schema público e uma migration registrada.
- A leitura das tabelas de usuários, contas e transações foi confirmada pelo mesmo `getDb()`/Drizzle usado pela aplicação, sem criar dados de exemplo.
- A conexão cliente foi verificada com TLS 1.3, certificado validado e `sslmode=verify-full`. O pool agora habilita channel binding quando oferecido pelo servidor.
- `npm run typecheck` passou após o ajuste da conexão.
- Não existe usuário inicial ou dado financeiro no banco. O próximo passo é executar `npm run user:create` no terminal e, depois, `npm run dev`.

Esta verificação substitui a limitação anterior sobre ausência de conexão a um Neon real. O fluxo autenticado completo no Neon depende do provisionamento do usuário. A publicação na Vercel e a instalação em dispositivo físico continuam pendentes.

### Correção do diagnóstico do provisionamento

Após o relato de falha ao executar `npm run user:create`, foi confirmado que o Neon estava acessível, com a migration aplicada e nenhum usuário criado. A mensagem genérica do CLI ocultava a causa, incluindo as validações locais da senha.

O comando agora informa separadamente senha curta, longa ou confirmação diferente, permitindo nova tentativa no mesmo terminal. Também apresenta mensagens seguras para erros conhecidos do banco e do Better Auth, sem imprimir erros brutos ou dados sensíveis.

Foram aprovados 20 testes, lint e typecheck. A criação pelo Better Auth também foi executada na instância Neon real dentro de uma transação deliberadamente revertida; o rollback foi confirmado e nenhum usuário de teste foi mantido. A senha efetivamente digitada pelo usuário não foi coletada, portanto não foi possível determinar retrospectivamente qual validação provocou a falha relatada.
