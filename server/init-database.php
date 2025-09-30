<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

echo "=== Inicializando Banco de Dados ===\n\n";

try {
    // Conectar ao banco (ajuste conforme suas credenciais)
    $pdo = new PDO('mysql:host=localhost;dbname=produtivus', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "✅ Conectado ao MySQL\n";

    // Criar usuário guest se não existir
    $stmt = $pdo->prepare("SELECT id FROM users WHERE id = 'guest'");
    $stmt->execute();

    if (!$stmt->fetch()) {
        $pdo->exec("INSERT INTO users (id, name, email, created_at) VALUES ('guest', 'Usuário Convidado', 'guest@exemplo.com', NOW())");
        echo "✅ Usuário guest criado\n";
    } else {
        echo "ℹ️ Usuário guest já existe\n";
    }

    // Criar matérias de exemplo
    $subjects = [
        ['id' => 'math_001', 'name' => 'Matemática', 'color' => '#3b82f6'],
        ['id' => 'port_001', 'name' => 'Português', 'color' => '#ef4444'],
        ['id' => 'hist_001', 'name' => 'História', 'color' => '#10b981']
    ];

    foreach ($subjects as $subject) {
        $stmt = $pdo->prepare("SELECT id FROM study_subjects WHERE id = ? AND user_id = 'guest'");
        $stmt->execute([$subject['id']]);

        if (!$stmt->fetch()) {
            $stmt2 = $pdo->prepare("INSERT INTO study_subjects (id, user_id, name, color, created_at) VALUES (?, 'guest', ?, ?, NOW())");
            $stmt2->execute([$subject['id'], $subject['name'], $subject['color']]);
            echo "✅ Matéria '{$subject['name']}' criada\n";
        } else {
            echo "ℹ️ Matéria '{$subject['name']}' já existe\n";
        }
    }

    // Criar cadernos de exemplo
    $notebooks = [
        ['id' => 'nb_001', 'title' => 'Álgebra Linear', 'subject_id' => 'math_001'],
        ['id' => 'nb_002', 'title' => 'Geometria', 'subject_id' => 'math_001'],
        ['id' => 'nb_003', 'title' => 'Literatura Brasileira', 'subject_id' => 'port_001']
    ];

    foreach ($notebooks as $notebook) {
        $stmt = $pdo->prepare("SELECT id FROM notebooks WHERE id = ? AND user_id = 'guest'");
        $stmt->execute([$notebook['id']]);

        if (!$stmt->fetch()) {
            $stmt2 = $pdo->prepare("INSERT INTO notebooks (id, user_id, title, subject_id, created_at) VALUES (?, 'guest', ?, ?, NOW())");
            $stmt2->execute([$notebook['id'], $notebook['title'], $notebook['subject_id']]);
            echo "✅ Caderno '{$notebook['title']}' criado\n";
        } else {
            echo "ℹ️ Caderno '{$notebook['title']}' já existe\n";
        }
    }

    // Criar páginas de exemplo
    $pages = [
        [
            'id' => 'pg_001',
            'title' => 'Matrizes e Determinantes',
            'content' => 'Introdução a matrizes e determinantes...',
            'notebook_id' => 'nb_001'
        ],
        [
            'id' => 'pg_002',
            'title' => 'Vetores e Espaços Vetoriais',
            'content' => 'Definições e propriedades de espaços vetoriais...',
            'notebook_id' => 'nb_001'
        ],
        [
            'id' => 'pg_003',
            'title' => 'Introdução à Literatura Brasileira',
            'content' => 'Períodos e autores importantes...',
            'notebook_id' => 'nb_003'
        ]
    ];

    foreach ($pages as $page) {
        $stmt = $pdo->prepare("SELECT id FROM notebook_pages WHERE id = ? AND user_id = 'guest'");
        $stmt->execute([$page['id']]);

        if (!$stmt->fetch()) {
            $stmt2 = $pdo->prepare("INSERT INTO notebook_pages (id, user_id, title, content, notebook_id, created_at) VALUES (?, 'guest', ?, ?, ?, NOW())");
            $stmt2->execute([$page['id'], $page['title'], $page['content'], $page['notebook_id']]);
            echo "✅ Página '{$page['title']}' criada\n";
        } else {
            echo "ℹ️ Página '{$page['title']}' já existe\n";
        }
    }

    echo "\n✅ Inicialização concluída com sucesso!\n";

} catch (PDOException $e) {
    echo "❌ Erro: " . $e->getMessage() . "\n";
}

echo "\n=== Teste as APIs agora ===\n";
?>
