# Email templates — Ohpe

Templates HTML com a identidade do Ohpe pra colar no painel do Supabase.
Dark mode automático (via `prefers-color-scheme`), mobile-friendly, layout em tabela
pra funcionar em Outlook/Gmail/Apple Mail.

## Como instalar

1. Supabase Dashboard → **Authentication → Email Templates**.
2. Pra cada template abaixo, abra o correspondente no painel e cole o HTML:

| Arquivo | Template no Supabase | Quando é enviado |
|---|---|---|
| `reset-password.html` | **Reset Password** | Usuário clica "Esqueci minha senha" |
| `change-email.html` | **Change Email Address** | Usuário migrando conta legada ou trocando email |
| `confirm-signup.html` | **Confirm signup** | Só é enviado se *Confirm email* estiver ligado em Auth → Providers → Email |

3. Em **Subject**, use algo curto. Sugestões:

| Template | Subject sugerido |
|---|---|
| Reset Password | `Nova senha pra sua conta Ohpe` |
| Change Email Address | `Confirma seu novo email no Ohpe` |
| Confirm signup | `Bem-vindo ao Ohpe — confirma seu email` |

4. **Save template** no painel.

## Variáveis

Os templates usam só as variáveis padrão do Supabase:

- `{{ .ConfirmationURL }}` — link da ação (reset / confirmar / etc.)
- `{{ .Email }}` — email do usuário (usado no change-email pra mostrar qual email está sendo confirmado)
- `{{ .SiteURL }}` — URL base configurada em *Auth → URL Configuration*

## Preview local

Pra ver como fica antes de colar, abre o arquivo direto no navegador:

```bash
open supabase/email-templates/reset-password.html
```

Os `{{ .ConfirmationURL }}` aparecem como literais — é só pra conferir layout.

## Dark mode

Os três templates respeitam `prefers-color-scheme: dark`. Em clientes modernos
(Gmail web, Apple Mail no macOS/iOS, Thunderbird), o email alterna sozinho.
Em Outlook o fundo fica no claro — é o esperado, Outlook não suporta a media query.

## Trocar paleta

As cores inline são:

- `#2b4c7e` — brand primary (botão, hero)
- `#567ebb` — brand secondary (hero gradient, links)
- `#1f1f20` — texto principal
- `#606d80` — texto discreto
- `#8a97ae` — texto muted no footer
- `#dce0e6` — fundo da página

Se mudar a paleta no app, atualize aqui também (dark mode usa os valores do
`:root[data-theme="dark"]` do `globals.css`).
