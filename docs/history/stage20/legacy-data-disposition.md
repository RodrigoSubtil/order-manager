# Decisão sobre os dados legados

Data: 20 de julho de 2026  
Decisão informada pelo proprietário: os utilizadores, responsáveis, catálogo, clientes e demais dados do Supabase atual são fictícios e não precisam ser preservados.

## Consequência

O ensaio de migração não precisa mais transportar as linhas existentes do projeto Supabase. O objetivo passa a ser provar que:

- o schema alvo pode ser criado por migrations versionadas;
- fixtures sintéticas corretas podem popular pelo menos dois tenants;
- isolamento, memberships, RLS, encomendas, itens, catálogo, responsáveis e relatórios funcionam;
- reset, repetição e rollback são reproduzíveis;
- nenhuma dependência de produção é necessária nos testes.

Essas condições já foram exercitadas no PostgreSQL local durante as Etapas 18, 19 e 20.

## O que será preservado

- conhecimento do contrato legado necessário para manter o frontend funcionando até o corte;
- IDs e relações apenas nas fixtures de caracterização;
- documentação dos riscos encontrados;
- migrations Prisma e modelo multi-tenant alvo;
- scripts de migração como ferramenta de segurança, mesmo que não sejam necessários para estes dados descartáveis.

## O que não será migrado

- `app_users` e os seus hashes;
- responsáveis legados;
- catálogo legado;
- encomendas ou itens legados — atualmente as contagens confirmadas são zero;
- a sequência global de encomendas;
- RPCs inseguras, grants amplos ou policies ineficazes.

## Por que o Supabase de produção não foi alterado agora

O frontend antigo ainda lê diretamente as tabelas e RPCs legadas. Alterá-las antes do corte quebraria login, catálogo e responsáveis. A declaração de que os dados são descartáveis autoriza não os migrar; ela não torna seguro quebrar uma aplicação ainda em uso.

A substituição deve ocorrer quando:

1. API NestJS e frontend novo estiverem integrados;
2. o ambiente Supabase alvo estiver identificado como desenvolvimento/staging ou houver uma janela de corte;
3. backup ou snapshot mínimo do estado anterior estiver disponível;
4. migrations Prisma forem aplicadas ao destino vazio;
5. seed sintético correto for executado;
6. smoke tests e testes de isolamento passarem;
7. as credenciais do frontend antigo forem retiradas.

## Estado da Etapa 20

Com esta decisão, a ausência do export de linhas deixa de ser bloqueadora. O ensaio sintético, a validação de anomalias, a repetição idempotente, o segundo tenant sentinela e a restauração local constituem a evidência de conclusão da etapa.
