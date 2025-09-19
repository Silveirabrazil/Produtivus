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

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['page_id']) || !isset($input['content'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Dados inválidos. page_id e content são obrigatórios.'
    ]);
    exit;
}

// Simular salvamento bem-sucedido
echo json_encode([
    'success' => true,
    'message' => 'Conteúdo salvo com sucesso! (modo demonstração)',
    'page_id' => $input['page_id'],
    'timestamp' => date('Y-m-d H:i:s'),
    'source' => 'hardcoded'
]);
?>
