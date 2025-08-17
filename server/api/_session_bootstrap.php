<?php
// Configura sessão PHP de forma programática (sem depender de php_value no .htaccess)
// - Define SameSite, Secure, HttpOnly, Domain/Path e nome do cookie
// - Detecta HTTPS inclusive atrás de proxy

if (!function_exists('pv_is_https')) {
  function pv_is_https() {
    if (!empty($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) !== 'off') return true;
    if (!empty($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] === '443') return true;
    // proxies
    if (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower($_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https') return true;
    if (!empty($_SERVER['HTTP_X_FORWARDED_SSL']) && strtolower($_SERVER['HTTP_X_FORWARDED_SSL']) === 'on') return true;
    return false;
  }
}

if (session_status() === PHP_SESSION_NONE) {
  $secure = pv_is_https();
  $host = $_SERVER['HTTP_HOST'] ?? '';
  $domain = '';
  // Ajuste automático do domínio do cookie se o host terminar com o domínio principal
  $main = '.cesarbrasilfotografia.com.br';
  if ($host) {
    $h = strtolower($host);
    if (substr($h, -strlen($main)) === $main) { $domain = $main; }
  }

  // PHP 7.3+: array de opções, incluindo SameSite
  $cookieParams = [
    'lifetime' => 0,
    'path' => '/',
    'domain' => $domain ?: '',
    'secure' => $secure,
    'httponly' => true,
    'samesite' => 'Lax',
  ];
  // Fallback defensivo com ini_set (alguns ambientes ignoram SameSite no set_cookie_params)
  @ini_set('session.cookie_httponly', '1');
  @ini_set('session.cookie_secure', $secure ? '1' : '0');
  @ini_set('session.cookie_samesite', 'Lax');
  @ini_set('session.use_strict_mode', '1');

  if (function_exists('session_set_cookie_params')) {
    session_set_cookie_params($cookieParams);
  }
  // Nome de sessão dedicado para o app
  @session_name('PVSESSID');
  session_start();
}

// Exporta helper simples
if (!function_exists('pv_session_user')) {
  function pv_session_user() {
    return [ 'id' => $_SESSION['user_id'] ?? null, 'name' => $_SESSION['user_name'] ?? null ];
  }
}

?>
