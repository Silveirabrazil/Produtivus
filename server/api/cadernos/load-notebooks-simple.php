<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Dados de exemplo hardcoded para demonstração
$notebooks = [
    [
        'id' => 1,
        'title' => 'Planejamento Estratégico 2024',
        'content' => '<h2>Planejamento Estratégico 2024</h2><p>Objetivos e metas para o próximo ano...</p><ul><li>Aumentar vendas em 20%</li><li>Expandir para novos mercados</li><li>Melhorar atendimento ao cliente</li></ul>',
        'color' => '#007bff',
        'created_at' => '2024-01-15',
        'updated_at' => '2024-01-15'
    ],
    [
        'id' => 2,
        'title' => 'Ata da Reunião - Diretoria',
        'content' => '<h2>Ata da Reunião</h2><p><strong>Data:</strong> 20/01/2024</p><p><strong>Participantes:</strong> João, Maria, Pedro</p><h3>Pautas Discutidas:</h3><ol><li>Análise do trimestre anterior</li><li>Novos projetos</li><li>Orçamento 2024</li></ol>',
        'color' => '#28a745',
        'created_at' => '2024-01-20',
        'updated_at' => '2024-01-20'
    ],
    [
        'id' => 3,
        'title' => 'Ideias de Projeto',
        'content' => '<h2>Brainstorming - Novos Projetos</h2><p>Lista de ideias inovadoras:</p><ul><li><strong>App Mobile:</strong> Aplicativo para gestão de tarefas</li><li><strong>E-commerce:</strong> Loja online para produtos locais</li><li><strong>Sistema CRM:</strong> Gerenciamento de clientes</li></ul>',
        'color' => '#ffc107',
        'created_at' => '2024-01-25',
        'updated_at' => '2024-01-25'
    ]
];

echo json_encode([
    'success' => true,
    'notebooks' => $notebooks,
    'source' => 'hardcoded',
    'message' => 'Dados de exemplo carregados com sucesso!'
]);
?>
