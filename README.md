# Inseto Cards v2.0.5

## Alterações
- Histórico em formato terminal: mais antigo no topo, novas ações no final.
- Compras e compras grátis não revelam o nome da carta no histórico.
- Ataque direto não revela qual carta foi descartada.
- Reciclagem automática da Natureza: quando o baralho acaba, somente cartas de inseto efetivamente derrotadas no Cemitério são embaralhadas e devolvidas à Natureza.
- Timer de 30s corrigido no modo BOT e no multiplayer; guest também atualiza o contador em tempo real.
- Tooltip de carta deixa de ficar preso após toque/segurar: timeout automático, clique fora e ESC fecham a consulta.
- Drag-and-drop de ataque exige que a carta atacante venha do Fronte e que o drop seja exatamente sobre o alvo específico. Banco não é escolhido por proximidade.
- VFX de compra, posicionamento, movimento e descarte reforçados.
- Cartas de inseto com habilidades no campo recebem aura visual contínua; efeitos ativos também recebem destaque.
- Modal visual do Cupim mostra o alvo e os efeitos/equipamentos associados disponíveis, sem criar uma regra nova não definida no GDD.

## Fidelidade
As regras e valores existentes foram preservados. O GDD define Cupim apenas como “Anula qualquer buff que o alvo tiver” e não define duas cartas aleatórias para essa habilidade; por isso a interface não inventa uma mecânica de compra/seleção que alteraria o jogo.
