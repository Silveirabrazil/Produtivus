<?php
header('Content-Type: application/json; charset=utf-8');

$drivers = class_exists('PDO') ? PDO::getAvailableDrivers() : [];
$hasPdo = class_exists('PDO');
$hasPdoMysql = in_array('mysql', $drivers, true);

$resp = [
  'php' => PHP_VERSION,
  'hasPDO' => $hasPdo,
  'pdoDrivers' => $drivers,
  'hasPdoMysql' => $hasPdoMysql,
  'env' => [
    'DB_HOST' => getenv('DB_HOST') ?: null,
    'DB_NAME' => getenv('DB_NAME') ?: null,
    'DB_USER' => getenv('DB_USER') ?: null,
    'DB_PASS_set' => getenv('DB_PASS') !== false,
  ],
];

echo json_encode($resp);