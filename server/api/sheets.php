<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/_session_bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'];
$userId = $_SESSION['user_id'] ?? 'guest';

switch ($method) {
    case 'GET':
        // Carregar planilha
        $sheetId = $_GET['id'] ?? null;
        if (!$sheetId) {
            echo json_encode(['error' => 'Sheet ID required']);
            http_response_code(400);
            exit();
        }
        loadSheet($userId, $sheetId);
        break;
    case 'POST':
        // Salvar planilha
        $data = json_decode(file_get_contents('php://input'), true);
    if (!$data || !isset($data['data'])) {
            echo json_encode(['error' => 'Invalid data']);
            http_response_code(400);
            exit();
        }
        saveSheet($userId, $data);
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function saveSheet($userId, $data) {
    $sheetId = $data['id'] ?? uniqid();
    // Aceita tanto array simples (apenas dados) quanto objeto com data+meta
    $payload = [
        'data' => $data['data'],
        'meta' => $data['meta'] ?? new stdClass(),
        'rows' => $data['rows'] ?? null,
        'cols' => $data['cols'] ?? null,
    // extras para restaurar totalmente a planilha
    'merges' => $data['merges'] ?? [],
    'conditional' => $data['conditional'] ?? new stdClass(),
    'alternating' => $data['alternating'] ?? new stdClass(),
    'altGroups' => $data['altGroups'] ?? new stdClass(),
    ];
    $filePath = __DIR__ . "/../data/sheets/{$userId}_{$sheetId}.json";

    if (!is_dir(dirname($filePath))) {
        mkdir(dirname($filePath), 0755, true);
    }

    file_put_contents($filePath, json_encode($payload, JSON_UNESCAPED_UNICODE));
    echo json_encode(['success' => true, 'id' => $sheetId]);
}

function loadSheet($userId, $sheetId) {
    $filePath = __DIR__ . "/../data/sheets/{$userId}_{$sheetId}.json";

    if (!file_exists($filePath)) {
        echo json_encode(['error' => 'Sheet not found']);
        http_response_code(404);
        exit();
    }

    $data = json_decode(file_get_contents($filePath), true);
    echo json_encode(['success' => true, 'data' => $data]);
}
?>
