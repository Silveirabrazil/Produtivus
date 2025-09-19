<?php
// Router para php -S em desenvolvimento: injeta alguns headers e trata favicon

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
$docRoot = rtrim($_SERVER['DOCUMENT_ROOT'] ?? __DIR__ . '/..', '/\\');

// Serve favicon.ico a partir de img/image.png se existir
if ($uri === '/favicon.ico') {
  $png = $docRoot . '/img/image.png';
  if (is_file($png)) {
    header('Content-Type: image/png');
    readfile($png);
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
<?php
