<?php
// server/api/assistant.php — proxy simples para um provedor de IA (ex. Azure OpenAI)
// Requer sessão logada
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/_auth_guard.php';

// Carrega configuração segura
require_once __DIR__ . '/../../config/app.php';

$cfg = AIConfig::get();
if (!$cfg || empty($cfg['provider'])) {
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>'Configuração de IA ausente ou inválida.']);
    exit;
}

$provider = $cfg['provider'];

// Ler input
$input = json_decode(file_get_contents('php://input'), true);
$messages = isset($input['messages']) && is_array($input['messages']) ? $input['messages'] : [];
if (count($messages) === 0) {
    http_response_code(400);
    echo json_encode(['success'=>false,'message'=>'Informe messages.']);
    exit;
}

// Sanitizar: manter apenas role/content
$msgs = [];
foreach ($messages as $m) {
    if (!is_array($m)) continue;
    $role = isset($m['role']) ? (string)$m['role'] : '';
    $content = isset($m['content']) ? (string)$m['content'] : '';
    if ($role && $content) $msgs[] = ['role'=>$role, 'content'=>$content];
}
if (empty($msgs)) {
    http_response_code(400);
    echo json_encode(['success'=>false,'message'=>'Messages inválidas.']);
    exit;
}

// Função de chamada HTTP
function http_json($method, $url, $headers, $bodyArr) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $hdrs = [];
    foreach ($headers as $k=>$v) { $hdrs[] = $k.': '.$v; }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $hdrs);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($bodyArr));
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    if ($resp === false) {
        $err = curl_error($ch);
        curl_close($ch);
        return [null, $code ?: 500, 'Curl error: '.$err, null];
    }
    curl_close($ch);
    $json = json_decode($resp, true);
    return [$json, $code, null, $resp];
}

$replyText = null;
try {
    if ($provider === 'azure-openai') {
        $apiKey = $cfg['azure']['apiKey'] ?? '';
        $endpoint = rtrim($cfg['azure']['endpoint'] ?? '', '/');
        $deployment = $cfg['azure']['deployment'] ?? '';
        $apiVersion = $cfg['azure']['apiVersion'] ?? '2024-08-01-preview';
        if (!$apiKey || $apiKey === '__COLOQUE_SUA_CHAVE_AQUI__') throw new Exception('Chave da Azure OpenAI ausente na configuração');
        if (!$endpoint) throw new Exception('Endpoint da Azure OpenAI ausente na configuração');
        if (!$deployment) throw new Exception('Deployment da Azure OpenAI ausente na configuração');
        $url = "$endpoint/openai/deployments/$deployment/chat/completions?api-version=$apiVersion";
        $headers = [
            'Content-Type' => 'application/json',
            'api-key' => $apiKey,
        ];
        $body = [
            'messages' => $msgs,
            'temperature' => 0.2,
            'max_tokens' => 600,
            'stream' => false,
        ];
        list($json, $code, $err, $raw) = http_json('POST', $url, $headers, $body);
        if ($err || $code < 200 || $code >= 300) {
            $msg = '';
            if (is_array($json) && isset($json['error'])) {
                $msg = is_array($json['error']) ? ($json['error']['message'] ?? json_encode($json['error'])) : (string)$json['error'];
            } elseif (is_string($raw) && $raw) {
                $msg = $raw;
            }
            $msg = $msg ? (strlen($msg) > 400 ? substr($msg,0,400).'…' : $msg) : 'Sem mensagem.';
            throw new Exception(($err ?: ("HTTP $code")).': '.$msg);
        }
        // extrair conteúdo
        if (isset($json['choices'][0]['message']['content'])) {
            $replyText = (string)$json['choices'][0]['message']['content'];
        } else {
            $replyText = 'Sem resposta.';
        }
    } elseif ($provider === 'openai') {
        $apiKey = $cfg['openai']['apiKey'] ?? '';
        $baseUrl = rtrim($cfg['openai']['baseUrl'] ?? 'https://api.openai.com/v1', '/');
        $model = $cfg['openai']['model'] ?? 'gpt-4o-mini';
        if (!$apiKey) throw new Exception('Chave OpenAI ausente na configuração');
        $url = $baseUrl . '/chat/completions';
        $headers = [
            'Content-Type' => 'application/json',
            'Authorization' => 'Bearer ' . $apiKey,
        ];
        $body = [ 'model'=>$model, 'messages'=>$msgs, 'temperature'=>0.2, 'max_tokens'=>600, 'stream'=>false ];
        list($json, $code, $err, $raw) = http_json('POST', $url, $headers, $body);
        if ($err || $code < 200 || $code >= 300) {
            $msg = '';
            if (is_array($json) && isset($json['error'])) {
                $msg = is_array($json['error']) ? ($json['error']['message'] ?? json_encode($json['error'])) : (string)$json['error'];
            } elseif (is_string($raw) && $raw) {
                $msg = $raw;
            }
            $msg = $msg ? (strlen($msg) > 400 ? substr($msg,0,400).'…' : $msg) : 'Sem mensagem.';
            throw new Exception(($err ?: ("HTTP $code")).': '.$msg);
        }
        if (isset($json['choices'][0]['message']['content'])) {
            $replyText = (string)$json['choices'][0]['message']['content'];
        } else { $replyText = 'Sem resposta.'; }
    } else {
        throw new Exception('Provedor não suportado.');
    }
} catch (Exception $ex) {
    http_response_code(502);
    echo json_encode(['success'=>false,'message'=>'Assistant proxy falhou: '.$ex->getMessage()]);
    exit;
}

echo json_encode(['success'=>true,'reply'=>$replyText]);
