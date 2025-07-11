# Como publicar no GitHub Pages

1.  **Atualize o `_config.yml`:**
    *   Abra o arquivo `_config.yml`.
    *   Substitua `SEU-USUARIO` pelo seu nome de usuário do GitHub nos campos `url` e `github_username`.

2.  **Faça o commit e push das suas alterações para o GitHub:**
    ```bash
    git add .
    git commit -m "Configura o site para o GitHub Pages"
    git push
    ```

3.  **Configure o GitHub Pages no seu repositório:**
    *   Vá para a página do seu repositório no GitHub.
    *   Clique em "Settings" (Configurações).
    *   No menu lateral, clique em "Pages".
    *   Em "Build and deployment", na seção "Source", selecione "Deploy from a branch".
    *   Na seção "Branch", selecione a branch que você quer usar (geralmente `main` ou `master`) e a pasta `/(root)`.
    *   Clique em "Save".

4.  **Acesse seu site:**
    *   Após alguns minutos, seu site estará disponível no endereço que você configurou no `url` do seu `_config.yml` (ex: `https://SEU-USUARIO.github.io/brasilemnumeros/`).
