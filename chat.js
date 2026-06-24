// chat.js (프론트엔드)
// 사용자가 입력한 질문을 /api/chat (서버리스 함수)로 보내고,
// 응답을 화면에 표시합니다. API 키는 여기에 절대 들어가지 않습니다.

const thread = document.getElementById('thread');
const composer = document.getElementById('composer');
const input = document.getElementById('question');
const sendBtn = document.getElementById('sendBtn');
const intro = document.getElementById('intro');

// textarea 자동 높이 조절
input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 120) + 'px';
});

// 추천 질문 칩 클릭 시 바로 전송
document.querySelectorAll('.suggestion-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    const q = chip.getAttribute('data-q');
    input.value = q;
    sendMessage();
  });
});

composer.addEventListener('submit', (e) => {
  e.preventDefault();
  sendMessage();
});

// Enter로 전송, Shift+Enter는 줄바꿈
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

function addMessage(text, role) {
  const row = document.createElement('div');
  row.className = `msg msg-${role}`;

  if (role === 'bot') {
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = 'A';
    row.appendChild(avatar);
  }

  const bubble = document.createElement('div');
  bubble.className = 'bubble';

  if (role === 'bot' && typeof marked !== 'undefined') {
    // 봇 응답: 마크다운(표, 굵게, 목록 등)을 실제 HTML로 변환해서 렌더링
    bubble.innerHTML = marked.parse(text);
  } else {
    // 사용자 입력은 보안을 위해 항상 순수 텍스트로 표시
    bubble.textContent = text;
  }

  row.appendChild(bubble);
  thread.appendChild(row);
  thread.scrollTop = thread.scrollHeight;
  return bubble;
}

function addTypingIndicator() {
  const row = document.createElement('div');
  row.className = 'msg msg-bot';
  row.id = 'typingRow';

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = 'A';
  row.appendChild(avatar);

  const bubble = document.createElement('div');
  bubble.className = 'bubble typing';
  bubble.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
  row.appendChild(bubble);

  thread.appendChild(row);
  thread.scrollTop = thread.scrollHeight;
}

function removeTypingIndicator() {
  const row = document.getElementById('typingRow');
  if (row) row.remove();
}

async function sendMessage() {
  const question = input.value.trim();
  if (!question) return;

  intro.style.display = 'none';
  addMessage(question, 'user');
  input.value = '';
  input.style.height = 'auto';
  sendBtn.disabled = true;
  addTypingIndicator();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });

    const data = await res.json();
    removeTypingIndicator();

    if (!res.ok) {
      addMessage(data.error || '오류가 발생했습니다. 다시 시도해주세요.', 'bot').classList.add('error');
    } else {
      addMessage(data.reply, 'bot');
    }
  } catch (err) {
    removeTypingIndicator();
    addMessage('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 'bot').classList.add('error');
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}
