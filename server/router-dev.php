<?php
// Router para php -S em desenvolvimento: injeta alguns headers e trata favicon

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
$docRoot = rtrim($_SERVER['DOCUMENT_ROOT'] ?? __DIR__ . '/..', '/\\');

// Serve favicon.ico a partir de img/icone.png se existir
if ($uri === '/favicon.ico') {
  $png = $docRoot . '/img/icone.png';
  if (is_file($png)) {
    header('Content-Type: image/png');
    readfile($png);
    return true;
  }
}

// Redirecionar chamadas /api/* para /server/api/*
if (strpos($uri, '/api/') === 0) {
  $newPath = '/server' . $uri;
  $file = realpath($docRoot . $newPath);
  if ($file && is_file($file)) {
    $_SERVER['SCRIPT_FILENAME'] = $file;
    include $file;
    return true;
  }
}

// Arquivo físico existente? deixa o servidor padrão entregar
$file = realpath($docRoot . $uri);
if ($file && is_file($file)) {
  // injetar headers mínimos em HTML
  $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
  if (in_array($ext, ['html','htm'])) {
    header('Cross-Origin-Opener-Policy: unsafe-none');
    header('Cross-Origin-Embedder-Policy: unsafe-none');
  }
  return false;
}

// Fallback: deixa o PHP embutido processar normalmente
return false;
