import { useEffect } from 'react';
import { useChatStore } from './store/chatStore';
import Sidebar from './components/Sidebar/Sidebar';
import ChatArea from './components/ChatArea/ChatArea';

function App() {
  const fetchModels = useChatStore((s) => s.fetchModels);
  const activeChatId = useChatStore((s) => s.activeChatId);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return (
    <div className="app">
      <Sidebar />
      <main className="app__main">
        {activeChatId ? (
          <ChatArea />
        ) : (
          <div className="app__empty">
            <div className="app__empty-content">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <p>Создай новый чат, чтобы начать</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
