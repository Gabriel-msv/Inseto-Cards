# Inseto Cards - v1.0.0

Jogo de cartas de insetos para navegador, jogado em turnos contra um bot. A versao 1.0.0 e uma implementacao estatica, sem framework e sem servidor obrigatorio.

## Visao geral

Cada jogador controla uma carta no **Fronte**, ate tres cartas no **Banco** e uma mao propria. Use folhas para comprar cartas e realizar efeitos, organize seu campo e derrote todos os insetos do adversario.

## Como executar

### Abrir diretamente

Abra `index.html` em um navegador moderno.

### Usar Live Server

No VS Code:

1. Abra a pasta `inseto_cards_separado`.
2. Abra `index.html`.
3. Inicie o arquivo com a extensao Live Server.

O jogo nao exige instalacao de dependencias, build ou banco de dados.

## Como jogar

1. Digite seu nome.
2. Clique em **INICIAR PARTIDA**.
3. A mao inicial recebe 3 cartas e cada jogador comeca com 5 folhas.
4. Use as cartas da mao no Banco ou no Fronte.
5. Execute suas acoes e encerre o turno.

### Movimento e acao padrao

Cada turno oferece:

- 1 Movimento: invocar, mover ou devolver uma carta.
- 1 Acao Padrao: comprar, colher ou realizar uma acao disponivel.

O bot assume o turno automaticamente depois do encerramento do jogador.

## Controles

### Acoes padrao

- **Comprar**: paga 3 folhas e compra uma carta da Natureza.
- **Colher**: recebe folhas e consome a acao padrao.
- **2o Movimento**: troca a acao padrao por um movimento adicional.
- **Encerrar Turno**: passa o controle para o bot.

### Acoes com selecao

Essas acoes ficam apagadas ate que uma carta ou alvo valido seja selecionado:

- **Atacar**: selecione o inseto do seu Fronte e depois um alvo inimigo.
- **Devolver**: selecione uma carta do campo para retornar a mao.
- **Vender**: selecione uma carta da mao ou do campo para receber 1 folha.

### Cartas

- Clique em uma carta da mao para seleciona-la.
- Clique em um espaco vazio do Banco ou do Fronte para invoca-la.
- Tambem e possivel arrastar cartas para os espacos validos.
- Passe o mouse sobre uma carta para ver seus detalhes e habilidade.

## Regras implementadas

- O baralho usa as 41 cartas cadastradas, uma copia de cada.
- Natureza e Cemiterio sao areas compartilhadas.
- Cada jogador possui 1 Fronte, 3 espacos de Banco e uma mao.
- A partir da segunda rodada, o jogador recebe folhas automaticas conforme o fluxo de turno implementado.
- O limite de folhas e 15.
- O combate considera Frente, Banco, dano, vida, habilidades e efeitos de cartas.
- A partida termina quando todos os insetos de um jogador forem derrotados.
- Cartas de efeito restantes nao impedem a vitoria.

## Interface

O tabuleiro inclui:

- painel lateral com nome, controles e status da partida;
- areas padronizadas para Banco, Fronte, Natureza e Cemiterio;
- historico de acoes abaixo dos controles;
- cartas com artes, estados selecionados e drag-and-drop;
- fundo verde escuro com particulas fixas ao viewport e movimento independente;
- isotipo no cabecalho e favicon do projeto.

## Estrutura

```text
inseto_cards_separado/
├── index.html              # Estrutura da interface
├── css/
│   └── style.css           # Tema, layout, responsividade e animacoes
├── js/
│   └── game.js             # Estado, regras, bot e interacoes
├── assets/
│   └── cards/              # Artes das cartas e isotipo
└── README.md               # Documentacao da versao
```

## Decisoes da versao 1.0.0

Alguns pontos do GDD original estavam em aberto. Para tornar a partida executavel, esta versao fixa as seguintes decisoes:

- mao inicial com 3 cartas;
- venda de carta por 1 folha;
- revelacao de cartas do bot registrada no historico;
- empate e outras situacoes especiais seguem o fluxo resolvido pelo motor atual;
- o bot usa uma estrategia simples baseada em custo, campo e ataque.

## Compatibilidade

Recomendado: Chrome, Edge ou Firefox atualizados. O jogo usa APIs nativas do navegador, incluindo `drag and drop`, `requestAnimationFrame` e CSS moderno.

## Status

**Versao 1.0.0 - jogavel e organizada para evolucao futura.**
