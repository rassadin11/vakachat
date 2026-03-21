import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../../store/chatStore';
import styles from './Profile.module.scss';

const LS_DISPLAY_NAME = 'vakachat_display_name';
const LS_SYSTEM_PROMPT = 'vakachat_system_prompt';

export default function Profile() {
  const { user, chats } = useChatStore();

  const [displayName, setDisplayName] = useState(() => localStorage.getItem(LS_DISPLAY_NAME) ?? '');
  const [systemPrompt, setSystemPrompt] = useState(() => localStorage.getItem(LS_SYSTEM_PROMPT) ?? '');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [systemPrompt]);

  const greetingName = displayName || (user?.email?.split('@')[0] ?? 'Гость');

  const saveDisplayName = () => localStorage.setItem(LS_DISPLAY_NAME, displayName);
  const saveSystemPrompt = () => localStorage.setItem(LS_SYSTEM_PROMPT, systemPrompt);

  const allMessages = chats.flatMap(c => c.messages);
  const userMsgs = allMessages.filter(m => m.role === 'user').length;
  const uniqueModels = new Set(
    allMessages.filter(m => m.role === 'assistant' && m.model).map(m => m.model!)
  ).size;

  const createdAt = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';

  const balance = user ? `${parseFloat(String(user.balance)).toFixed(2)} ₽` : '—';

  const stats = [
    { label: 'Оборот токенов', value: '—' },
    { label: 'Чатов создано', value: chats.length },
    { label: 'Сообщений отправлено', value: userMsgs },
    { label: 'Моделей использовано', value: uniqueModels },
    { label: 'Аккаунт создан', value: createdAt },
    { label: 'Баланс', value: balance },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.greeting}>
          Привет, <span className={styles.greetingName}>{greetingName}</span>
        </h1>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Настройки</h2>
          <div className={styles.fields}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Отображаемое имя</label>
              <input
                className={styles.input}
                type="text"
                placeholder="Например, Артём"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                onBlur={saveDisplayName}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Системный промпт</label>
              <p className={styles.hint}>Отправляется нейросети перед каждым новым чатом</p>
              <textarea
                ref={textareaRef}
                className={styles.textarea}
                placeholder="Например: Отвечай кратко и по делу. Используй markdown."
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                onBlur={saveSystemPrompt}
              />
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Статистика</h2>
          <div className={styles.statsGrid}>
            {stats.map(s => (
              <div key={s.label} className={styles.statCard}>
                <span className={styles.statLabel}>{s.label}</span>
                <span className={styles.statValue}>{s.value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
