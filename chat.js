// chat.js (프론트엔드)
// 사용자가 입력한 질문을 /api/chat (서버리스 함수)로 보내고,
// 스트리밍 응답을 실시간으로 화면에 표시합니다. API 키는 여기에 절대 들어가지 않습니다.

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
    bubble.innerHTML = marked.parse(text);
  } else {
    bubble.textContent = text;
  }

  row.appendChild(bubble);
  thread.appendChild(row);
  thread.scrollTop = thread.scrollHeight;
  return bubble;
}

// 스트리밍용: 빈 봇 말풍선을 미리 만들어서 반환 (텍스트는 나중에 채워짐)
function addStreamingBubble() {
  const row = document.createElement('div');
  row.className = 'msg msg-bot';

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = 'A';
  row.appendChild(avatar);

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
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

  let bubble = null;
  let fullText = '';

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });

    if (!res.ok || !res.body) {
      removeTypingIndicator();
      let errMsg = '오류가 발생했습니다. 다시 시도해주세요.';
      try {
        const errData = await res.json();
        errMsg = errData.error || errMsg;
      } catch (_) {}
      addMessage(errMsg, 'bot').classList.add('error');
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const dataStr = line.slice(6).trim();
        if (!dataStr) continue;

        let event;
        try {
          event = JSON.parse(dataStr);
        } catch (_) {
          continue;
        }

        if (event.type === 'text') {
          if (!bubble) {
            removeTypingIndicator();
            bubble = addStreamingBubble();
          }
          fullText += event.text;
          // 스트리밍 중에는 마크다운 변환 전 원문을 그대로 표시 (실시간 타이핑 느낌)
          bubble.textContent = fullText;
          thread.scrollTop = thread.scrollHeight;
        } else if (event.type === 'error') {
          removeTypingIndicator();
          if (!bubble) {
            addMessage(event.error || '오류가 발생했습니다.', 'bot').classList.add('error');
          }
        } else if (event.type === 'done') {
          // 스트리밍 완료 후, 누적된 전체 텍스트를 마크다운(표 등)으로 최종 렌더링
          if (bubble && typeof marked !== 'undefined') {
            bubble.innerHTML = marked.parse(fullText);
          }
        }
      }
    }

    // 응답이 비어있는 경우 (스트림이 끝났는데 텍스트가 하나도 없었던 경우)
    if (!bubble) {
      removeTypingIndicator();
      addMessage('응답을 생성하지 못했습니다. 다시 시도해주세요.', 'bot').classList.add('error');
    } else if (typeof marked !== 'undefined') {
      // done 이벤트를 못 받았어도 스트림이 끝났으면 마크다운으로 마무리 렌더링
      bubble.innerHTML = marked.parse(fullText);
    }
  } catch (err) {
    removeTypingIndicator();
    if (!bubble) {
      addMessage('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 'bot').classList.add('error');
    }
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}
