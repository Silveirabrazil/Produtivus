/**
 * Renderiza o conteúdo na div principal.
 * @param {string} htmlContent O HTML a ser inserido.
 */
function renderView(htmlContent) {
    const main = document.querySelector('#main-content');
    if (!main) {
        console.error('Elemento #main-content não encontrado.');
        return;
    }
    main.innerHTML = htmlContent;
}

function viewLogin() {
    const loginHTML = `
        <section class="auth-section">
            <div class="auth-card">
                <img src="img/logo.png" alt="Produtivus" class="d-block mx-auto mb-3 w-180">
                <h2>Entrar</h2>
                <form id="login-form">
                    <div class="field">
                        <label for="login-email">E-mail</label>
                        <input type="email" id="login-email" required>
                    </div>
                    <div class="field">
                        <label for="login-password">Senha</label>
                        <input type="password" id="login-password" required>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Entrar</button>
                    </div>
                </form>
                <p class="small form-info">Não tem uma conta? <a href="#" id="link-to-register">Crie uma aqui</a></p>
                <div class="divider">ou</div>
                <div id="google-login-btn"></div>
            </div>
        </section>
    `;

    renderView(loginHTML);

    // Google Identity Services
    const googleBtnDiv = document.getElementById('google-login-btn');
    if (googleBtnDiv) {
        // Adiciona o script do Google Identity Services
        if (!document.getElementById('google-identity-script')) {
            const script = document.createElement('script');
            script.src = "https://accounts.google.com/gsi/client";
            script.async = true;
            script.defer = true;
            script.id = 'google-identity-script';
            document.body.appendChild(script);
        }
        // Aguarda o carregamento do script
        const renderGoogleButton = () => {
            if (window.google && window.google.accounts && window.google.accounts.id) {
                window.google.accounts.id.initialize({
                    client_id: '177566502277-f7daeto382c02i1i7bte3gnkenvuku8h.apps.googleusercontent.com', // Corrigido com seu ID
                    callback: handleCredentialResponse
                });
                window.google.accounts.id.renderButton(googleBtnDiv, {
                    theme: 'outline',
                    size: 'large',
                    text: 'continue_with',
                    shape: 'pill'
                });
            } else {
                setTimeout(renderGoogleButton, 200);
            }
        };
        renderGoogleButton();
    }

    const loginForm = document.getElementById('login-form');
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        try {
            const r = await fetch('/server/api/login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ email, password })
            });
            const j = await r.json().catch(()=>null);
            if (!r.ok || !j || !j.success) {
                const msg = (j && j.message) ? j.message : ('Falha no login ('+r.status+').');
                throw new Error(msg);
            }
            const nameFromEmail = (j.user && j.user.name) || String(email).split('@')[0];
            localStorage.setItem('pv_user', JSON.stringify({ email: (j.user && j.user.email) || email, name: nameFromEmail }));
            try { setTimeout(()=> window.pvNotify?.({ title:'Bem-vindo, '+nameFromEmail+'!', message:'Login realizado com sucesso.', type:'success'}), 150); } catch {}
            window.location.replace('index.html');
        } catch (err) {
            (window.pvShowToast||((m)=>alert(m)))((err && err.message) || 'E-mail ou senha inválidos.');
        }
    });

    document.getElementById('link-to-register')?.addEventListener('click', (e) => {
        e.preventDefault();
        viewRegister();
    });
}

function viewRegister() {
    const registerHTML = `
        <section class="auth-section">
            <div class="auth-card">
                <h2>Criar Conta</h2>
                <form id="register-form">
                    <div class="field">
                        <label for="reg-name">Nome</label>
                        <input type="text" id="reg-name" required>
                    </div>
                    <div class="field">
                        <label for="reg-email">E-mail</label>
                        <input type="email" id="reg-email" required>
                    </div>
                    <div class="field">
                        <label for="reg-password">Senha (mín. 8 caracteres, com letra maiúscula, minúscula, número e símbolo)</label>
                        <input type="password" id="reg-password" minlength="8" required>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Criar conta</button>
                    </div>
                </form>
                <p class="small form-info">Já tem uma conta? <a href="#" id="link-to-login">Faça login</a></p>
            </div>
        </section>
    `;

    renderView(registerHTML);

    const registerForm = document.getElementById('register-form');
    registerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

        if (!passwordRegex.test(password)) {
            (window.pvShowToast||((m)=>alert(m)))('A senha deve ter no mínimo 8 caracteres, com ao menos 1 maiúscula, 1 minúscula, 1 número e 1 símbolo.');
            return;
        }

        try {
            const r = await fetch('/server/api/register.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
                credentials: 'same-origin'
            });
            const j = await r.json().catch(()=>null);
            if (!r.ok || !j || !j.success) {
                throw new Error((j && j.message) || ('Falha no registro ('+r.status+').'));
            }
            (window.pvShowToast||((m)=>alert(m)))('Conta criada! Faça login para continuar.');
            viewLogin();
        } catch (err) {
            (window.pvShowToast||((m)=>alert(m)))((err && err.message) || 'Erro ao registrar.');
        }
    });

    document.getElementById('link-to-login')?.addEventListener('click', (e) => {
        e.preventDefault();
        viewLogin();
    });
}
