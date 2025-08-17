<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$path = __DIR__ . '/../config/install.json';
$exists = @is_file($path);
$readable = $exists && @is_readable($path);
$raw = $readable ? @file_get_contents($path) : false;
$json = $raw !== false ? @json_decode($raw, true) : null;
$hasSecret = is_array($json) && array_key_exists('secret', $json) && is_string($json['secret']);
$secretLen = $hasSecret ? strlen($json['secret']) : 0;

// Não revela o secret. Apenas metadados para diagnosticar caminho e formato.
$resp = [
  'path' => $path,
  'exists' => $exists,
  'readable' => $readable,
  'json_ok' => is_array($json),
  'has_secret' => $hasSecret,
  'secret_len' => $secretLen
];

echo json_encode($resp);