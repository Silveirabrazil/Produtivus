<?php
// inc/head.php — gera um nonce por request e envia um header CSP que usa o nonce
// Incluir este arquivo no topo de páginas PHP antes de qualquer saída.
if (!isset($pageTitle)) { $pageTitle = 'Produtivus'; }
// Versão do app para cache-busting (atualize quando publicar)
$appVersion = '20250904T0000';
// Gera nonce seguro
try {
    $nonce = base64_encode(random_bytes(16));
} catch (Exception $e) {
    // fallback menos ideal
    $nonce = bin2hex(openssl_random_pseudo_bytes(12));
}

// Política CSP unificada (mantida no PHP). Enquanto houver estilos inline no HTML,
// permita 'unsafe-inline' em style-src. Quando tudo migrar para CSS, remova-o.
// Permite Google Identity (accounts.google.com) se necessário.
$csp = "default-src 'self'; "
  . "connect-src 'self' https://accounts.google.com; "
  . "img-src 'self' data: https://accounts.google.com; "
  . "font-src 'self' data:; "
  . "frame-src 'self' https://accounts.google.com; "
  . "script-src 'self' https://accounts.google.com https://cdn.jsdelivr.net; "
  . "style-src 'self' 'unsafe-inline' 'nonce-" . $nonce . "' https://accounts.google.com https://cdn.jsdelivr.net;";
// Envia header CSP
header("Content-Security-Policy: " . $csp);
?>
<!DOCTYPE html>
<html lang="pt-BR">

<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title><?php echo htmlspecialchars($pageTitle, ENT_QUOTES); ?></title>
  <meta name="csp-nonce" content="<?php echo htmlspecialchars($nonce, ENT_QUOTES); ?>">
  <meta name="app-version" content="<?php echo htmlspecialchars($appVersion, ENT_QUOTES); ?>">
  <!-- Preloads de fontes -->
  <link rel="preload" href="css/fonts/dosis-400.woff" as="font" type="font/woff" crossorigin>
  <link rel="preload" href="css/fonts/dosis-400.ttf" as="font" type="font/ttf" crossorigin>
  <!-- Bootstrap 5 é empacotado dentro de css/styles.css -->
  <link rel="stylesheet" href="css/styles.css?v=<?php echo htmlspecialchars($appVersion, ENT_QUOTES); ?>">
  <link rel="stylesheet" href="css/fonts/material-symbols.css">
  <link rel="icon" href="img/image.png" type="image/png">
  <link rel="apple-touch-icon" href="img/image.png">
</head>

<?php
// abre o body com classe opcional; páginas podem sobrescrever a classe antes de incluir
if (!isset($bodyClass)) { $bodyClass = ''; }
?>
<body<?php if ($bodyClass) echo ' class="' . htmlspecialchars($bodyClass, ENT_QUOTES) . '"'; ?> >

  <!-- Bootstrap 5.3.8 JS bundle (inclui Popper) -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js" crossorigin="anonymous"></script>

