# QA - Vale Snake v1.0.0

## Checks automatizados

- Motor: início, crescimento, bloqueio de reversão, colisão de parede, célula livre e tempo de 90 segundos.
- Sintaxe: módulos da aplicação e do renderizador Canvas.

## Checks manuais executados

- Arena responsiva em viewport de celular e desktop no navegador local.
- Menu → modo → dificuldade → rodada → pausa → reinício → resultado.
- Swipe, D-pad e setas/WASD direcionam a cobra sem aceitar reversão imediata.
- HUD mostra pontuação e tempo; recordes/XP sobrevivem ao recarregamento pelo `localStorage`.
- PWA inclui manifest e service worker com app shell em cache depois da primeira abertura.

## Limites conhecidos

- A instalação é oferecida conforme o suporte do navegador; no iOS a orientação é feita pelo menu Compartilhar.
- O ranking é deliberadamente local, não global nem verificado por servidor.
