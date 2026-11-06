# Fluxo

PWA de controle financeiro pessoal, com prioridade para as referências em `docs/references`. Interface em português, valores em BRL e fuso `America/Sao_Paulo`. A aplicação não vem com movimentações, contas ou resultados fictícios.

## Implementado

- Next.js 16, App Router, React, TypeScript, Tailwind CSS 4, componentes shadcn/ui personalizados sobre Radix, Lucide, React Hook Form, Zod e Recharts.
- Início com saldo total, resultado mensal, receitas, despesas, contas de reserva e últimas transações. Layout mobile com navegação flutuante e versão desktop com menu lateral.
- Contas: cadastro, edição, identificação visual, saldo inicial, conta corrente/dinheiro/reserva e arquivamento. Contas arquivadas continuam compondo os saldos e preservam o histórico.
- Transações: receitas, despesas e transferências; criar, editar, excluir com confirmação, pesquisar e filtrar por tipo, categoria, conta e intervalo de datas. Histórico agrupado por dia e ordenação por data.
- Categorias iniciais provisionadas com o usuário, além de cadastro, edição e exclusão de categorias não utilizadas.
- Estatísticas interativas: dias da semana atual, últimas quatro semanas e últimos seis meses. Barras selecionáveis, detalhes do período e participação de cada categoria no total gasto.
- Cartões: cadastro e edição de nome, instituição, tipo, conta vinculada, cor, limite e dias de fechamento/vencimento; exclusão com confirmação.
- Better Auth: login por e-mail/senha, sessões persistidas no Neon, logout no desktop e no celular, edição do nome e cadastro público fechado. Provisionamento inicial somente por CLI.
- Neon PostgreSQL via `pg` e Drizzle; migrations SQL versionadas, chaves compostas por usuário, índices, validações e constraints.
- Manifest, ícones PNG, ícone maskable, Apple touch icon, safe areas e service worker com página pública de contingência offline.

## Executar localmente

Use Node.js 22 ou superior (validação realizada com Node 24) e npm.

```bash
npm ci
cp .env.example .env.local
```

Preencha as variáveis de `.env.local` antes de continuar:

| Variável | Conteúdo |
| --- | --- |
| `DATABASE_URL` | URL PostgreSQL pooled do Neon, com `sslmode=require` ou `verify-full`. Somente no servidor. |
| `BETTER_AUTH_SECRET` | Segredo aleatório com pelo menos 32 caracteres. Gere com `openssl rand -base64 48`. |
| `BETTER_AUTH_URL` | `http://localhost:3000` localmente; origem HTTPS do aplicativo em produção. |

```bash
npm run db:migrate
npm run user:create
npm run dev
```

Abra [localhost:3000](http://localhost:3000). Reinicie o servidor após alterar a configuração. Sem configuração válida, **somente em desenvolvimento**, é possível navegar pelos estados vazios; as gravações ficam bloqueadas. Em produção, as rotas financeiras redirecionam para o login mesmo quando falta configuração. Nenhum dado é persistido no navegador como substituto do Neon.

## Configurar o Neon

1. Crie um projeto PostgreSQL no console do Neon e selecione o banco e a branch desejados.
2. Abra **Connect**, habilite **Connection pooling** e copie a conexão PostgreSQL. O hostname pooled normalmente contém `-pooler`.
3. Guarde a URL em `DATABASE_URL`, sem prefixo `NEXT_PUBLIC_`. Preserve o parâmetro TLS e a senha codificada como fornecidos pelo Neon. A validação da aplicação exige um host terminado em `.neon.tech`.
4. Execute `npm run db:migrate`. Esse comando aplica as migrations pendentes usando o migrator do Drizzle; pode ser executado novamente.
5. Execute `npm run user:create` em um terminal interativo para provisionar o acesso.

O pool de cada processo utiliza no máximo cinco conexões. Para mudanças futuras no schema, edite `src/db/schema.ts`, execute `npm run db:generate`, revise o SQL gerado e aplique com `npm run db:migrate`. As migrations não são executadas automaticamente durante o build ou em cada requisição. Referência: [connection pooling do Neon](https://neon.com/docs/connect/connection-pooling).

## Criar o usuário inicial

```bash
npm run user:create
```

O comando pede nome, e-mail e senha (12 a 128 caracteres). A senha e a confirmação ficam ocultas no terminal, sem argumentos de linha de comando, arquivos de credenciais ou senha fixa. O hash é produzido pelo próprio Better Auth.

Senhas curtas, longas ou com confirmação diferente exibem o motivo específico e podem ser digitadas novamente sem reiniciar o comando. Erros conhecidos de conexão, schema e autenticação são traduzidos para mensagens seguras; senhas, parâmetros SQL e credenciais do banco não são exibidos.

O provisionador cria uma instância local do Better Auth que aceita cadastro apenas dentro desse processo; o endpoint web continua com `disableSignUp: true`. Se já existir um usuário, o comando não cria outro e apenas verifica as categorias iniciais. Execute o provisionador uma vez por banco, sem execuções simultâneas. Se a criação do usuário tiver concluído e a criação das categorias for interrompida, execute o comando novamente.

## Regras financeiras

Todos os valores monetários são armazenados como `bigint` em centavos. No servidor e nos cálculos compartilhados são usados `BigInt`, e no JSON, strings de centavos. A conversão de `1.250,09` resulta exatamente em `125009`; os saldos e totais não passam por aritmética de ponto flutuante. `Number` é utilizado apenas para proporções visuais e percentuais.

O saldo de uma conta é seu saldo inicial mais receitas, menos despesas e transferências de saída, mais transferências de entrada. Não existe um segundo saldo mutável que possa divergir do livro de movimentações. Editar ou excluir um lançamento recalcula os valores a partir do histórico.

Uma transferência é **um único registro**, contendo origem e destino. Sua criação, edição ou exclusão afeta as duas contas de forma indivisível, sem criar receita ou despesa. As operações usam transações SQL, rollback e um bloqueio transacional por usuário para serializar alterações. Leituras de resumos usam uma transação `repeatable read`, evitando combinar contas e lançamentos de momentos diferentes. IDs estáveis de criação de transações e contas impedem duplicação em uma tentativa repetida no mesmo formulário.

O resultado mensal é receitas menos despesas. O valor guardado é o saldo das contas de reserva, incluído no saldo total. Saldos negativos são permitidos para representar a situação real da conta. Movimentações futuras não são aceitas nesta versão. Cada lançamento/saldo inicial tem limite absoluto de 9 trilhões de centavos; agregações continuam exatas acima desse limite.

Cada consulta e mutação é filtrada pelo usuário da sessão no servidor. Chaves estrangeiras compostas também impedem vincular contas e categorias de outro usuário ou categorias de tipo incompatível, mesmo contornando o formulário. Alterações exigem a origem configurada em `BETTER_AUTH_URL`. Exclusões de categorias utilizadas são rejeitadas pelo banco.

## Limites intencionais

- **Crédito:** apenas cadastro. Compras no crédito, saldo devedor, patrimônio líquido, faturas, pagamentos e parcelamentos não estão implementados. Nenhum pagamento de fatura é apresentado como funcional. Não registre uma compra no crédito como despesa bancária se ela ainda não saiu da conta.
- **Débito:** registre a despesa diretamente na conta vinculada. O cadastro do cartão não gera lançamentos automaticamente.
- **Metas:** rota visual que informa que o módulo ainda não está disponível.
- **Notificações:** botão informativo, sem notificações reais.
- **Offline:** consultar ou registrar movimentações exige internet. Não há fila offline de operações nem cache persistente de dados financeiros.
- Sem importação bancária, recorrências, exportação ou recuperação de senha por e-mail nesta entrega.
- O MVP individual carrega o histórico completo do usuário para filtros e resumos. Paginação e agregações SQL incrementais são uma evolução para volumes maiores.

## Instalar a PWA

Use uma publicação HTTPS. No Chrome/Android, use o menu de instalação ou **Adicionar à tela inicial**. No Safari/iPhone, use **Compartilhar → Adicionar à Tela de Início**. O service worker é registrado somente em produção; para testar localmente, use o build de produção e localhost.

O cache contém **apenas** `/offline.html` e os ícones públicos declarados em `public/sw.js`. Respostas de API, páginas autenticadas e dados financeiros não são gravados no Cache Storage. Navegações tentam a rede e mostram a página pública de desconexão quando ela falha. Referência: [PWA com Next.js](https://nextjs.org/docs/app/guides/progressive-web-apps).

## Publicar na Vercel

1. Envie este projeto ao seu repositório Git e importe-o na Vercel com o preset **Next.js**, Node 22/24 e o comando de build `npm run build`.
2. Configure as três variáveis de ambiente no projeto Vercel. `BETTER_AUTH_URL` deve ser exatamente a origem HTTPS final. Use ambientes/bancos separados para preview e produção.
3. Aplique as migrations e provisione o usuário apontando para o banco de produção por um terminal local seguro ou pipeline de confiança.
4. Faça o deploy. Se mudar domínio ou variáveis, atualize `BETTER_AUTH_URL` e publique novamente. Cookies seguros são usados em produção.
5. Entre e valide criação de contas, receitas, despesas, transferências e instalação no dispositivo real.

O build utiliza o Webpack estável do Next.js, pois o subprocesso do Turbopack foi bloqueado pelo ambiente de execução durante a validação. Desenvolvimento continua com Turbopack. Não há configuração de Edge: todas as operações dependentes do PostgreSQL usam runtime Node.js.

Em 6 de novembro de 2026, a conexão local com o projeto Neon fornecido foi configurada em `.env.local`, e as migrations foram aplicadas. As credenciais não são versionadas. O deploy Vercel ainda não foi realizado: configure as mesmas variáveis no ambiente de hospedagem e ajuste `BETTER_AUTH_URL` para a origem HTTPS publicada. Referências: [Next.js na Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [variáveis de ambiente](https://vercel.com/docs/environment-variables).

## Estrutura

```text
src/
├── app/
│   ├── (app)/          # dashboard, transactions, statistics, accounts, cards, goals
│   ├── login/          # autenticação
│   ├── api/            # Better Auth e operações financeiras
│   ├── globals.css     # identidade visual e responsividade
│   └── manifest.ts
├── components/         # navegação, ícones, listas, estado e UI compartilhada
├── features/           # telas, formulários e serviço financeiro
├── db/                 # schema relacional e conexão pg/Drizzle
├── lib/                # autenticação, validação, centavos, fuso e resumos
└── types/
drizzle/                # migrations e snapshots versionados
scripts/                # migrations, provisionamento e ícones
tests/                  # regras financeiras, schema PostgreSQL e Better Auth
docs/references/        # imagens fornecidas
public/                 # fontes locais, ícones e contingência offline
```

## Verificação

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

Os testes usam fixtures descartáveis e PGlite (engine PostgreSQL) exclusivamente como infraestrutura de teste; a aplicação usa somente Neon. Cobrem precisão em centavos, edição/exclusão, conservação nas transferências, reservas, períodos e fuso horário, constraints e isolamento entre usuários, rollback e o fluxo real de provisionamento/login/sessão/logout do Better Auth. Essas fixtures não aparecem na aplicação.

Os resultados da entrega e os limites de verificação estão em `docs/validation.md`. A integração com uma instância Neon real, a instalação no dispositivo e o deploy exigem a configuração indicada acima.

Fontes Inter distribuídas localmente sob SIL OFL 1.1; licença em `public/fonts/OFL.txt`.
