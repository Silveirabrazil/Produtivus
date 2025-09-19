<?php
// server/api/oauth_config.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

try {
    // Fontes possíveis de configuração
    $jsonPath = __DIR__ . '/../config/oauth.json';
    $appPhpPath = __DIR__ . '/../config/app.php';

    $clientId = '';

    if (file_exists($jsonPath)) {
        $json = json_decode(file_get_contents($jsonPath), true);
        if (is_array($json) && !empty($json['googleClientId'])) {
            $clientId = $json['googleClientId'];
        }
    }

    if (!$clientId && file_exists($appPhpPath)) {
        $config = require $appPhpPath;
        if (is_array($config) && isset($config['google']['client_id'])) {
            $clientId = (string)$config['google']['client_id'];
        }
    }

    if ($clientId) {
        $response = [
            'success' => true,
            'googleClientId' => $clientId,
            'calendarSupport' => true
        ];
    } else {
        $response = [
            'success' => false,
            'googleClientId' => '',
            'calendarSupport' => false,
            'message' => 'Client ID não configurado'
        ];
    }

    echo json_encode($response);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'googleClientId' => '',
        'calendarSupport' => false,
        'message' => 'Erro ao carregar configuração OAuth'
    ]);
}
?>
