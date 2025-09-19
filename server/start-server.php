<?php
// Servidor PHP simples para testes com SQLite
echo "Iniciando servidor PHP com SQLite...\n";
echo "URL: http://localhost:8080\n";
echo "Para parar o servidor, pressione Ctrl+C\n\n";

// Navegar para o diretório raiz do projeto
chdir(__DIR__ . '/..');

// Configurar as variáveis de ambiente
putenv('DB_TYPE=sqlite');
putenv('DB_PATH=' . __DIR__ . '/../server/data/produtivus.sqlite');

// Iniciar o servidor com router para dev
$router = __DIR__ . '/router-dev.php';
exec('php -S localhost:8080 ' . escapeshellarg($router), $output, $returnCode);

if ($returnCode !== 0) {
    echo "Erro ao iniciar o servidor PHP\n";
    echo implode("\n", $output);
}
?>
