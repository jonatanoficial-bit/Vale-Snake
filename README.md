# Vale Snake

Jogo arcade mobile-first em HTML, CSS e JavaScript modular. A primeira entrega traz o **Templo Esquecido**, uma cobra expressiva desenhada no Canvas, controles por gesto/D-pad/teclado, dois modos, quatro dificuldades, placares locais e PWA offline.

## Jogar localmente

Não há dependências de produção. Sirva a pasta com um servidor estático, por exemplo:

```sh
python -m http.server 8080
```

Depois abra `http://localhost:8080`.

## Qualidade

```sh
npm test
npm run check
```

Os testes cobrem regras essenciais do motor: crescimento, colisões, viradas inválidas, criação de fruta e cronômetro.

## Publicação

O workflow `.github/workflows/pages.yml` publica o conteúdo estático da branch `main` no GitHub Pages. Na primeira vez, selecione **GitHub Actions** como fonte de publicação em *Settings → Pages*, se a conta não estiver configurada automaticamente.

## Privacidade

O jogo não requer conta nem envia dados. XP, preferências, apelido e ranking são armazenados somente no `localStorage` do navegador, sob a chave `vale-snake:v1:profile`.
