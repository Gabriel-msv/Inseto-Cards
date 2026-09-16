## Inseto Cards 3.1.0 — Relay

# Inseto Cards — Multiplayer Server

Relay WebSocket da edição 3.1.0, compatível com `js/multiplayer.js` 3.1.0.

## Rodar

```bash
npm install
npm start
```

Defina `PORT` no ambiente de hospedagem. O servidor usa `10000` como padrão.

## Protocolo

- `create` → cria sala
- `join` → entra na sala
- `player-name` → sincroniza nomes
- `action` → guest → host
- `state` → host → guest
- `revenge` → sincroniza revanche
- `peer-joined` / `peer-left` → presença

O servidor não executa regras do jogo: ele apenas retransmite ações e o estado autoritativo do host.
