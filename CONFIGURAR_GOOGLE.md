# Como habilitar login Google de verdade (Firebase)

A tela foi preparada para tentar `signInWithPopup` pelo **Firebase Authentication**, mas não pode autenticar uma conta Google sem configurações do seu projeto.

1. Crie/selecione um projeto em https://console.firebase.google.com/.
2. Em **Authentication → Sign-in method**, habilite **Google**.
3. Em **Authentication → Settings → Authorized domains**, configure o domínio em que o app será usado. `localhost` pode precisar ser incluído explicitamente.
4. Registre um aplicativo Web no projeto Firebase e copie o objeto `firebaseConfig` (campos como `apiKey`, `authDomain`, `projectId`, `appId`).
5. Edite `config.js`: troque `null` por esse objeto de configuração JavaScript.
6. Abra o app via `http://localhost:8000` (use `INICIAR_SERVIDOR_LOCAL.bat` com Python), ou publique em domínio HTTPS autorizado.
7. Clique **Continuar com o Google**: aparecerá o seletor de conta do Google. O email autenticado `seamcm2a@gmail.com` verá o painel administrativo demonstrativo; as demais contas veem apenas área pública.

**Segurança:** checar e-mail no frontend não protege operações. Antes de lançar o app para uso real, crie banco de dados e regras de segurança que autorizem as operações administrativas do usuário pela identidade verificada (UID/claims), não pela aparência do botão. Para o momento, a persistência de campeonatos é local.

O Firebase Authentication Web usa scripts oficiais hospedados no domínio `www.gstatic.com`, carregados apenas quando o Google é acionado; portanto precisa de conexão com a internet.
