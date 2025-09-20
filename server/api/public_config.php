<?php
header('Content-Type: application/json; charset=utf-8');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: frame-ancestors 'none'");
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, OPTIONS');
// evitar cache para refletir alterações em oauth.json imediatamente
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

// Exponha apenas dados públicos não sensíveis para o frontend.
// O CLIENT_ID do Google não é um segredo; o segredo permanece no console do Google.

function read_client_id_from_json($file)
{
  $file = is_string($file) ? $file : '';
  if (!$file) return null;
  $rp = @realpath($file);
  if (!$rp || !@is_file($rp) || !@is_readable($rp)) return null;
  $raw = @file_get_contents($rp);
  if ($raw === false) return null;
  $json = @json_decode($raw, true);
  if (!is_array($json)) return null;
  $val = isset($json['googleClientId']) ? trim((string)$json['googleClientId']) : '';
  if ($val === '') return null;
  // validação leve: padrão típico do client_id
  if (strpos($val, '.apps.googleusercontent.com') === false) {
    // ainda aceitamos, mas está fora do esperado
    return $val;
  }
  return $val;
}

// 1) Tentar variável de ambiente (produção)
$clientId = getenv('GOOGLE_CLIENT_ID') ?: '';

// 2) Tentar arquivo local (desenvolvimento)
if (!$clientId) {
  $doc = isset($_SERVER['DOCUMENT_ROOT']) ? rtrim($_SERVER['DOCUMENT_ROOT'], '/\\') : '';
  $candidates = array_filter([
    // relativo ao arquivo atual (public/server/api)
    __DIR__ . '/../config/oauth.json',
    dirname(__DIR__) . '/config/oauth.json', // public/server/config/oauth.json
    // relativo ao document root
    $doc ? ($doc . '/server/config/oauth.json') : '',
  ]);
  foreach ($candidates as $cfgFile) {
    $cid = read_client_id_from_json($cfgFile);
    if (!empty($cid)) { $clientId = $cid; break; }
  }
}

// 3) Fallback via HTTP local se permitido
if (!$clientId) {
  $host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : '';
  if ($host) {
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $url = $scheme . '://' . $host . '/server/config/oauth.json';
    $json = null;
    if (function_exists('curl_init')) {
      $ch = curl_init($url);
      curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 2,
      ]);
      $resp = curl_exec($ch);
      if ($resp !== false) { $json = @json_decode($resp, true); }
      curl_close($ch);
    } else {
      $resp = @file_get_contents($url);
      if ($resp !== false) { $json = @json_decode($resp, true); }
    }
    if (is_array($json) && !empty($json['googleClientId'])) {
      $clientId = (string)$json['googleClientId'];
    }
  }
}

echo json_encode([
  'googleClientId' => $clientId !== '' ? $clientId : null,
]);
