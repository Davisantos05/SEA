# SEA-MCM — Área pública + administrativa (versão local)

## Abrir e visualizar no Windows

1. Extraia o ZIP.
2. Abra a pasta `SEA-MCM`.
3. Dê dois cliques em **ABRIR_SITE.bat**. O navegador abrirá o site sem precisar de internet.
4. O splash com o escudo aparece antes da tela de entrada.

No VS Code, abra a pasta normalmente. Também existe `INICIAR_SERVIDOR_LOCAL.bat` para abrir em `http://localhost:8000` (precisa de Python).

## Teste das duas áreas

**Público geral:** clique em **Continuar como visitante**, ou crie uma conta local com seu e-mail de teste e uma senha de teste. É possível consultar campeonatos, equipes, partidas e classificações. Não aparecem ações de gerenciamento.

**Administrador — demonstração local:**
- E-mail: `seamcm2a@gmail.com`
- Senha demonstrativa: `SEA2026!`

Essa senha é **inventada exclusivamente para o protótipo**; não é, nem deve ser, a senha real dessa conta. O acesso é simulado e NÃO serve como segurança online.

O administrador pode criar/editar/excluir campeonatos, equipes e partidas, exportar/importar backup e inserir campeonato de exemplo. No topo, pode alternar entre **visão administrativa** e **visão pública**. A visão pública é sempre apenas para consulta.

## Teste de salvamento

1. Entre como administrador de demonstração.
2. Crie um campeonato com nome, modalidade, data e status.
3. Cadastre duas equipes e registre uma partida.
4. Veja a Classificação.
5. Atualize a página (F5) e entre novamente — os campeonatos permanecem no `localStorage` do mesmo navegador/origem.
6. Troque para área pública e confira o resultado.

Se usar outro computador/navegador ou apagar os dados do site, os dados não aparecerão lá. Exporte um JSON para guardar backup.

## Login Google real

O botão Google **não inventa uma identidade**. Para habilitá-lo, siga `CONFIGURAR_GOOGLE.md` com seu próprio projeto Firebase. Sem configuração, mostra instruções para habilitação. Em modo `file://`, para OAuth real, prefira abrir por `http://localhost:8000`.

## Sobre segurança

Este código é **frontend de demonstração**; qualquer pessoa com acesso aos arquivos e armazenamento local pode alterar os dados. O controle de administrador precisa ser confirmado no **servidor / regras de banco (Firestore Rules, Supabase RLS etc.)** antes de publicar na internet. Apenas esconder botões ou conferir o e-mail no JavaScript não garante segurança. Google Auth real também não sincroniza os campeonatos: você ainda precisará ligar o banco de dados e implementar regras de autorização.
