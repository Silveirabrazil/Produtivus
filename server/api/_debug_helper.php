<?php
// Helper para liberar detalhes de erro quando um secret válido é enviado
if (!function_exists('pv_debug_allowed')) {
  function pv_debug_allowed(): bool {
    $cfgPath = __DIR__ . '/../config/install.json';
    $secretCfg = '';
    if (@is_file($cfgPath) && @is_readable($cfgPath)) {
      $raw = @file_get_contents($cfgPath);
      $cfg = @json_decode($raw, true);
      if (is_array($cfg) && isset($cfg['secret'])) {
        $secretCfg = trim((string)$cfg['secret']);
      }
    }
    if ($secretCfg === '') return false;
    $secretIn = isset($_GET['secret']) ? (string)$_GET['secret'] : (isset($_POST['secret']) ? (string)$_POST['secret'] : '');
    if ($secretIn === '') return false;
    if (function_exists('hash_equals')) return hash_equals($secretCfg, $secretIn);
    return $secretCfg === $secretIn;
  }
}
