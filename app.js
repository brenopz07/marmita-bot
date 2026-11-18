// Regra de auto-limpeza de cache antigo para garantir que qualquer cliente execute a versão mais recente
if (typeof localStorage !== 'undefined') {
  localStorage.removeItem('marmita_api_key');
}

/**
 * Marmitaria Sabor Caseiro - Chatbot Client-Side Sem LLM
 * Orquestração da Interface, Renderização de Balões e Integração com o Motor de Regras + NLP
 */

// ==========================================
// 1. ELEMENTOS DO DOM
// ==========================================
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const typingIndicator = document.getElementById('typing-indicator');

// ==========================================
// 2. INICIALIZAÇÃO
// ==========================================
function startConversation() {
  if (!chatMessages) return;
  chatMessages.innerHTML = '';

  // Mensagem inicial do bot
  renderMessage(
    'bot',
    'Olá! Seja muito bem-vindo(a) à **Marmitaria Sabor Caseiro**! 🍱\n\n' +
    'Hoje temos opções fresquinhas para o seu almoço:\n' +
    '• **Marmita Tradicional** (Bife acebolado ou frango) - R$ 22,00\n' +
    '• **Marmita Fit** (Arroz integral, frango e legumes) - R$ 25,00\n' +
    '• **Marmita Vegana** (Hambúrguer de grão-de-bico) - R$ 24,00\n' +
    '• **Marmita Executiva** (Picanha e tropeiro) - R$ 28,00\n\n' +
    '🛵 *Taxa fixa de entrega: R$ 5,00*\n\n' +
    'Como posso montar o seu prato hoje? Você pode personalizar o ponto da carne ou retirar ingredientes!'
  );
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', startConversation);
} else {
  startConversation();
}

// ==========================================
// 3. EVENTOS DO CHAT
// ==========================================

// Auto-expand textarea
userInput.addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = (this.scrollHeight) + 'px';
});

userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    chatForm.requestSubmit ? chatForm.requestSubmit() : chatForm.dispatchEvent(new Event('submit', { cancelable: true }));
  }
});

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;

  // Renderiza imediatamente mensagem do usuário
  renderMessage('user', text);
  userInput.value = '';
  userInput.style.height = 'auto';

  // Feedback visual de digitação
  setLoading(true);

  setTimeout(() => {
    try {
      if (window.ChatEngine && typeof window.ChatEngine.processUserMessage === 'function') {
        const reply = window.ChatEngine.processUserMessage(text);
        renderMessage('bot', reply);
      } else {
        renderMessage('bot', 'Aguarde um instante, carregando a inteligência...');
      }
    } catch (error) {
      console.error('Erro no processamento da mensagem:', error);
      renderMessage('bot', '❌ Desculpe, tive um imprevisto ao processar sua solicitação. Digite **ajuda** para ver os comandos disponíveis.');
    } finally {
      setLoading(false);
    }
  }, 150);
});

// ==========================================
// 4. RENDERIZAÇÃO DE MENSAGENS
// ==========================================
function renderMessage(sender, text) {
  const wrapper = document.createElement('div');
  wrapper.className = `message-wrapper ${sender}`;

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.innerHTML = formatMessageText(text);

  const time = document.createElement('span');
  time.className = 'message-time';
  const now = new Date();
  time.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  wrapper.appendChild(bubble);
  wrapper.appendChild(time);
  chatMessages.appendChild(wrapper);

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatMessageText(raw) {
  let safe = String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  safe = safe.replace(/\n/g, '<br>');
  safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  safe = safe.replace(/\*(.*?)\*/g, '<em>$1</em>');
  return safe;
}

function setLoading(isLoading) {
  if (isLoading) {
    typingIndicator.classList.remove('hidden');
    sendBtn.disabled = true;
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } else {
    typingIndicator.classList.add('hidden');
    sendBtn.disabled = false;
  }
}
