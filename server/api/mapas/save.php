<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

session_start();

// Verificar se o usuário está logado (opcional)
$user_id = $_SESSION['user_id'] ?? 'guest';

try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Salvar mapa mental
        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input) {
            throw new Exception('Dados inválidos');
        }

        $title = $input['title'] ?? 'Mapa Mental Sem Título';
        $data_content = $input['data'] ?? [];
        $timestamp = $input['timestamp'] ?? date('c');

        // Sanitizar título
        $title = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');

        // Definir arquivo de salvamento
        $data_dir = __DIR__ . '/../../data';
        if (!is_dir($data_dir)) {
            mkdir($data_dir, 0755, true);
        }

        $file_path = $data_dir . '/mapas_' . $user_id . '.json';

        // Dados a salvar
        $data = [
            'title' => $title,
            'data' => $data_content,
            'timestamp' => $timestamp,
            'user_id' => $user_id,
            'last_modified' => date('c')
        ];

        // Salvar arquivo
        $success = file_put_contents($file_path, json_encode($data, JSON_PRETTY_PRINT));

        if ($success === false) {
            throw new Exception('Erro ao salvar arquivo');
        }

        echo json_encode([
            'success' => true,
            'message' => 'Mapa mental salvo com sucesso',
            'timestamp' => date('c')
        ]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Carregar mapa mental
        $data_dir = __DIR__ . '/../../data';
        $file_path = $data_dir . '/mapas_' . $user_id . '.json';

        if (!file_exists($file_path)) {
            echo json_encode([
                'success' => false,
                'message' => 'Nenhum mapa mental encontrado',
                'data' => null
            ]);
            exit();
        }

        $content = file_get_contents($file_path);
        if ($content === false) {
            throw new Exception('Erro ao ler arquivo');
        }

        $data = json_decode($content, true);
        if (!$data) {
            throw new Exception('Dados corrompidos');
        }

        echo json_encode([
            'success' => true,
            'message' => 'Mapa mental carregado com sucesso',
            'data' => $data
        ]);

    } else {
        // Método não permitido
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'message' => 'Método não permitido'
        ]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
