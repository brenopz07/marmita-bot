/**
 * Marmitaria Sabor Caseiro - Motor de IA Clássica Sem LLM (Client-Side)
 * Arquitetura baseada nas especificações da aula:
 * 1. Camada de Regras Determinísticas (Saudações, Comandos, Guardrails, Validação de Cardápio, Alterações)
 * 2. Pré-processamento NLP (Normalização, Tokenização, Remoção de Stopwords, Stemming/Radicais)
 * 3. Vetorização (Bag of Words / TF-IDF)
 * 4. Decisão por Similaridade de Cosseno
 * 5. Gerenciamento de Estado do Pedido e Validação de Carrinho
 */

// ========================================================
// 1. BASE DE CONHECIMENTO & CARDÁPIO OFICIAL
// ========================================================
const CARDAPIO = {
  marmitas: [
    {
      id: 'tradicional',
      nome: 'Marmita Tradicional',
      preco: 22.00,
      descricao: 'Arroz, feijão carioca, bife acebolado ou frango grelhado, farofa e salada verde.',
      keywords: ['tradicional', 'bife', 'frango', 'acebolado', 'farofa', 'carioca']
    },
    {
      id: 'fit',
      nome: 'Marmita Fit',
      preco: 25.00,
      descricao: 'Arroz integral, filé de frango grelhado, mix de legumes ao vapor (cenoura e brócolis) e feijão preto.',
      keywords: ['fit', 'fitness', 'integral', 'legumes', 'brocolis', 'cenoura', 'saudavel']
    },
    {
      id: 'vegana',
      nome: 'Marmita Vegana',
      preco: 24.00,
      descricao: 'Arroz integral, lentilha temperada, hambúrguer de grão-de-bico, abobrinha refogada e purê de abóbora.',
      keywords: ['vegana', 'vegano', 'grao', 'bico', 'lentilha', 'abobora', 'abobrinha']
    },
    {
      id: 'executiva',
      nome: 'Marmita Executiva',
      preco: 28.00,
      descricao: 'Arroz branco, feijão tropeiro, picanha fatiada acebolada, batata rústica e vinagrete.',
      keywords: ['executiva', 'picanha', 'tropeiro', 'rustica', 'vinagrete']
    }
  ],
  bebidas: [
    { id: 'refrigerante', nome: 'Refrigerante Lata', preco: 6.00, keywords: ['refrigerante', 'refri', 'coca', 'guarana', 'lata'] },
    { id: 'suco', nome: 'Suco Natural Laranja 300ml', preco: 7.00, keywords: ['suco', 'laranja', 'natural'] },
    { id: 'agua', nome: 'Água Mineral 500ml', preco: 4.00, keywords: ['agua', 'mineral'] }
  ],
  taxaEntrega: 5.00,
  tempoEntrega: '40 a 50 minutos',
  formasPagamento: ['Pix', 'Cartão de Crédito/Débito', 'Dinheiro']
};

// ========================================================
// 2. STOPWORDS & STEMMING EM PORTUGUÊS (NLP)
// ========================================================
const STOPWORDS = new Set([
  'a', 'ao', 'aos', 'aquela', 'aquelas', 'aquele', 'aqueles', 'aquilo', 'as', 'ate', 'com', 'como',
  'da', 'das', 'de', 'dela', 'delas', 'dele', 'deles', 'do', 'dos', 'e', 'ela', 'elas', 'ele',
  'eles', 'em', 'entre', 'era', 'eram', 'essa', 'essas', 'esse', 'esses', 'esta', 'estas', 'este',
  'estes', 'eu', 'foi', 'fomos', 'foram', 'ha', 'isso', 'isto', 'ja', 'lhe', 'lhes', 'mais', 'mas',
  'me', 'mesmo', 'meu', 'meus', 'minha', 'minhas', 'na', 'nas', 'nao', 'nas', 'nem', 'no', 'nos',
  'nossa', 'nossas', 'nosso', 'nossos', 'num', 'numa', 'o', 'os', 'ou', 'para', 'pela', 'pelas',
  'pelo', 'pelos', 'por', 'qual', 'quando', 'que', 'quem', 'se', 'seja', 'sejam', 'sem', 'sera',
  'serao', 'seu', 'seus', 'so', 'somos', 'sua', 'suas', 'tambem', 'te', 'tem', 'temos', 'tenho',
  'ter', 'teu', 'teus', 'tu', 'tua', 'tuas', 'um', 'uma', 'umas', 'uns', 'voce', 'voces'
]);

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stemWord(word) {
  if (word.length <= 3) return word;

  let w = word;
  const suffixes = [
    'amentos', 'amento', 'imentos', 'imento', 'idades', 'idade', 'izacao',
    'adores', 'adoras', 'adora', 'ador', 'encias', 'encia', 'ancias', 'ancia',
    'acoes', 'acao', 'aveis', 'avel', 'iveis', 'ivel', 'mente',
    'ariam', 'eriam', 'iriam', 'assem', 'essem', 'issem', 'armos', 'ermos', 'irmos',
    'ando', 'endo', 'indo', 'adas', 'ados', 'ada', 'ado', 'aram', 'eram', 'iram',
    'asse', 'esse', 'isse', 'aria', 'eria', 'iria', 'avam', 'aria',
    'ara', 'era', 'ira', 'ava', 'iam', 'ias', 'emos', 'imos',
    'am', 'em', 'ar', 'er', 'ir', 'ou', 'eu', 'iu', 'as', 'es', 'is', 'os'
  ];

  for (const suf of suffixes) {
    if (w.endsWith(suf) && (w.length - suf.length) >= 3) {
      w = w.slice(0, -suf.length);
      break;
    }
  }
  return w;
}

function preprocessNLP(text) {
  const normalized = normalizeText(text);
  const rawTokens = normalized.split(' ').filter(t => t.length > 0);
  const filtered = rawTokens.filter(t => !STOPWORDS.has(t));
  const stems = filtered.map(stemWord);
  return { normalized, tokens: rawTokens, filtered, stems };
}

// ========================================================
// 3. BASE DE INTENÇÕES (TREINAMENTO DO VETORIZADOR BOW / TF-IDF)
// ========================================================
const INTENT_DATASET = [
  {
    intent: 'saudacao',
    examples: [
      'oi', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'opa', 'e ai', 'fala', 'oie', 'tudo bem', 'tudo bom'
    ]
  },
  {
    intent: 'ver_cardapio',
    examples: [
      'ver cardapio', 'quais marmitas voces tem', 'qual o menu de hoje', 'opcoes do dia',
      'quais os sabores', 'valores das marmitas', 'mostrar pratos', 'cardapio completo',
      'quero ver o que tem para comer', 'quais os pratos disponiveis', 'lista de marmitas'
    ]
  },
  {
    intent: 'pedir_marmita',
    examples: [
      'quero pedir uma marmita', 'gostaria de uma marmita tradicional', 'me vê uma fit',
      'vou querer a executiva', 'anota uma vegana pra mim', 'quero comprar comida',
      'pedir almoco', 'fazer pedido de marmita', 'manda uma executiva com picanha',
      'quero duas tradicionais', 'me da uma marmita fit'
    ]
  },
  {
    intent: 'personalizacao',
    examples: [
      'sem cebola', 'bife bem passado', 'carne ao ponto', 'carne mal passada',
      'sem feijao', 'pouco sal', 'sem salada', 'comida sem pimenta', 'bife frito sem gordura',
      'tem como tirar a cebola', 'trocar bife por frango', 'ponto da carne bem passado'
    ]
  },
  {
    intent: 'alterar_pedido',
    examples: [
      'quero alterar meu pedido', 'mudar pedido', 'quero fazer uma alteracao',
      'modificar o pedido', 'gostaria de trocar o item', 'trocar de marmita',
      'alterar o que pedi', 'quero mexer no meu pedido', 'mudar prato'
    ]
  },
  {
    intent: 'pedir_bebida',
    examples: [
      'tem refrigerante', 'quero uma coca lata', 'suco de laranja natural',
      'quais bebidas tem', 'adiciona uma agua mineral', 'tem refri gelado'
    ]
  },
  {
    intent: 'fechar_pedido',
    examples: [
      'fechar pedido', 'finalizar pedido', 'quanto deu tudo', 'qual o valor total',
      'quero a conta', 'pode fechar', 'quanto ficou', 'concluir o pedido',
      'ja escolhi tudo quanto deu', 'finalizar a compra'
    ]
  },
  {
    intent: 'taxa_tempo_entrega',
    examples: [
      'qual a taxa de entrega', 'quanto custa o frete', 'quanto tempo demora para entregar',
      'qual o prazo de entrega', 'entrega no centro', 'valor da entrega'
    ]
  },
  {
    intent: 'formas_pagamento',
    examples: [
      'quais as formas de pagamento', 'aceita pix', 'aceita cartao', 'posso pagar no dinheiro',
      'como posso pagar', 'passa cartao na entrega'
    ]
  },
  {
    intent: 'ajuda',
    examples: [
      'ajuda', 'socorro', 'como funciona', 'comandos', 'reiniciar', 'limpar pedido'
    ]
  }
];

class TextVectorizer {
  constructor(dataset) {
    this.vocabulary = [];
    this.vocabIndex = new Map();
    this.docVectors = [];
    this.docIntents = [];
    this.idf = [];

    this.train(dataset);
  }

  train(dataset) {
    const documents = [];
    dataset.forEach(item => {
      item.examples.forEach(ex => {
        const { stems } = preprocessNLP(ex);
        documents.push({ intent: item.intent, stems });
      });
    });

    const vocabSet = new Set();
    documents.forEach(doc => {
      doc.stems.forEach(stem => vocabSet.add(stem));
    });

    this.vocabulary = Array.from(vocabSet);
    this.vocabulary.forEach((term, idx) => {
      this.vocabIndex.set(term, idx);
    });

    const N = documents.length;
    this.idf = this.vocabulary.map(term => {
      const docCount = documents.filter(doc => doc.stems.includes(term)).length;
      return Math.log((N + 1) / (docCount + 1)) + 1;
    });

    documents.forEach(doc => {
      const vec = this.vectorize(doc.stems);
      this.docVectors.push(vec);
      this.docIntents.push(doc.intent);
    });
  }

  vectorize(stems) {
    const vec = new Array(this.vocabulary.length).fill(0);
    if (!stems || stems.length === 0) return vec;

    const termFreq = new Map();
    stems.forEach(s => termFreq.set(s, (termFreq.get(s) || 0) + 1));

    termFreq.forEach((count, term) => {
      const idx = this.vocabIndex.get(term);
      if (idx !== undefined) {
        const tf = count / stems.length;
        vec[idx] = tf * this.idf[idx];
      }
    });

    return vec;
  }

  cosineSimilarity(vecA, vecB) {
    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  predictIntent(queryStems) {
    const queryVec = this.vectorize(queryStems);
    let bestScore = 0;
    let bestIntent = null;

    for (let i = 0; i < this.docVectors.length; i++) {
      const sim = this.cosineSimilarity(queryVec, this.docVectors[i]);
      if (sim > bestScore) {
        bestScore = sim;
        bestIntent = this.docIntents[i];
      }
    }

    return { intent: bestIntent, score: bestScore };
  }
}

const vectorizer = new TextVectorizer(INTENT_DATASET);

// ========================================================
// 4. MOTOR DE ESTADO DO PEDIDO
// ========================================================
class OrderManager {
  constructor() {
    this.items = [];
    this.cliente = { nome: '', endereco: '', pagamento: '' };
    this.etapa = 'atendimento'; // 'atendimento' | 'aguardando_alteracao' | 'aguardando_dados' | 'encerrado'
    this.itemEmAlteracao = null; // referência ao item que está sendo alterado
  }

  reset() {
    this.items = [];
    this.cliente = { nome: '', endereco: '', pagamento: '' };
    this.etapa = 'atendimento';
    this.itemEmAlteracao = null;
  }

  adicionarItem(nome, preco, tipo, qtd = 1, obs = []) {
    const item = {
      id: Date.now() + Math.random().toString(36).substr(2, 4),
      nome,
      preco,
      tipo,
      qtd,
      obs: [...obs]
    };
    this.items.push(item);
    return item;
  }

  removerItemPorNome(nomeTermo) {
    const norm = normalizeText(nomeTermo);
    const idx = this.items.findIndex(it => normalizeText(it.nome).includes(norm));
    if (idx !== -1) {
      const removido = this.items.splice(idx, 1)[0];
      return removido;
    }
    return null;
  }

  encontrarItemPorNome(nomeTermo) {
    const norm = normalizeText(nomeTermo);
    return this.items.find(it => normalizeText(it.nome).includes(norm)) || null;
  }

  adicionarObservacaoAoItem(item, observacao) {
    if (item && !item.obs.includes(observacao)) {
      item.obs.push(observacao);
      return true;
    }
    return false;
  }

  adicionarObservacaoAoUltimoItem(observacao) {
    if (this.items.length > 0) {
      const ultimo = this.items[this.items.length - 1];
      if (!ultimo.obs.includes(observacao)) {
        ultimo.obs.push(observacao);
      }
      return ultimo;
    }
    return null;
  }

  calcularSubtotal() {
    return this.items.reduce((acc, curr) => acc + (curr.preco * curr.qtd), 0);
  }

  calcularTotal() {
    const subtotal = this.calcularSubtotal();
    return subtotal > 0 ? subtotal + CARDAPIO.taxaEntrega : 0;
  }

  temItens() {
    return this.items.length > 0;
  }

  listarItensFormatados() {
    if (!this.temItens()) return 'Nenhum item adicionado no momento.';
    return this.items.map((it, idx) => {
      let desc = `${idx + 1}. **${it.qtd}x ${it.nome}** (R$ ${(it.preco * it.qtd).toFixed(2).replace('.', ',')})`;
      if (it.obs && it.obs.length > 0) desc += ` [Personalizações: ${it.obs.join(', ')}]`;
      return desc;
    }).join('\n');
  }

  gerarResumoPedido() {
    if (!this.temItens()) {
      return 'Seu carrinho ainda está vazio! Que tal escolher uma de nossas opções do cardápio? 🍱';
    }

    let resumo = '📝 **Resumo do seu Pedido:**\n\n';
    this.items.forEach((item, idx) => {
      resumo += `${idx + 1}. **${item.qtd}x ${item.nome}** - R$ ${(item.preco * item.qtd).toFixed(2).replace('.', ',')}\n`;
      if (item.obs && item.obs.length > 0) {
        resumo += `   *Observações:* ${item.obs.join(', ')}\n`;
      }
    });

    const subtotal = this.calcularSubtotal();
    const total = this.calcularTotal();

    resumo += `\n• **Subtotal:** R$ ${subtotal.toFixed(2).replace('.', ',')}\n`;
    resumo += `• **Taxa de Entrega:** R$ ${CARDAPIO.taxaEntrega.toFixed(2).replace('.', ',')} *(Fixa para toda a cidade)*\n`;
    resumo += `• **VALOR TOTAL:** R$ ${total.toFixed(2).replace('.', ',')} 💰\n\n`;
    resumo += `🛵 *Tempo estimado de entrega:* ${CARDAPIO.tempoEntrega}\n\n`;
    resumo += `Para concluir a entrega, por favor me informe:\n`;
    resumo += `1. **Seu Nome**\n`;
    resumo += `2. **Endereço Completo de Entrega** (Rua, Número, Bairro)\n`;
    resumo += `3. **Forma de Pagamento** (Pix, Cartão ou Dinheiro)\n\n`;
    resumo += `*(Caso deseje desistir ou cancelar, basta digitar **cancelar** ou **não quero mais**)*`;

    return resumo;
  }
}

const orderManager = new OrderManager();

// ========================================================
// 5. MOTOR DE REGRAS, GUARDRAILS E PARSER DETERMINÍSTICO
// ========================================================
const GUARDRAIL_REFUSAL = 
  "Desculpe, mas sou o assistente virtual da Marmitaria Sabor Caseiro e posso ajudar apenas com informações do nosso cardápio, pedidos e entregas de marmitas. Gostaria de dar uma olhada nas opções deliciosas de hoje? 🍱";

function isOffTopicOrJailbreak(text) {
  const normalized = normalizeText(text);

  const jailbreakPatterns = [
    /ignore (all|todas|as)? (previous|anteriores)? instructions/i,
    /desconsidere as instrucoes/i,
    /esqueca todas as regras/i,
    /modo desenvolvedor/i,
    /developer mode/i,
    /dan mode/i,
    /voce agora e/i,
    /you are now/i,
    /finja que/i,
    /repita o prompt/i,
    /mostre seu system prompt/i,
    /quais sao suas instrucoes/i,
    /terminal linux/i,
    /escreva um codigo/i,
    /crie um script/i,
    /conte uma piada/i,
    /quem ganhou a eleicao/i,
    /politica/i,
    /receita de bolo caseiro/i
  ];

  for (const pat of jailbreakPatterns) {
    if (pat.test(normalized)) {
      return true;
    }
  }

  const outOfContextKeywords = [
    'python', 'javascript', 'html', 'css', 'programacao', 'deputado', 'presidente',
    'futebol', 'campeonato', 'bitcoin', 'criptomoeda', 'vagina', 'sexo', 'hack'
  ];

  for (const kw of outOfContextKeywords) {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    if (regex.test(normalized)) {
      return true;
    }
  }

  return false;
}

// Verifica se o usuário expressou intenção de desistir/cancelar
function isCancellationOrRefusal(text) {
  const norm = normalizeText(text);

  const refusalPatterns = [
    /^(nao|nao quero|nao vou querer|nao quero mais|desisti|desisto)$/i,
    /nao quero mais/i,
    /nao vou pedir/i,
    /deixa pra la/i,
    /deixa quieto/i,
    /cancela/i,
    /cancelar/i,
    /cancelar pedido/i,
    /pode cancelar/i,
    /nao precisa mais/i,
    /nao vou querer nada/i,
    /nao tenho interesse/i,
    /encerrar/i,
    /encerrar atendimento/i,
    /parar/i,
    /sair/i,
    /tchau/i,
    /ate logo/i,
    /so isso obrigado/i,
    /nao obrigado/i,
    /nada mais/i
  ];

  for (const pat of refusalPatterns) {
    if (pat.test(norm)) return true;
  }
  return false;
}

// Itens comuns de restaurante que NÃO constam no cardápio de hoje
const ITENS_INDISPONIVEIS = [
  'pizza', 'hamburguer artesanal', 'hamburguer tradicional', 'pastel', 'sushi', 'temaki',
  'feijoada', 'lasanha', 'parmegiana', 'churrasco completo', 'macarronada', 'strogonoff',
  'coxinha', 'salgado', 'acai', 'cerveja', 'chopp', 'vinho', 'whisky', 'sobremesa',
  'pudim', 'sorvete', 'bolo', 'torta', 'yakisoba', 'peixe frito', 'camarao', 'salmao'
];

function detectUnavailableItem(text) {
  const norm = normalizeText(text);
  for (const item of ITENS_INDISPONIVEIS) {
    const regex = new RegExp(`\\b${item}\\b`, 'i');
    if (regex.test(norm)) {
      return item;
    }
  }
  return null;
}

function extractQuantity(text) {
  const matchNum = text.match(/\b([1-9]|10)\b/);
  if (matchNum) return parseInt(matchNum[1], 10);

  if (/\buma?\b/i.test(text)) return 1;
  if (/\bduas?\b/i.test(text)) return 2;
  if (/\btres\b/i.test(text)) return 3;
  if (/\bquatro\b/i.test(text)) return 4;
  return 1;
}

function extractCustomizations(text) {
  const norm = normalizeText(text);
  const obs = [];

  if (/bem passad[oa]/i.test(norm)) obs.push('Carne bem passada');
  else if (/ao ponto/i.test(norm)) obs.push('Carne ao ponto');
  else if (/mal passad[oa]/i.test(norm)) obs.push('Carne mal passada');

  if (/frango grelhado|opcao frango/i.test(norm)) obs.push('Opção: Frango grelhado');
  if (/bife acebolado|opcao bife/i.test(norm)) obs.push('Opção: Bife');

  const semMatches = norm.match(/sem\s+([a-z]+)/g);
  if (semMatches) {
    semMatches.forEach(item => {
      obs.push(item);
    });
  }

  if (/pouco sal/i.test(norm)) obs.push('Pouco sal');
  if (/sem pimenta/i.test(norm)) obs.push('Sem pimenta');
  if (/tempero a parte/i.test(norm)) obs.push('Tempero à parte');

  return obs;
}

function detectMarmitas(text) {
  const norm = normalizeText(text);
  const detected = [];

  CARDAPIO.marmitas.forEach(m => {
    let score = 0;
    if (norm.includes(m.id)) score += 3;
    m.keywords.forEach(kw => {
      if (new RegExp(`\\b${kw}\\b`).test(norm)) score += 1;
    });

    if (score >= 2 || norm.includes(m.id)) {
      detected.push(m);
    }
  });

  return detected;
}

function detectBebidas(text) {
  const norm = normalizeText(text);
  const detected = [];

  CARDAPIO.bebidas.forEach(b => {
    let found = false;
    b.keywords.forEach(kw => {
      if (new RegExp(`\\b${kw}\\b`).test(norm)) found = true;
    });
    if (found) detected.push(b);
  });

  return detected;
}

function getSaudacaoContextual() {
  const hora = new Date().getHours();
  let cumprimento = 'Olá!';
  if (hora >= 5 && hora < 12) cumprimento = 'Bom dia!';
  else if (hora >= 12 && hora < 18) cumprimento = 'Boa tarde!';
  else cumprimento = 'Boa noite!';

  return (
    `${cumprimento} Seja muito bem-vindo(a) à **Marmitaria Sabor Caseiro**! 🍱\n\n` +
    `Aqui você encontra refeições frescas e deliciosas feitas na hora:\n` +
    `• **Marmita Tradicional** (Bife acebolado ou frango) - R$ 22,00\n` +
    `• **Marmita Fit** (Arroz integral, filé e legumes) - R$ 25,00\n` +
    `• **Marmita Vegana** (Hambúrguer de grão-de-bico) - R$ 24,00\n` +
    `• **Marmita Executiva** (Picanha e tropeiro) - R$ 28,00\n\n` +
    `🛵 *Taxa fixa de entrega: R$ 5,00*\n\n` +
    `Como posso ajudar você hoje? Você pode escolher um prato, personalizar ingredientes ou tirar dúvidas!`
  );
}

// ========================================================
// 6. CONTROLADOR PRINCIPAL DO CHATBOT (SEM LLM)
// ========================================================
function processUserMessage(rawText) {
  const userText = rawText.trim();
  if (!userText) return 'Por favor, digite uma mensagem!';

  // ETAPA 1: Guardrails
  if (isOffTopicOrJailbreak(userText)) {
    return GUARDRAIL_REFUSAL;
  }

  const norm = normalizeText(userText);

  // ETAPA 2: Tratamento de Desistência / Recusa / Cancelamento
  if (isCancellationOrRefusal(userText)) {
    const tinhaItens = orderManager.temItens();
    orderManager.reset();
    orderManager.etapa = 'encerrado';

    if (tinhaItens) {
      return (
        "Sem problemas! Seu pedido foi cancelado e o atendimento encerrado com sucesso. 👍\n\n" +
        "Agradecemos o seu contato com a **Marmitaria Sabor Caseiro**. Quando quiser saborear nossos pratos novamente, basta iniciar um novo chat ou digitar **olá**! Tenha um ótimo dia! 🍱"
      );
    } else {
      return (
        "Entendido! Atendimento encerrado. Muito obrigado pela visita à **Marmitaria Sabor Caseiro**! ✨\n\n" +
        "Estaremos por aqui sempre que der aquela fominha caseira. Se precisar de algo no futuro, é só chamar!"
      );
    }
  }

  // ETAPA 3: Comandos de Ajuda e Reinicialização
  if (/^(ajuda|socorro|comandos|help)$/i.test(norm)) {
    return (
      "📌 **Comandos Úteis:**\n\n" +
      "• **Cardápio**: Veja todas as opções e valores.\n" +
      "• **Pedir [Marmita]**: Ex: *Quero 1 Marmita Executiva com carne ao ponto e sem cebola*.\n" +
      "• **Alterar pedido**: Altere ingredientes ou troque itens do seu carrinho.\n" +
      "• **Bebidas**: Adicione refrigerante, suco ou água.\n" +
      "• **Fechar pedido**: Ver a conta com a taxa fixa de entrega (R$ 5,00).\n" +
      "• **Cancelar / Não quero mais**: Encerra o pedido imediatamente sem insistência.\n" +
      "• **Novo chat / Reiniciar**: Começa um atendimento do zero."
    );
  }

  if (/^(reiniciar|novo chat|novo pedido|recomecar)$/i.test(norm)) {
    orderManager.reset();
    return getSaudacaoContextual();
  }

  // Se o atendimento anterior tiver sido encerrado e o cliente voltar a falar
  if (orderManager.etapa === 'encerrado') {
    orderManager.reset();
  }

  // ETAPA 4: Validação de Pedido de Produto Inexistente no Cardápio
  const itemIndisponivel = detectUnavailableItem(userText);
  if (itemIndisponivel) {
    return (
      `❌ Desculpe, mas não temos **${itemIndisponivel}** disponível em nosso cardápio de hoje.\n\n` +
      `Trabalhamos exclusivamente com nossas deliciosas opções de almoço caseiro:\n` +
      `• **Marmita Tradicional** (R$ 22,00)\n` +
      `• **Marmita Fit** (R$ 25,00)\n` +
      `• **Marmita Vegana** (R$ 24,00)\n` +
      `• **Marmita Executiva** (R$ 28,00)\n\n` +
      `Gostaria de escolher uma dessas opções para a sua refeição? 🍱`
    );
  }

  // ETAPA 5: Fluxo de Alteração de Pedido
  // Caso A: Se o bot estiver aguardando o cliente especificar o que quer alterar
  if (orderManager.etapa === 'aguardando_alteracao') {
    const customizacoes = extractCustomizations(userText);
    const marmitasNovas = detectMarmitas(userText);

    // Se o cliente mencionou uma nova marmita para substituir
    if (marmitasNovas.length > 0) {
      if (orderManager.itemEmAlteracao) {
        orderManager.removerItemPorNome(orderManager.itemEmAlteracao.nome);
      }
      const novo = orderManager.adicionarItem(marmitasNovas[0].nome, marmitasNovas[0].preco, 'marmita', 1, customizacoes);
      orderManager.etapa = 'atendimento';
      orderManager.itemEmAlteracao = null;
      return (
        `✅ Perfeito! Pedido alterado para **${novo.nome}** (R$ ${novo.preco.toFixed(2).replace('.', ',')})` +
        (novo.obs.length > 0 ? ` com as seguintes observações: *${novo.obs.join(', ')}*.` : '.') +
        `\n\nSeu carrinho atualizado:\n${orderManager.listarItensFormatados()}\n\nDeseja alterar mais alguma coisa ou podemos **fechar o pedido**?`
      );
    }

    // Se o cliente especificou apenas alterações de ingredientes (ex: sem cebola, carne bem passada)
    if (customizacoes.length > 0) {
      const alvo = orderManager.itemEmAlteracao || orderManager.items[orderManager.items.length - 1];
      if (alvo) {
        customizacoes.forEach(obs => orderManager.adicionarObservacaoAoItem(alvo, obs));
        orderManager.etapa = 'atendimento';
        orderManager.itemEmAlteracao = null;
        return (
          `✅ Alteração aplicada com sucesso na **${alvo.nome}**: *${customizacoes.join(', ')}*.\n\n` +
          `Deseja fazer mais alguma alteração ou podemos **fechar o pedido**?`
        );
      }
    }

    // Se o cliente quiser remover ou trocar tudo
    if (/trocar|mudar|remover|tirar/i.test(norm)) {
      orderManager.etapa = 'atendimento';
      return `Claro! O que você gostaria de retirar ou adicionar? Nossas opções são: Tradicional, Fit, Vegana e Executiva.`;
    }

    orderManager.etapa = 'atendimento';
  }

  // Caso B: O cliente pediu para alterar / mudar um produto
  const solicitouAlteracao = /\b(alterar|mudar|modificar|trocar|troca)\b/i.test(norm);
  if (solicitouAlteracao) {
    if (!orderManager.temItens()) {
      return (
        "⚠️ Não foi possível realizar a alteração porque seu **carrinho ainda está vazio**!\n\n" +
        "Gostaria de dar uma olhada em nosso cardápio para adicionar uma marmita primeiro?"
      );
    }

    // Verifica se o cliente mencionou um produto específico para alterar (ex: "quero alterar a executiva")
    const marmitasMencionadas = detectMarmitas(userText);
    const bebidasMencionadas = detectBebidas(userText);
    const itemMencionado = marmitasMencionadas[0] || bebidasMencionadas[0];

    if (itemMencionado) {
      // Verifica se esse produto está no carrinho
      const itemNoCarrinho = orderManager.encontrarItemPorNome(itemMencionado.nome);
      if (!itemNoCarrinho) {
        return (
          `⚠️ **Atenção:** Você solicitou alterar **${itemMencionado.nome}**, mas este produto **não está no seu carrinho**!\n\n` +
          `Itens atualmente em seu pedido:\n${orderManager.listarItensFormatados()}\n\n` +
          `Por favor, informe qual dos itens do seu carrinho você deseja alterar e o que gostaria de mudar.`
        );
      } else {
        orderManager.etapa = 'aguardando_alteracao';
        orderManager.itemEmAlteracao = itemNoCarrinho;
        return (
          `Com certeza! Você deseja alterar a **${itemNoCarrinho.nome}**.\n\n` +
          `O que você gostaria de alterar nela? Você pode:\n` +
          `• Mudar o ponto da carne (mal passada, ao ponto, bem passada)\n` +
          `• Retirar ingredientes (ex: sem cebola, sem feijão, sem salada)\n` +
          `• Trocar por outra marmita (Tradicional, Fit, Vegana ou Executiva)`
        );
      }
    }

    // Se pediu para alterar genericamente sem especificar o item
    orderManager.etapa = 'aguardando_alteracao';
    orderManager.itemEmAlteracao = orderManager.items[orderManager.items.length - 1];
    return (
      `Claro! O que você deseja alterar no seu pedido?\n\n` +
      `Itens no seu carrinho:\n${orderManager.listarItensFormatados()}\n\n` +
      `Pode me dizer qual ingrediente quer retirar, o ponto da carne ou se deseja trocar por outro prato do cardápio!`
    );
  }

  // ETAPA 6: Se estiver na etapa de finalização aguardando dados cadastrais
  if (orderManager.etapa === 'aguardando_dados') {
    let pagto = '';
    if (/pix/i.test(norm)) pagto = 'Pix';
    else if (/cartao|credito|debito/i.test(norm)) pagto = 'Cartão';
    else if (/dinheiro|troco/i.test(norm)) pagto = 'Dinheiro';

    if (pagto) orderManager.cliente.pagamento = pagto;
    if (userText.length > 5 && !pagto) {
      if (!orderManager.cliente.endereco) {
        orderManager.cliente.endereco = userText;
      }
    }

    orderManager.etapa = 'encerrado';
    const total = orderManager.calcularTotal();
    return (
      `🎉 **Pedido Confirmado com Sucesso!**\n\n` +
      `Seu pedido já foi encaminhado para a nossa cozinha com todo o carinho caseiro! 🍳\n\n` +
      `• **Total a pagar:** R$ ${total.toFixed(2).replace('.', ',')} *(com taxa de entrega inclusa)*\n` +
      (orderManager.cliente.pagamento ? `• **Forma de pagamento:** ${orderManager.cliente.pagamento}\n` : '') +
      `• **Previsão de entrega:** ${CARDAPIO.tempoEntrega} 🛵\n\n` +
      `Muito obrigado pela preferência e bom apetite! Caso queira fazer um novo pedido mais tarde, basta clicar em **Novo Chat** ou digitar **olá**.`
    );
  }

  // ETAPA 7: Detecção de Itens do Pedido (Adição direta)
  const marmitasAchadas = detectMarmitas(userText);
  const bebidasAchadas = detectBebidas(userText);
  const customizacoes = extractCustomizations(userText);
  const qtd = extractQuantity(userText);

  if (marmitasAchadas.length > 0 || bebidasAchadas.length > 0) {
    let feedback = '';

    marmitasAchadas.forEach(m => {
      const item = orderManager.adicionarItem(m.nome, m.preco, 'marmita', qtd, customizacoes);
      feedback += `✅ Adicionado: **${item.qtd}x ${item.nome}** (R$ ${(item.preco * item.qtd).toFixed(2).replace('.', ',')})\n`;
      if (item.obs.length > 0) {
        feedback += `   *Personalizações anotadas:* ${item.obs.join(', ')}\n`;
      }
    });

    bebidasAchadas.forEach(b => {
      const item = orderManager.adicionarItem(b.nome, b.preco, 'bebida', qtd);
      feedback += `🥤 Adicionado: **${item.qtd}x ${item.nome}** (R$ ${(item.preco * item.qtd).toFixed(2).replace('.', ',')})\n`;
    });

    feedback += `\nDeseja adicionar mais alguma marmita ou bebida? Quando estiver pronto, basta pedir para **fechar o pedido** (ou dizer **alterar** se quiser ajustar algo)!`;
    return feedback;
  }

  if (customizacoes.length > 0 && orderManager.temItens()) {
    customizacoes.forEach(obs => orderManager.adicionarObservacaoAoUltimoItem(obs));
    return `Perfeito! Anotei a personalização (**${customizacoes.join(', ')}**) no seu pedido. Algo mais?`;
  }

  // ETAPA 8: Fechamento de Pedido
  if (/\b(fechar|finalizar|conta|total|quanto deu|concluir)\b/i.test(norm)) {
    if (!orderManager.temItens()) {
      return "Você ainda não escolheu nenhum item! Gostaria de dar uma olhada no nosso cardápio antes de fechar o pedido?";
    }
    orderManager.etapa = 'aguardando_dados';
    return orderManager.gerarResumoPedido();
  }

  // ETAPA 9: Classificação com NLP + TF-IDF + Cosseno
  const { stems } = preprocessNLP(userText);
  const prediction = vectorizer.predictIntent(stems);

  const COSINE_THRESHOLD = 0.50;

  if (prediction && prediction.score >= COSINE_THRESHOLD) {
    switch (prediction.intent) {
      case 'saudacao':
        return getSaudacaoContextual();

      case 'ver_cardapio':
        return (
          "📋 **Cardápio de Hoje - Marmitaria Sabor Caseiro:**\n\n" +
          "• **Marmita Tradicional (R$ 22,00):** Arroz, feijão carioca, bife acebolado ou frango grelhado, farofa e salada verde.\n" +
          "• **Marmita Fit (R$ 25,00):** Arroz integral, filé de frango grelhado, mix de legumes ao vapor (cenoura e brócolis) e feijão preto.\n" +
          "• **Marmita Vegana (R$ 24,00):** Arroz integral, lentilha temperada, hambúrguer de grão-de-bico, abobrinha refogada e purê de abóbora.\n" +
          "• **Marmita Executiva (R$ 28,00):** Arroz branco, feijão tropeiro, picanha fatiada acebolada, batata rústica e vinagrete.\n\n" +
          "🥤 **Bebidas:** Refrigerante lata (R$ 6,00), Suco de Laranja Natural (R$ 7,00), Água (R$ 4,00).\n" +
          "🛵 *Taxa fixa de entrega: R$ 5,00*\n\n" +
          "Qual opção você deseja escolher hoje? Você pode personalizar com 'sem cebola', 'carne bem passada', etc."
        );

      case 'alterar_pedido':
        if (!orderManager.temItens()) {
          return "Seu carrinho está vazio no momento. Que tal escolher uma das nossas marmitas primeiro?";
        }
        orderManager.etapa = 'aguardando_alteracao';
        return `O que você deseja alterar no seu pedido? Você pode mudar ingredientes, pontos da carne ou trocar de prato!`;

      case 'pedir_marmita':
        return "Qual das nossas marmitas você deseja? Temos **Tradicional** (R$ 22), **Fit** (R$ 25), **Vegana** (R$ 24) e **Executiva** (R$ 28). Você também pode especificar as personalizações!";

      case 'pedir_bebida':
        return "Temos para acompanhar: **Refrigerante Lata** (R$ 6,00), **Suco Natural de Laranja 300ml** (R$ 7,00) e **Água Mineral 500ml** (R$ 4,00). Qual deseja?";

      case 'taxa_tempo_entrega':
        return `🛵 Nossa **taxa de entrega é fixa em R$ ${CARDAPIO.taxaEntrega.toFixed(2).replace('.', ',')}** para qualquer bairro da cidade, e o tempo estimado de entrega é de **${CARDAPIO.tempoEntrega}**!`;

      case 'formas_pagamento':
        return `💳 Aceitamos **Pix**, **Cartões de Crédito/Débito** e **Dinheiro** (com troco se precisar)! O pagamento pode ser feito na entrega.`;

      case 'fechar_pedido':
        if (!orderManager.temItens()) {
          return "Você ainda não adicionou itens ao seu pedido. Que tal uma Marmita Executiva ou Fit?";
        }
        orderManager.etapa = 'aguardando_dados';
        return orderManager.gerarResumoPedido();

      case 'ajuda':
        return "Você pode me pedir para ver o cardápio, escolher sua marmita, retirar ingredientes, alterar produtos ou fechar o seu pedido a qualquer momento!";
    }
  }

  // ETAPA 10: Fallback Amigável
  return (
    "Posso ajudar com o seu pedido! 🍱 Você gostaria de ver o nosso **cardápio de hoje**, escolher uma **marmita** ou **fechar o pedido**?"
  );
}

// Exportação
window.ChatEngine = {
  processUserMessage,
  orderManager,
  CARDAPIO,
  getSaudacaoContextual
};
