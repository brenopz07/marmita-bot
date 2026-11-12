# 🍱 Marmitaria Sabor Caseiro - Chatbot com IA

Aplicação 100% *client-side* (HTML, CSS e Vanilla JavaScript) para atendimento automatizado e fechamento de pedidos de marmitas utilizando LLMs com guardrails rigorosos de segurança e prevenção contra jailbreak.

---

## 🚀 Funcionalidades
- **Cardápio Dinâmico com Preços:** Marmitas Tradicional (R$ 22), Fit (R$ 25), Vegana (R$ 24) e Executiva (R$ 28).
- **Personalização de Pratos:** Suporte a remoção de ingredientes (ex: sem cebola), pontos da carne e temperos via linguagem natural.
- **Fechamento de Conta Automático:** Detalhamento de itens, subtotal, taxa de entrega fixa (R$ 5,00) e cálculo do valor final.
- **Guardrails Blindados:** Imune a injeções de prompt ("ignore previous instructions") e redirecionamento educado para temas fora do escopo.
- **Multi-Provedor:** Suporta Groq (Llama 3 gratuito e veloz), Google Gemini e OpenAI.
- **Armazenamento Seguro da Key:** A API Key é armazenada estritamente no `localStorage` do navegador do usuário, sem backend intermediário.

---

## 🛠️ Como Executar Localmente
Basta clonar o repositório e abrir o arquivo `index.html` em qualquer navegador moderno ou via extensão como *Live Server* do VS Code.

---

## 📦 Passo a Passo Git & Deploy no GitHub Pages

### 1. Inicialização e Subida para o GitHub
Abra o terminal na pasta do projeto e execute:

```bash
# Inicializa o repositório git local
git init

# Adiciona todos os arquivos
git add .

# Faz o commit inicial
git commit -m "feat: Chatbot de Marmitaria 100% client-side com Guardrails"

# Cria a branch principal main
git branch -M main

# Conecte ao seu repositório remoto (substitua pelo seu usuário e nome do repo)
git remote add origin https://github.com/SeuUsuario/marmita-bot.git

# Envia os arquivos para o GitHub
git push -u origin main
```

---

### 2. Ativação do GitHub Pages
Para colocar a aplicação online gratuitamente:
1. Acesse seu repositório no GitHub: `https://github.com/SeuUsuario/marmita-bot`.
2. Clique na aba **Settings** (Configurações) no menu superior.
3. No menu lateral esquerdo, clique em **Pages**.
4. Na seção **Build and deployment**:
   - Em **Source**, selecione `Deploy from a branch`.
   - Em **Branch**, selecione `main` e a pasta `/(root)`.
   - Clique em **Save**.
5. Aguarde cerca de 1 a 2 minutos. A página será atualizada mostrando a URL pública do seu projeto.

---

## 🔗 Links de Exemplo
- **Repositório GitHub:** [https://github.com/SeuUsuario/marmita-bot](https://github.com/SeuUsuario/marmita-bot)
- **Aplicação Online (GitHub Pages):** [https://SeuUsuario.github.io/marmita-bot](https://SeuUsuario.github.io/marmita-bot)
