<?php
// Teste simples da API
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

// Simular autenticação sempre OK para testes locais
$_SESSION['user_id'] = 1;
$_SESSION['authenticated'] = true;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode([
        'success' => true,
        'message' => 'API de teste funcionando',
        'timestamp' => date('Y-m-d H:i:s'),
        'tasks' => [
            [
                'id' => 1,
                'title' => 'Tarefa de Exemplo',
                'description' => 'Descrição de exemplo',
                'start' => '2025-09-30T10:00:00',
                'end' => '2025-09-30T11:00:00',
                'color' => '#6A9BD1',
                'done' => false,
                'meta' => null
            ]
        ]
    ]);
} else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    echo json_encode([
        'success' => true,
        'message' => 'Tarefa/Aula criada com sucesso',
        'id' => rand(2, 1000),
        'data' => $input,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
}
?>
