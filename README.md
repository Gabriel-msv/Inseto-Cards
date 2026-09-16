# Inseto Cards — Multiplayer Hotfix 2.1.1

Este pacote corrige a camada multiplayer sem redesenhar a interface da batalha.

## Correções principais

- reconexão correta quando o WebSocket antigo está fechado;
- fila de conexão evita dois sockets simultâneos;
- estado do HOST é autoritativo e recebe número de sequência;
- estados atrasados do HOST são ignorados pelo GUEST;
- alvo de Lupa/Teia/Inseticida é enviado ao HOST em vez de alterar apenas a tela local;
- Meganeura pode selecionar qualquer carta do Banco mesmo com Fronte ocupado;
- drag & drop multiplayer usa exatamente o alvo sobre o qual a carta foi solta;
- venda, movimento, invocação, equipamento e fim de turno são validados no HOST;
- presença e saída de jogador são tratadas sem deixar a sala em estado fantasma;
- timer fica sob controle do HOST;
- servidor WebSocket compatível incluído em `server/`.

## Importante

O cliente usa `wss://server-dh1h.onrender.com`, como a versão anterior. O código do servidor incluído neste pacote precisa estar implantado nesse endereço (ou o valor de `SERVER_URL` em `js/multiplayer.js` deve ser alterado para o seu servidor).

O pacote não altera o layout da batalha.
