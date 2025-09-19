# Guia de Manutenção - Produtivus 3.0

## 🔧 Tarefas de Manutenção Regular

### Limpeza Semanal
```bash
# Limpar logs antigos (manter últimos 7 dias)
find logs/ -name "*.log" -mtime +7 -delete

# Verificar espaço em disco
df -h

# Otimizar banco de dados
php tools/optimize-database.php
```

### Limpeza Mensal
```bash
# Limpar cache de sessões expiradas
php server/api/cleanup-sessions.php

# Verificar integridade dos dados
php tools/verify-data-integrity.php

# Backup incremental
php tools/backup-data.php --incremental
```

## 📊 Monitoramento

### Métricas Importantes
- **Performance**: Tempo de resposta das APIs < 200ms
- **Disponibilidade**: Uptime > 99.5%
- **Erros**: Taxa de erro < 1%
- **Uso de memória**: < 80% da capacidade

### Alerts Automatizados
```bash
# Configurar alertas para:
# - Espaço em disco < 10%
# - Memória > 90%
# - CPU > 95% por > 5min
# - Erros 5xx > 10/min
```

## 🗄️ Backup e Recuperação

### Estratégia de Backup
1. **Diário**: Banco de dados (dump completo)
2. **Semanal**: Arquivos estáticos
3. **Mensal**: Backup completo do sistema

### Scripts de Backup
```bash
# Backup automático
0 2 * * * /usr/bin/php /path/to/tools/backup-daily.php
0 3 * * 0 /usr/bin/php /path/to/tools/backup-weekly.php
0 4 1 * * /usr/bin/php /path/to/tools/backup-monthly.php
```

## 🔄 Atualizações

### Processo de Atualização
1. **Desenvolvimento**
   ```bash
   git checkout develop
   git pull origin develop
   npm install
   npm run build:css
   npm --prefix apps/sheets run build
   npm --prefix apps/mindmaps run build
   ```

2. **Testes**
   ```bash
   php tools/run-tests.php
   npm test
   ```

3. **Deploy**
   ```bash
   git checkout main
   git merge develop
   git push origin main
   ```

### Rollback
```bash
# Em caso de problemas
git checkout main
git reset --hard HEAD~1
git push origin main --force
```

## 🛠️ Resolução de Problemas

### Problemas Comuns

#### 1. Performance Degradada
```bash
# Verificar queries lentas
php tools/analyze-slow-queries.php

# Verificar uso de recursos
top -p $(pgrep php)

# Otimizar cache
php tools/clear-cache.php --rebuild
```

#### 2. Erros de Banco de Dados
```bash
# Verificar conexões
php tools/test-database.php

# Reparar tabelas
php tools/repair-database.php

# Verificar logs
tail -f logs/database.log
```

#### 3. Aplicações Vue.js não Carregam
```bash
# Verificar build
npm --prefix apps/sheets run build
npm --prefix apps/mindmaps run build

# Verificar permissões
chmod -R 755 dist/

# Verificar logs do navegador
# Console > Network > verificar 404s
```

## 📈 Otimização

### Performance Web
```bash
# Compressão de assets
gzip -9 css/styles.css
gzip -9 js/main.js

# Otimização de imagens
for img in img/*.{jpg,png}; do
  convert "$img" -quality 85 "$img"
done

# Minificação
npm run build --production
```

### Performance do Banco
```sql
-- Índices importantes
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_events_date_range ON events(start_date, end_date);
CREATE INDEX idx_notes_search ON notes(title, content);

-- Análise de performance
ANALYZE TABLE tasks, events, notes, users;
```

## 🔐 Segurança

### Auditoria de Segurança
```bash
# Verificar vulnerabilidades
php tools/security-audit.php

# Verificar permissões de arquivos
find . -type f -perm 777 -ls

# Verificar logs de acesso
grep "401\|403\|404" logs/access.log | tail -20
```

### Atualizações de Segurança
```bash
# Atualizar dependências PHP
composer update --with-dependencies

# Atualizar dependências Node.js
npm audit fix

# Verificar CVEs
npm audit
```

## 📋 Checklist de Manutenção

### Diário
- [ ] Verificar logs de erro
- [ ] Monitorar performance
- [ ] Verificar backups automáticos
- [ ] Responder a alertas

### Semanal
- [ ] Analisar métricas de uso
- [ ] Limpar logs antigos
- [ ] Verificar espaço em disco
- [ ] Testar restore de backup

### Mensal
- [ ] Auditoria de segurança
- [ ] Atualizações de dependências
- [ ] Otimização do banco de dados
- [ ] Revisão de performance
- [ ] Documentação atualizada

### Trimestral
- [ ] Backup completo do sistema
- [ ] Teste de disaster recovery
- [ ] Revisão de capacidade
- [ ] Planejamento de atualizações

## 🚨 Procedimentos de Emergência

### Sistema Fora do Ar
1. Verificar logs: `tail -f logs/app.log`
2. Verificar serviços: `systemctl status apache2 mysql`
3. Reiniciar serviços: `systemctl restart apache2`
4. Notificar usuários via status page

### Corrupção de Dados
1. Parar aplicação
2. Restaurar último backup válido
3. Verificar integridade
4. Testar funcionalidades
5. Comunicar downtime

### Ataque de Segurança
1. Bloquear IPs suspeitos
2. Trocar senhas críticas
3. Analisar logs de acesso
4. Aplicar patches de segurança
5. Notificar usuários se necessário

## 📞 Contatos de Emergência

### Equipe Técnica
- **SysAdmin**: [telefone/email]
- **Developer Lead**: [telefone/email]
- **Database Admin**: [telefone/email]

### Fornecedores
- **Hosting**: [contato]
- **CDN**: [contato]
- **Monitoramento**: [contato]

---

**Versão**: 1.0
**Última revisão**: Setembro 2025
