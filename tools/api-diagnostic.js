// Script de diagnóstico da API - Execute no console do navegador
// Para usar: copie e cole este código no console do navegador (F12)

async function diagnoseAPI() {
    console.log('🔍 Iniciando diagnóstico da API...');

    // Teste 1: Health Check
    try {
        console.log('📡 Testando endpoint de saúde...');
        const healthResponse = await fetch('/server/api/health_check.php', {
            credentials: 'same-origin',
            cache: 'no-store'
        });

        if (healthResponse.ok) {
            const healthData = await healthResponse.json();
            console.log('✅ Health Check passou:', healthData);
        } else {
            console.error('❌ Health Check falhou:', healthResponse.status, healthResponse.statusText);
            const text = await healthResponse.text();
            console.error('Detalhes do erro:', text);
        }
    } catch (error) {
        console.error('❌ Erro ao executar Health Check:', error);
    }

    // Teste 2: Account API
    try {
        console.log('👤 Testando endpoint de conta...');
        const accountResponse = await fetch('/server/api/account.php', {
            credentials: 'same-origin',
            cache: 'no-store'
        });

        if (accountResponse.ok) {
            const accountData = await accountResponse.json();
            console.log('✅ Account API passou:', accountData);
        } else {
            console.error('❌ Account API falhou:', accountResponse.status, accountResponse.statusText);
            const text = await accountResponse.text();
            console.error('Detalhes do erro Account:', text);
        }
    } catch (error) {
        console.error('❌ Erro ao testar Account API:', error);
    }

    // Teste 3: Tasks API
    try {
        console.log('📝 Testando endpoint de tarefas...');
        const tasksResponse = await fetch('/server/api/tasks.php', {
            credentials: 'same-origin',
            cache: 'no-store'
        });

        if (tasksResponse.ok) {
            const tasksData = await tasksResponse.json();
            console.log('✅ Tasks API passou:', tasksData);
        } else {
            console.error('❌ Tasks API falhou:', tasksResponse.status, tasksResponse.statusText);
            const text = await tasksResponse.text();
            console.error('Detalhes do erro Tasks:', text);
        }
    } catch (error) {
        console.error('❌ Erro ao testar Tasks API:', error);
    }

    // Teste 4: Status da sessão local
    console.log('🔐 Status da sessão local:');
    const userData = localStorage.getItem('pv_user');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            console.log('✅ Dados do usuário local:', user);
        } catch (e) {
            console.error('❌ Dados do usuário local corrompidos:', userData);
        }
    } else {
        console.warn('⚠️ Nenhum dado de usuário local encontrado');
    }

    // Teste 5: Configuração da API
    console.log('🔧 Configuração da API:');
    if (window.ProdutivusAPI) {
        console.log('✅ ProdutivusAPI configurado:', window.ProdutivusAPI);
    } else {
        console.error('❌ ProdutivusAPI não encontrado');
    }

    console.log('🎯 Diagnóstico concluído!');
}

// Executar automaticamente
diagnoseAPI();
