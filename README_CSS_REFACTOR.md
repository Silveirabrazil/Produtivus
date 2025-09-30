# Convenção CSS / SCSS (Refatorado)

Objetivo: Controle total, zero surpresa, 1 componente = 1 arquivo.

## Estrutura
```
css/scss/
  app.scss              # Entrada única
  settings/             # Variáveis e mixins
  components/           # Componentes autocontidos (header, cards, buttons...)
  apps/                 # Estilos específicos de apps (sheets, mindmaps)
  pages/                # Só se MUITO específico de uma página
  utilities/            # Poucas utilidades genéricas
  legacy/ (temporário)  # Código antigo até remoção
```

## Regras Gerais
1. Não criar layers complexos, ordem já resolvida em `app.scss`.
2. Nome de classe deve aparecer em algum SCSS – se está no HTML e não existe, crie.
3. Componentes: prefixo opcional `com-` se houver risco de colisão; caso contrário usar nomes claros (`header`, `card`, `modal`).
4. Subpartes: usar BEM simples (`.header__brand`, `.card__title`).
5. Estados: `.is-active`, `.is-open`, `.is-loading`; nunca embutir estado estilístico no HTML sem classe.
6. Nada de !important exceto para hotfix temporário (remover depois).
7. Variáveis CSS no `:root` são a fonte primária. Variáveis SASS só se precisar cálculo interno.
8. Dark mode: usar variante `body.dark` e só implementar quando necessário.
9. Tamanho de arquivo: se um componente passar de ~300 linhas, dividir em sub-arquivos opcionais (ex: `_header.nav.scss`) importados dentro de `_header.scss`.

## Ordem Dentro de um Arquivo de Componente
1. Comentário título + função
2. Variáveis locais (se houver)
3. Estrutura base do container
4. Elementos internos (sub-blocos)
5. Estados/modificadores
6. Responsividade
7. Dark mode

## Responsividade
Media queries próximas do bloco que alteram (não criar arquivo separado só para mobile).

## Utilidades (utilities/)
Somente classes realmente repetitivas (ex: `.u-flex-center`, `.u-hidden`). Se começar a virar framework, parar e promover a lógica a componente.

## Processo de Nova Feature
1. Criar HTML com classes claras.
2. Criar/abrir componente correspondente.
3. Adicionar estilos ali mesmo.
4. Rodar `npm run build:app-css`.
5. (Opcional) Rodar auditoria: `node scripts/audit-missing-classes.js`.

## Auditoria de Classes
Script: `node scripts/audit-missing-classes.js`
- Lista classes em HTML/PHP que não possuem definição em nenhum SCSS novo.

## Remoção do Legado
- `styles.css` e pastas antigas só permanecem até migrarmos todos os componentes principais.
- Quando zerar dependência visual, remover link em `head.php` e deletar diretórios antigos.

## Hotfix Rápido
Se precisar ajuste emergencial: adicionar direto no componente afetado; evitar criar novo “override global”.

## Checklist Ao Criar Componente
- [ ] HTML possui classes semanticamente claras
- [ ] SCSS criado/atualizado no arquivo único do componente
- [ ] Sem dependência implícita de outro componente
- [ ] Testado em mobile básico (largura < 900px)
- [ ] Variáveis reutilizam :root quando aplicável

---
Dúvidas futuras: manter este guia curto. Se crescer demais, dividir em FAQ separado.

---

## Estado Final (Pós-Remoção do Bootstrap)

Bootstrap e dependências relacionadas foram totalmente eliminados da base de código. A UI agora é sustentada apenas pelo design system custom em português, com componentes semânticos e utilidades enxutas.

### Componentes Principais
- `.botao` (+ modificadores `--primario`, `--suave`, `--perigo`, `--pequeno` etc.)
- `.campo` (inputs e selects padronizados)
- `.janela` (modal / diálogo acessível com trap de foco e backdrop custom)
- Hero: `.hero-slides`, `.hero-slide`, `.hero-dots`, `.hero-control--prev/--next`, `.hero-pause`
- Estruturas de layout: `.page-shell`, `.page-section`, `.grade` (variações: `grade--auto4`, `grade--duas`), `.coluna`, `.bloco`
- Utilidades de alinhamento / espaçamento: `flexo`, `alinhamento-centro`, `espaco-entre`, `gap-sm/gap-md/gap-lg`, `mt-*`, `mb-*`, etc.

### Acessibilidade
- Modais: foco inicial automático, fechamento por ESC e clique fora, ciclo de tabulação.
- Carrossel: `role="group"`, `aria-roledescription="slide"`, `aria-label` por slide, pausa por foco/teclado, controle por setas e espaço.
- Toasts: `role="alert"`, região viva dedicada `#pv-avisos`.

### API JS de UI
Arquivo `js/modules/ui.js` reescrito sem Bootstrap. Fornece:
```
pvShowToast(mensagem, { timeout, background, color })
pvShowConfirm(mensagem) -> Promise<boolean>
pvShowPrompt(mensagem, valorInicial) -> Promise<string|null>
pvShowSelect(mensagem, options:[{value,label}], allowEmpty) -> Promise<string|null>
```

### Itens Removidos
- `js/modules/bootstrapInit.js`
- `js/hero-carousel.js` (substituído por `js/carrossel.js` com nomes definitivos)
- `js/estudos.js` legado (substituído por `js/pages/estudos.js`)
- Aliases antigos `carrossel__*` nos scripts e SCSS
- Todas as referências a `data-bs-*`
- Dependência visual de `.btn`, `.form-control`, `.modal`, `.accordion` etc.
- Conteúdo do arquivo `_compat_bootstrap.scss` (agora marcador vazio)

### Itens Mantidos Temporariamente
- `bootstrap-shim.js` (pode ser removido quando confirmarmos 0 chamadas herdadas a APIs bootstrap.* em scripts externos ou caches). Buscar por `bootstrap.` antes de excluir.

### Como Verificar que Está Limpo
Executar busca (grep) por termos:
```
bootstrap.
data-bs-
carrossel__
.btn
.form-control
```
Resultado atual: zero ocorrências relevantes (apenas comentários / shim).

### Próximas Evoluções (Opcional)
- Implementar tema escuro real (usar `body.tema-escuro`).
- Consolidar variáveis de cor para escalas (ex: `--cor-superficie-*`).
- Criar componente de toast estilizado reutilizando tokens (remover estilos inline atuais em `pvShowToast`).
- Converter `bootstrap-shim.js` em no-op e depois excluir.

### Decisão de Arquitetura
Preferimos classes semânticas em PT-BR para manter proximidade com domínio e reduzir atrito cognitivo. Utilidades existem apenas quando comprovado reuso (anti-mini-framework). Qualquer expansão deve ser motivada por repetição real em mais de 2 contextos.

---
Última atualização: (refatoração final Bootstrap) – verificar commit associado.
