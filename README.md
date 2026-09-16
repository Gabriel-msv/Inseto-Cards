# Inseto Cards v2.0.8 — pacote cumulativo

Baseado nas alterações disponíveis das versões 2.0.1–2.0.7, com correções adicionais.

## 2.0.8 — correções e integração
- Versão do motor/UI atualizada de forma consistente para `v2.0.8`.
- Removidas definitivamente do catálogo, artes e lógica: Casca, Casulo Real e Fumaça.
- Baralho volta a conter 41 cartas válidas.
- Meganeura pode atacar qualquer carta inimiga, inclusive cartas do Banco enquanto existe uma carta no Fronte.
- Seleção de alvo da Meganeura funciona por clique e drag-and-drop no slot inimigo específico.
- O BOT usa a mesma regra de alvos da Meganeura.
- Drag-and-drop de Inseticida/Lupa/Teia aceita o slot inimigo como alvo quando aplicável.
- Própolis continua sendo equipamento e a proteção do Banco é verificada pelo equipamento real.
- Efeitos ativáveis usam o slot do Banco recebido pelo drop quando ele está vazio; caso contrário, procuram outro espaço.
- Venda de efeitos ativos limpa referências persistentes de Adubo, Formigueiro, Lupa e Teia.
- Fichas circulares de folhas foram integradas ao HUD com Flexbox, `flex-wrap` e hover, usando `assets/ui/ficha-folha.png`.
- `fichas.html` e `fichas.css` não fazem parte desta versão.

## Histórico acumulado
- **2.0.1:** primeira correção/patch da camada de jogo.
- **2.0.2:** overhaul de movimento/animações, mantendo a estrutura responsiva.
- **2.0.3:** correções da mão e patches de movimento/VFX.
- **2.0.4:** auditoria das habilidades, efeitos persistentes, interações e regras de campo.
- **2.0.5:** histórico em formato terminal, compras/descartes sem revelar informações indevidas, reciclagem da Natureza, timer, tooltip, drag-and-drop mais preciso e VFX.
- **2.0.6:** remoção das cartas aposentadas do motor conforme a revisão do projeto.
- **2.0.7:** refinamento visual das cartas de efeito e indicadores, sem brilho excessivo.
- **2.0.8:** consolidação das alterações acima + correções de Meganeura, catálogo e integração das fichas.

## Estrutura
```
inseto_cards_v2.0.8/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── game.js
│   ├── multiplayer.js
│   └── battle-fx.js
└── assets/
    └── ui/
        └── ficha-folha.png
```

Os assets das cartas continuam sendo os assets existentes do projeto principal e não foram recriados neste patch.
