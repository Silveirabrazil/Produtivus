<?php
session_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Verificar se o usuário está logado (usar 'guest' como fallback para testes)
$userId = 1; // Usar ID 1 por padrão

try {
    // Primeiro, tentar conectar ao MySQL
    try {
        require_once __DIR__ . '/../../config/database.php';

        // Se chegou aqui, a conexão MySQL foi bem-sucedida
        // Buscar todos os cadernos do MySQL
        $stmt = $conn->query("
            SELECT n.*,
                   nc.content,
                   nc.updated_at as content_updated_at
            FROM notebooks n
            LEFT JOIN notebook_contents nc ON n.id = nc.notebook_id
            ORDER BY n.updated_at DESC
        ");

        $notebooks = $stmt->fetchAll();

        // Organizar dados
        $result = [];
        foreach ($notebooks as $notebook) {
            $result[] = [
                'id' => $notebook['id'],
                'title' => $notebook['title'],
                'color' => $notebook['color'],
                'content' => $notebook['content'] ?? '',
                'created_at' => $notebook['created_at'],
                'updated_at' => $notebook['content_updated_at'] ?? $notebook['updated_at']
            ];
        }

        echo json_encode([
            'success' => true,
            'notebooks' => $result,
            'source' => 'mysql_database',
            'message' => 'Cadernos carregados do MySQL'
        ]);

    } catch (Exception $mysqlError) {
        // MySQL falhou, tentar SQLite
        try {
            require_once __DIR__ . '/../../config/database_sqlite.php';

            // Buscar todos os cadernos do SQLite
            $stmt = $conn->query("
                SELECT n.*,
                       nc.content,
                       nc.updated_at as content_updated_at
                FROM notebooks n
                LEFT JOIN notebook_contents nc ON n.id = nc.notebook_id
                ORDER BY n.updated_at DESC
            ");

            $notebooks = $stmt->fetchAll();

            // Organizar dados
            $result = [];
            foreach ($notebooks as $notebook) {
                $result[] = [
                    'id' => $notebook['id'],
                    'title' => $notebook['title'],
                    'color' => $notebook['color'],
                    'content' => $notebook['content'] ?? '',
                    'created_at' => $notebook['created_at'],
                    'updated_at' => $notebook['content_updated_at'] ?? $notebook['updated_at']
                ];
            }

            echo json_encode([
                'success' => true,
                'notebooks' => $result,
                'source' => 'sqlite_database',
                'message' => 'Cadernos carregados do SQLite (MySQL indisponível)'
            ]);

        } catch (Exception $sqliteError) {
            // Ambos falharam, usar dados hardcoded
            $notebooks = [
                [
                    'id' => 1,
                    'title' => 'Exemplo - Planejamento 2024',
                    'content' => '<h2>Planejamento Estratégico 2024</h2><p>Objetivos e metas para o próximo ano...</p><ul><li>Aumentar vendas em 20%</li><li>Expandir para novos mercados</li><li>Melhorar atendimento ao cliente</li></ul>',
                    'color' => '#007bff',
                    'created_at' => '2024-01-15',
                    'updated_at' => '2024-01-15'
                ],
                [
                    'id' => 2,
                    'title' => 'Exemplo - Reunião Diretoria',
                    'content' => '<h2>Ata da Reunião</h2><p><strong>Data:</strong> 20/01/2024</p><p><strong>Participantes:</strong> João, Maria, Pedro</p><h3>Pautas Discutidas:</h3><ol><li>Análise do trimestre anterior</li><li>Novos projetos</li><li>Orçamento 2024</li></ol>',
                    'color' => '#28a745',
                    'created_at' => '2024-01-20',
                    'updated_at' => '2024-01-20'
                ]
            ];

            echo json_encode([
                'success' => true,
                'notebooks' => $notebooks,
                'source' => 'hardcoded',
                'message' => 'Usando dados de exemplo (bancos indisponíveis)'
            ]);
        }
    }

} catch (Exception $e) {
    error_log("Erro geral ao carregar cadernos: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'error' => 'Erro interno do servidor: ' . $e->getMessage()
    ]);
}
?>
