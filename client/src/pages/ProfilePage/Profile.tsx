import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../../store/chatStore';
import { authApi, type UserStats } from '../../api/auth';
import styles from './Profile.module.scss';

function formatTokens(n: number): string {
  return n.toLocaleString('ru-RU');
}

function formatModel(id: string): string {
  return id.includes('/') ? id.split('/').slice(1).join('/') : id;
}

export default function Profile() {
  const { user, setUser, chats, setNotification } = useChatStore();

  const [displayName, setDisplayName] = useState(user?.name ?? '');
  const [systemPrompt, setSystemPrompt] = useState(user?.systemPrompt ?? '');
  const [apiStats, setApiStats] = useState<UserStats | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [systemPrompt]);

  useEffect(() => {
    authApi.getStats().then(setApiStats).catch(() => {});
  }, []);

  const greetingName = displayName || (user?.email?.split('@')[0] ?? 'Гость');

  const saveDisplayName = async () => {
    const trimmed = displayName.trim();
    if (trimmed === (user?.name ?? '')) return;
    try {
      const updated = await authApi.updateMe({ name: trimmed });
      setUser(updated);
      setNotification({ type: 'success', message: 'Имя обновлено.' });
    } catch {
      setNotification({ type: 'error', message: 'Не удалось сохранить имя.' });
    }
  };

  const saveSystemPrompt = async () => {
    const trimmed = systemPrompt.trim();
    if (trimmed === (user?.systemPrompt ?? '')) return;
    try {
      const updated = await authApi.updateMe({ systemPrompt: trimmed });
      setUser(updated);
      setNotification({ type: 'success', message: 'Системный промпт обновлён.' });
    } catch {
      setNotification({ type: 'error', message: 'Не удалось сохранить системный промпт.' });
    }
  };

  const createdAt = apiStats?.createdAt
    ? new Date(apiStats.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : user?.createdAt
      ? new Date(user.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '—';

  const stats = [
    { label: 'Токенов использовано',  value: apiStats ? formatTokens(apiStats.totalTokens) : '—' },
    { label: 'Сообщений отправлено',  value: apiStats ? apiStats.messageCount : '—' },
    { label: 'Моделей использовано',  value: apiStats ? apiStats.uniqueModelsUsed : chats.length > 0 ? new Set(chats.flatMap(c => c.messages).filter(m => m.model).map(m => m.model!)).size : '—' },
    { label: 'Любимая модель',        value: apiStats?.favoriteModel ? formatModel(apiStats.favoriteModel) : '—' },
    { label: 'Чатов создано',         value: chats.length || '—' },
    { label: 'Аккаунт создан',        value: createdAt },
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
