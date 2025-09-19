<?php
// Configuração simplificada de banco para desenvolvimento local
// Usando SQLite para facilitar o setup inicial

header('Content-Type: application/json; charset=utf-8');

// Configuração SQLite para desenvolvimento local
$sqliteDbPath = __DIR__ . '/../data/produtivus.sqlite';

// Criar diretório data se não existir
if (!is_dir(dirname($sqliteDbPath))) {
    mkdir(dirname($sqliteDbPath), 0755, true);
}

try {
    $conn = new PDO("sqlite:$sqliteDbPath");
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    // Criar tabelas se não existirem
    $conn->exec("
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ");

    $conn->exec("
        CREATE TABLE IF NOT EXISTS notebooks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            color TEXT,
            subject_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ");

    $conn->exec("
        CREATE TABLE IF NOT EXISTS notebook_contents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            notebook_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            format TEXT DEFAULT 'html',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (notebook_id) REFERENCES notebooks (id),
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ");

    // Inserir usuário padrão se não existir
    $userCheck = $conn->query("SELECT COUNT(*) FROM users WHERE email = 'user@example.com'")->fetchColumn();
    if ($userCheck == 0) {
        $conn->exec("
            INSERT INTO users (name, email, password)
            VALUES ('Usuário Demo', 'user@example.com', 'demo123')
        ");
    }

    // Inserir cadernos de exemplo se não existirem
    $notebookCheck = $conn->query("SELECT COUNT(*) FROM notebooks")->fetchColumn();
    if ($notebookCheck == 0) {
        $conn->exec("
            INSERT INTO notebooks (user_id, title, color) VALUES
            (1, 'Planejamento Estratégico 2024', '#007bff'),
            (1, 'Ata da Reunião - Diretoria', '#28a745'),
            (1, 'Ideias de Projeto', '#ffc107')
        ");

        $conn->exec("
            INSERT INTO notebook_contents (notebook_id, user_id, content) VALUES
            (1, 1, '<h2>Planejamento Estratégico 2024</h2><p>Objetivos e metas para o próximo ano...</p><ul><li>Aumentar vendas em 20%</li><li>Expandir para novos mercados</li><li>Melhorar atendimento ao cliente</li></ul>'),
            (2, 1, '<h2>Ata da Reunião</h2><p><strong>Data:</strong> 20/01/2024</p><p><strong>Participantes:</strong> João, Maria, Pedro</p><h3>Pautas Discutidas:</h3><ol><li>Análise do trimestre anterior</li><li>Novos projetos</li><li>Orçamento 2024</li></ol>'),
            (3, 1, '<h2>Brainstorming - Novos Projetos</h2><p>Lista de ideias inovadoras:</p><ul><li><strong>App Mobile:</strong> Aplicativo para gestão de tarefas</li><li><strong>E-commerce:</strong> Loja online para produtos locais</li><li><strong>Sistema CRM:</strong> Gerenciamento de clientes</li></ul>')
        ");
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro de conexão ao banco de dados SQLite: ' . $e->getMessage()
    ]);
    exit;
}
?>
