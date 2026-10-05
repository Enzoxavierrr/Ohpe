<div align="center">

<br />

<img src="docs/banner.svg" alt="Ohpe — Kanban minimalista com sync na nuvem" width="100%" />

<br />
<br />

<table><tr><td>
<h1>
  <img src="public/brand-mark.svg" alt="" width="28" height="28" align="center" />
  &thinsp;Ohpe
</h1>
</td></tr></table>

<p><strong>Kanban minimalista com sync na nuvem.</strong><br/>
Multi-board · Status tags · Drag & drop · Login por username · Temas</p>

<br />

<p>
  <img alt="React 18" src="https://img.shields.io/badge/React-18-2B4C7E?style=for-the-badge&logo=react&logoColor=fff" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-2B4C7E?style=for-the-badge&logo=typescript&logoColor=fff" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-5-567EBB?style=for-the-badge&logo=vite&logoColor=fff" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Auth+DB-567EBB?style=for-the-badge&logo=supabase&logoColor=fff" />
  <img alt="dnd-kit" src="https://img.shields.io/badge/dnd--kit-6-606D80?style=for-the-badge" />
</p>

<p>
  <img alt="License MIT" src="https://img.shields.io/badge/license-MIT-606D80?style=flat-square" />
  <img alt="PRs welcome" src="https://img.shields.io/badge/PRs-welcome-2B4C7E?style=flat-square" />
</p>

</div>

<br />

---

<br />

## Por que existe

Um kanban que abre numa aba e funciona. Sem overhead, sem onboarding de 15 passos.
Login por **username + senha** — sem email, sem OAuth, sem fricção.
Boards sincronizados via **Supabase** — use em casa, no trabalho, no celular. É o mesmo board.

<br />

## Features

<table>
<tr>
<td width="50%">

### Workspace multi-board

Home com grid visual de boards. Crie quantos precisar, renomeie, delete, navegue entre eles com transições animadas.

</td>
<td width="50%">

### Drag & drop real

Cards arrastáveis entre colunas. Colunas reordenáveis por drag handle. Redimensionamento por borda direita. Tudo com `@dnd-kit`.

</td>
</tr>
<tr>
<td>

### Status tags por card

Cada card tem seu próprio status — independente da coluna:

![a fazer](https://img.shields.io/badge/●_a_fazer-567ebb?style=flat-square&labelColor=567ebb)
![fazendo](https://img.shields.io/badge/●_fazendo-f5cf5c?style=flat-square&labelColor=f5cf5c)
![bloqueado](https://img.shields.io/badge/●_bloqueado-fca5a5?style=flat-square&labelColor=fca5a5)
![melhorias](https://img.shields.io/badge/●_melhorias-fdba74?style=flat-square&labelColor=fdba74)
![feito](https://img.shields.io/badge/●_feito-86efac?style=flat-square&labelColor=86efac)

</td>
<td>

### Card detail modal

Abre os detalhes do card com:
- **Descrição** — o que precisa ser feito
- **Como resolvi** — documentação da solução
- **Impedimento** — quando bloqueado
- **Melhorias** — lista item por item, copiável

</td>
</tr>
<tr>
<td>

### Arquivar, não deletar

Cards são arquivados — não perdidos. Drawer lateral com lista de arquivados, restaure com um clique.

</td>
<td>

### Editor in-place

Notas aparecem formatadas como leitura. Ícone de lápis ativa edição. Textareas auto-expandem — o modal rola, não o campo.

</td>
</tr>
<tr>
<td>

### Import / Export JSON

Menu `⋮` no header → baixe o board inteiro como JSON ou importe de outro dispositivo. Migração automática de formatos antigos.

</td>
<td>

### Copiar template

Botão que gera template formatado do card (título + descrição + resolução) pronto pra colar no Claude, Notion ou docs.

</td>
</tr>
<tr>
<td>

### Sync automático

Supabase como backend. JSONB blob com debounce de 800ms. Indicador visual de sync no header. Abra em outro browser — tá lá.

</td>
<td>

### Temas claro / escuro

Toggle no header. Paleta completa com tokens CSS semânticos. Transição suave entre temas.

</td>
</tr>
</table>

<br />

<details>
<summary><strong>Animações e transições</strong></summary>

<br />

| O quê | Como |
|---|---|
| **Splash screen** | Arco SVG draw-on + 3 partículas orbitando + per-letter stagger do "Ohpe" |
| **Login page** | Grid de dots com drift, glow pulsante, scan line horizontal, entrada staggered por campo |
| **Home → Board** | Slide + blur + fade com direção (forward/backward), 420ms spring |
| **Cards** | `justLanded` green pulse na criação, hover lift com shadow transition |
| **Colunas** | Status dropdown com scale spring, resize handle com cursor feedback |
| **Modais** | Backdrop fade + content scale-in, close com animação reversa |

</details>

<br />

---

<br />

## Quick start

```bash
git clone <este-repo>
cd Ohpe
npm install
cp .env.local.example .env.local
npm run dev
```

<details>
<summary><strong>Setup do Supabase</strong></summary>

<br />

**1.** Crie um projeto em [supabase.com](https://supabase.com)

**2.** Aplique a migration:

```sql
create table public.boards (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.boards enable row level security;

create policy "owner reads"   on public.boards for select using (auth.uid() = user_id);
create policy "owner writes"  on public.boards for insert with check (auth.uid() = user_id);
create policy "owner updates" on public.boards for update using (auth.uid() = user_id);
```

**3.** (Opcional, pra `/documentos`) Aplique também as tabelas de documentos e grupos:

```sql
-- Grupos primeiro (documents referencia groups via FK)
create table public.document_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Novo grupo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.document_groups enable row level security;
create policy "owner reads"   on public.document_groups for select using (auth.uid() = user_id);
create policy "owner writes"  on public.document_groups for insert with check (auth.uid() = user_id);
create policy "owner updates" on public.document_groups for update using (auth.uid() = user_id);
create policy "owner deletes" on public.document_groups for delete using (auth.uid() = user_id);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Novo documento',
  content text not null default '',
  highlights jsonb not null default '[]'::jsonb,
  group_id uuid references public.document_groups(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.documents enable row level security;

create policy "owner reads"   on public.documents for select using (auth.uid() = user_id);
create policy "owner writes"  on public.documents for insert with check (auth.uid() = user_id);
create policy "owner updates" on public.documents for update using (auth.uid() = user_id);
create policy "owner deletes" on public.documents for delete using (auth.uid() = user_id);

create index documents_user_updated_idx on public.documents (user_id, updated_at desc);
create index documents_group_idx on public.documents (group_id);
```

> **Já tinha a tabela `documents` da versão anterior?** Rode só o `create table document_groups` acima + `alter table documents add column group_id uuid references public.document_groups(id) on delete set null; create index documents_group_idx on public.documents (group_id);`.

**3.3** Aplique a tabela de usernames (pra permitir login por username):

```sql
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "self reads"   on public.profiles for select using (auth.uid() = user_id);
create policy "self writes"  on public.profiles for insert with check (auth.uid() = user_id);
create policy "self updates" on public.profiles for update using (auth.uid() = user_id);

-- Checa se um username está livre (pra validar antes do signup)
create or replace function public.username_available(uname text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select not exists(
    select 1 from public.profiles where username = lower(trim(uname))
  );
$$;
grant execute on function public.username_available(text) to anon, authenticated;

-- Resolve username → email (pra login por username)
create or replace function public.email_for_username(uname text)
returns text
language sql stable security definer set search_path = public
as $$
  select u.email
  from auth.users u
  join public.profiles p on p.user_id = u.id
  where p.username = lower(trim(uname))
  limit 1;
$$;
grant execute on function public.email_for_username(text) to anon, authenticated;
```

> **Nota de privacidade:** `email_for_username` expõe o email de uma conta pra quem souber o username exato. Pra app pessoal é aceitável. Se quiser blindar, troca essa função por um edge function com rate limit.

**3.4** (Só se você tem contas legadas com `@ohpe.local`) O Supabase passou a rejeitar `.local` como TLD inválido. Rode essa migration **uma vez** pra renomear emails antigos e preservar o username em `profiles`:

```sql
-- Cria profiles pros legados antes de perder o username do email antigo
insert into public.profiles (user_id, username)
select id, split_part(email, '@', 1)
from auth.users
where email like '%@ohpe.local'
on conflict (user_id) do nothing;

-- Renomeia o domínio sintético pra um TLD válido
update auth.users
set email = replace(email, '@ohpe.local', '@legacy.ohpe-app.com')
where email like '%@ohpe.local';
```

Depois disso os legados conseguem logar com username (fallback vai pra `@legacy.ohpe-app.com`), e na primeira entrada caem na tela de migração pra adicionar email real.

**4.** Em **Auth → Providers → Email**, desabilite *Confirm email* (login sem bloqueio)

**4.1** (Reset de senha) Em **Auth → URL Configuration**, adicione o domínio do app em *Site URL* e *Redirect URLs* (ex.: `http://localhost:5173`, `https://seudominio.com`). Sem isso, o link do email de reset é bloqueado.

**4.2** Em **Auth → Email Templates → Reset Password**, confira que o template referencia `{{ .ConfirmationURL }}` (padrão). O app espera o redirect pra `/#reset`.

> **Dica:** tem templates HTML prontos com a identidade do Ohpe (dark mode, mobile-friendly) em [`supabase/email-templates/`](supabase/email-templates/). Cola no painel pra ter emails bonitos no reset de senha e troca de email.

**5.** Copie URL + publishable key pro `.env.local`:



```env
VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
VITE_SUPABASE_ANON_KEY=<sua-publishable-key>
```

> A publishable key é segura no client — RLS protege os dados. A service role key nunca é usada no front.

</details>

<details>
<summary><strong>Deploy em produção</strong></summary>

<br />

```bash
npm run build     # gera dist/
npm run preview   # serve localmente
```

Defina `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no painel do host (Vercel, Netlify, Cloudflare Pages).

> **SPA fallback:** o repo já traz `vercel.json` (rewrite pra Vercel) e `public/_redirects` (Netlify e Cloudflare Pages). Sem isso, acessar `/documentos` direto ou qualquer URL que não seja `/` retorna 404 do próprio host — o React nem chega a carregar.

</details>

<details>
<summary><strong>Rota <code>/documentos</code> (beta)</strong></summary>

<br />

Rota experimental, isolada da home de boards. Acessa digitando `/documentos` na URL.

- **Documentos em markdown** — criar em branco, importar `.md` ou colar texto.
- **Modo leitura/edição** — toggle no header. Modo leitura renderiza com GFM (tabelas, task list, etc.).
- **Grifo persistente** — selecione um trecho → botão "Grifar" → vira tópico no painel lateral. Clicar no tópico scrolla até o trecho com flash.
- **Sync na nuvem** — tabela `documents` no mesmo Supabase (SQL acima).

Nada da home atual (`/`) é afetado — pode mergear a feature sem risco pros boards em produção.

</details>

<br />

---

<br />

## Arquitetura

```
src/
├── App.tsx                     Router: splash → login → workspace
├── components/
│   ├── Card.tsx                Card com status, badges, archive
│   ├── CardDetailModal.tsx     Modal: descrição, resolução, impedimento, melhorias
│   ├── Column.tsx              Coluna sortable + resize + status dropdown
│   ├── ArchiveDrawer.tsx       Drawer lateral de arquivados
│   ├── ConfirmModal.tsx        Modal genérico de confirmação
│   ├── NewCardForm.tsx         Input inline pra criar card
│   └── SplashScreen.tsx        Animação SVG de entrada
├── pages/
│   ├── HomePage.tsx            Grid de boards, CRUD, transições
│   ├── BoardPage.tsx           Kanban com header, menu, sync
│   ├── LoginPage.tsx           Login/signup animado
│   └── ConfigErrorPage.tsx     Fallback: env vars faltando
├── hooks/
│   ├── useBoard.ts             Workspace multi-board + sync Supabase
│   ├── useAuth.ts              Auth (username → email sintético @ohpe.local)
│   └── useTheme.ts             Toggle claro/escuro
├── lib/
│   └── supabase.ts             Client com fallback gracioso
├── types/
│   └── board.ts                Board, Card, Column, Workspace, Status
└── styles/
    ├── globals.css              Tokens, tema escuro, view transitions
    ├── board.css                Board, cards, colunas, status
    ├── home.css                 Home grid, background tech
    ├── login.css                Login animado
    ├── modal.css                Layout de modal
    └── splash.css               Timeline da splash
```

<br />

## Atalhos

| Ação | |
|---|---|
| Criar card | `+` → digite → **Enter** |
| Detalhes do card | Clique no card |
| Editar nota | Ícone de lápis no modal |
| Status do card | Dropdown no modal |
| Arquivar | Ícone no card |
| Renomear coluna | Clique no título |
| Reordenar colunas | Drag pelo grip |
| Redimensionar | Arrastar borda direita |
| Voltar pra home | `←` no header |
| Download/Import | Menu `⋮` |
| Trocar tema | Sol/lua no header |

<br />

## Paleta

<table>
<tr>
<th>Token</th>
<th>Light</th>
<th>Dark</th>
<th></th>
</tr>
<tr>
<td><code>--brand-primary</code></td>
<td><code>#2b4c7e</code></td>
<td><code>#6f97d3</code></td>
<td>Marca, foco, acento forte</td>
</tr>
<tr>
<td><code>--brand-secondary</code></td>
<td><code>#567ebb</code></td>
<td><code>#94b3e5</code></td>
<td>Bordas, gradientes</td>
</tr>
<tr>
<td><code>--text-primary</code></td>
<td><code>#1f1f20</code></td>
<td><code>#eef1f7</code></td>
<td>Texto principal</td>
</tr>
<tr>
<td><code>--text-muted</code></td>
<td><code>#606d80</code></td>
<td><code>#8a97ae</code></td>
<td>Texto secundário</td>
</tr>
<tr>
<td><code>--surface-card</code></td>
<td><code>#ffffff</code></td>
<td><code>#1c2029</code></td>
<td>Fundo de cards</td>
</tr>
</table>

<br />

## Roadmap

- [x] Temas claro/escuro
- [x] Import/export JSON
- [x] Múltiplos boards
- [x] Login e sync na nuvem
- [x] Status tags com cores
- [x] Arquivar cards
- [ ] Atalhos de teclado globais
- [ ] Undo/redo
- [ ] Supabase Realtime (sync sem refresh)
- [ ] Compartilhar board entre contas

<br />

---

<br />

<div align="center">

<sub>MIT © Enzo</sub>

<br />
<br />

<sub>
  Feito com
  <img src="public/brand-mark.svg" alt="" width="12" height="12" align="center" />
  e um pouco de café.
</sub>

</div>
