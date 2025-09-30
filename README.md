# Produtivus 3.0 - Sistema de Produtividade Acadêmica

## 📋 Sobre o Projeto

O Produtivus 3.0 é um sistema web completo para gerenciamento de produtividade acadêmica, incluindo tarefas, calendário, cadernos de anotações, mapas mentais e planilhas interativas.

## 🏗️ Arquitetura do Sistema

### Frontend
- **Tecnologia Principal**: HTML5, CSS3, JavaScript ES6+
- **Framework CSS**: Bootstrap 5 com customizações SCSS
- **Aplicações Especializadas**: Vue.js + Vite para aplicações complexas
- **Bibliotecas Principais**:
  - FullCalendar (calendário)
  - Handsontable (planilhas)
  - Chart.js (gráficos)

### Backend
- **Linguagem**: PHP 8.0+
- **Banco de Dados**: MySQL/MariaDB
- **API**: RESTful com autenticação JWT
- **Servidor**: Apache/Nginx compatível

## 📁 Estrutura de Diretórios

```
Produtivus-3.0.0.0/
├── 📁 apps/                    # Aplicações especializadas (Vue.js)
│   ├── mindmaps/               # Editor de mapas mentais
│   └── sheets/                 # Editor de planilhas
├── 📁 css/                     # Estilos e recursos visuais
│   ├── app.css                 # CSS compilado (novo entrypoint)
│   ├── fonts/                  # Fontes personalizadas
│   ├── fullcalendar/          # Estilos do calendário
│   └── scss/                   # Código fonte SCSS
├── 📁 docs/                    # Documentação e design
│   ├── base.html               # Template base
│   └── modelo.html             # Modelo de referência
├── 📁 js/                      # JavaScript modular
│   ├── modules/                # Módulos principais
│   ├── pages/                  # Scripts específicos de páginas
│   ├── vendor/                 # Bibliotecas externas
│   └── debug/                  # Ferramentas de debug
├── 📁 server/                  # Backend PHP
│   ├── api/                    # Endpoints da API
│   ├── config/                 # Configurações
│   └── data/                   # Dados e schemas
├── 📁 tools/                   # Ferramentas de diagnóstico
│   ├── diagnostic.php          # Diagnóstico do sistema
│   ├── verify-sheets.php       # Verificação de planilhas
│   └── tests/                  # Testes automatizados
├── 📁 scripts/                 # Scripts utilitários
│   └── deploy/                 # Scripts de deploy
│       ├── deploy-sheets.ps1   # Deploy das planilhas (Windows)
│       └── deploy-sheets.sh    # Deploy das planilhas (Unix)
├── 📁 inc/                     # Includes e componentes
├── 📁 img/                     # Imagens e assets
├── 📁 logs/                    # Logs da aplicação
├── 📁 config/                  # Configurações globais
└── 📁 dist/                    # Builds de produção
```

## 🚀 Início Rápido

### Pré-requisitos
- PHP 8.0 ou superior
- MySQL/MariaDB
- Node.js 16+ (para aplicações Vue.js)
- Servidor web (Apache/Nginx)

### Configuração Inicial

1. **Clone o repositório**
   ```bash
   git clone [url-do-repositorio]
   cd Produtivus-3.0.0.0
   ```

2. **Configure o ambiente**
   ```bash
   cp .env.example .env
   # Edite o .env com suas configurações
   ```

3. **Instale dependências**
   ```bash
   npm install
   cd apps/mindmaps && npm install
   cd ../sheets && npm install
   ```

4. **Configure o banco de dados**
   ```bash
   php server/start-server.php
   ```

5. **Scripts úteis**
   - Deploy das planilhas: `scripts/deploy/deploy-sheets.ps1` (Windows) ou `scripts/deploy/deploy-sheets.sh` (Unix)
   - Inicialização de dados (dev): `server/init-database.php`
   ```bash
   npm run build:css
   npm --prefix apps/mindmaps run build
   npm --prefix apps/sheets run build
   ```

## 🔧 Scripts Disponíveis

### Build e Desenvolvimento
```bash
npm run build:css              # Compila SCSS para CSS
npm run dev:css                # Watch mode para CSS
```

### Aplicações Especializadas
```bash
# Mapas Mentais
npm --prefix apps/mindmaps run dev     # Desenvolvimento
npm --prefix apps/mindmaps run build   # Produção

# Planilhas
npm --prefix apps/sheets run dev       # Desenvolvimento
npm --prefix apps/sheets run build     # Produção
```

### Diagnóstico
```bash
php tools/diagnostic.php              # Diagnóstico completo
php tools/verify-sheets.php           # Verifica planilhas
```

## 📚 Módulos Principais

### 🗂️ Sistema de Tarefas
- **Arquivo**: `tarefas.html`, `js/modules/tasks/`
- **Funcionalidades**: CRUD completo, categorização, prioridades, sincronização
- **API**: `server/api/tasks.php`

### 📅 Calendário
- **Arquivo**: `calendario.html`, `js/calendar-init.js`
- **Tecnologia**: FullCalendar v6
- **Funcionalidades**: Eventos, lembretes, integração com tarefas

### 📝 Cadernos
- **Arquivo**: `cadernos.html`, `js/modules/notebooks/`
- **Funcionalidades**: Editor rich text, categorias, busca

### 🧠 Mapas Mentais
- **Aplicação**: `apps/mindmaps/`
- **Tecnologia**: Vue.js + Canvas API
- **Build**: Vite + TypeScript

### 📊 Planilhas
- **Aplicação**: `apps/sheets/`
- **Tecnologia**: Vue.js + Handsontable
- **Funcionalidades**: Fórmulas, gráficos, colaboração

## 🔐 Autenticação e Segurança

### Sistema de Login
- **Autenticação**: JWT + localStorage
- **Proteção**: Guards em todas as rotas
- **Fallback**: Modo offline com dados locais

### Configuração de Segurança
```javascript
// Configuração no .env
JWT_SECRET=sua_chave_secreta
SESSION_TIMEOUT=3600
API_RATE_LIMIT=100
```

## 🎨 Sistema de Temas

### SCSS Modular
```scss
// Arquivo principal: css/scss/styles.scss
@import 'utilities';     // Variáveis e mixins
@import 'overrides';     // Overrides do Bootstrap
@import 'component-template'; // Template de componentes
```

### Fontes Personalizadas
- **Dosis**: Font principal (200-800 weights)
- **Material Symbols**: Ícones do Google

## 🧪 Testes e Qualidade

### Estrutura de Testes
```bash
tools/tests/                   # Testes automatizados
├── unit/                      # Testes unitários
├── integration/               # Testes de integração
└── e2e/                       # Testes end-to-end
```

### Ferramentas de Debug
- `js/debug/session-debug.js`: Debug de sessões
- `tools/diagnostic.php`: Diagnóstico completo do sistema
- Console do navegador com logs estruturados

## 📱 Responsividade

### Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Componentes Responsivos
Todos os módulos são totalmente responsivos usando CSS Grid e Flexbox.

## 🔄 Deploy e Produção

### Checklist de Deploy
1. ✅ Build das aplicações Vue.js
2. ✅ Compilação CSS/SCSS
3. ✅ Configuração do .env
4. ✅ Migração do banco de dados
5. ✅ Teste das APIs
6. ✅ Verificação de permissões

### Monitoramento
- Logs em `logs/app.log`
- Diagnóstico via `tools/diagnostic.php`
- Health check nas APIs

## 🤝 Contribuição

### Padrões de Código
- **JavaScript**: ES6+ com módulos
- **CSS**: SCSS com metodologia BEM
- **PHP**: PSR-12 standard
- **Commits**: Conventional Commits

### Estrutura de Branch
- `main`: Produção estável
- `develop`: Desenvolvimento ativo
- `feature/*`: Novas funcionalidades
- `hotfix/*`: Correções urgentes

## 📞 Suporte

### Logs e Debug
```bash
# Verificar logs
tail -f logs/app.log

# Diagnóstico completo
php tools/diagnostic.php

# Verificar status das aplicações
curl http://localhost:8080/server/api/health
```

### Problemas Comuns
1. **Build falhando**: Verificar versões Node.js e dependências
2. **API não responde**: Verificar configurações PHP e banco
3. **CSS não carrega**: Executar `npm run build:css`

---

**Versão**: 3.0.0
**Última atualização**: Setembro 2025
**Mantido por**: Equipe Produtivus
