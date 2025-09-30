# Instruções para Substituir Imagens do Carrossel

## Passos para substituir as imagens SVG pelas imagens reais:

### 1. Salvar as imagens dos anexos:
- Salve a primeira imagem (mulher com laptop e elementos criativos) como: `img/carousel-1.jpg`
- Salve a segunda imagem (grupo de estudantes) como: `img/carousel-2.jpg`
- Salve a terceira imagem (mulher estudando com livros) como: `img/carousel-3.jpg`
- Salve a quarta imagem (escritório moderno) como: `img/carousel-4.jpg`

### 2. Atualizar o HTML:
No arquivo `index.html`, altere as extensões de `.svg` para `.jpg`:
```html
<img src="img/carousel-1.jpg" class="d-block w-100 carousel-image" alt="...">
<img src="img/carousel-2.jpg" class="d-block w-100 carousel-image" alt="...">
<img src="img/carousel-3.jpg" class="d-block w-100 carousel-image" alt="...">
<img src="img/carousel-4.jpg" class="d-block w-100 carousel-image" alt="...">
```

### 3. Características das imagens:
- Dimensões recomendadas: 800x400px (proporção 2:1)
- Formato: JPG ou PNG
- Qualidade: Alta resolução para boa visualização

### 4. Funcionalidades do carrossel:
- ✅ Auto-play: Troca automática a cada 4 segundos
- ✅ Indicadores: Pontos na parte inferior para navegação
- ✅ Controles: Setas para navegação manual
- ✅ Responsivo: Adapta-se a diferentes tamanhos de tela
- ✅ Legendas: Título e descrição para cada slide
- ✅ Efeitos: Transições suaves e sombra

### 5. Customização adicional:
- Para alterar textos, edite as tags `<h5>` e `<p>` dentro de `.carousel-caption`
- Para ajustar tempo de transição, modifique `data-bs-interval="4000"` (em milissegundos)
- Para desabilitar auto-play, remova `data-bs-ride="carousel"`

### Localização dos arquivos:
- HTML: `/index.html` (linhas ~42-85)
- CSS: `/css/scss/_landing.scss` (a partir da linha ~60)
- Imagens: `/img/carousel-*.jpg`
