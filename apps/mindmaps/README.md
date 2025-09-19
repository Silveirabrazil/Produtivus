# Mind Maps App (Vue + X6)

Editor de mapas mentais/organogramas com conectores inteligentes usando Vue 3 + Vite e @antv/x6.

## Desenvolvimento

```powershell
npm -C .\apps\mindmaps install
npm -C .\apps\mindmaps install @antv/x6 @antv/x6-plugin-selection @antv/x6-plugin-snapline @antv/x6-plugin-keyboard @antv/x6-plugin-history @antv/x6-plugin-transform @antv/x6-plugin-export
npm -C .\apps\mindmaps run dev -- --port 5173
```

Abra `mapas.html?app=vue`.

## Build de Produção

```powershell
npm -C .\apps\mindmaps run build
```

Gera arquivos em `apps/mindmaps/dist`. A página `mapas.html` tenta carregar automaticamente esse build (lendo `dist/manifest.json` ou `dist/.vite/manifest.json`). Se não houver build, mantém o editor antigo como fallback.

## Recursos

- Conectores com roteamento ortogonal/curvo, snapping, seleção múltipla, histórico, teclado.
- Formas: retângulo, elipse, losango. Preenchimento/borda, fonte e cor do texto.
- Duplo clique em nós para editar rótulo (modo Seleção).
- Importar/Exportar JSON, auto-save em `localStorage`.

## Integração

O app monta em um contêiner `#mm-vue-app` quando a página `mapas.html` encontra o manifest de `apps/mindmaps/dist`. Caso contrário, o editor legado permanece.
