import { useRef, useState } from 'react'
import "./Dropdown.scss"
import { useChatStore } from '../../store/chatStore';
import { ChatBubbleIcon, ChevronDownIcon } from '../../assets/icons';
import { useClickOutside } from '../../hooks/useClickOutside';

function Dropdown() {
    const { contextLimit, setContextLimit } = useChatStore(s => s)
    const [isContextOpen, setIsContextOpen] = useState(false);
    const contextRef = useRef<HTMLDivElement>(null);

    const CONTEXT_OPTIONS = [
        { value: 5, label: '5 сообщений' },
        { value: 10, label: '10 сообщений' },
        { value: 25, label: '25 сообщений' },
        { value: 0, label: 'Не ограничено' },
    ];

    useClickOutside(contextRef, () => setIsContextOpen(false));

    return (
        <div className="dropdown__context" ref={contextRef}>
            <button
                type="button"
                className="dropdown__context-trigger"
                onClick={() => setIsContextOpen((p) => !p)}
                title="Глубина контекста"
            >
                <ChatBubbleIcon width="12" height="12" />
                <span>{contextLimit ? `${contextLimit} сообщ.` : '∞'}</span>
                <ChevronDownIcon
                    width="10" height="10"
                    style={{ transform: isContextOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
                />
            </button>

            {isContextOpen && (
                <div className="dropdown__context-dropdown">
                    {CONTEXT_OPTIONS.map((opt) => (
                        <div
                            key={opt.value ?? 'unlimited'}
                            className={`dropdown__context-option ${contextLimit === opt.value ? 'dropdown__context-option--active' : ''}`}
                            onClick={() => { setContextLimit(opt.value); setIsContextOpen(false); }}
                        >
                            {opt.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default Dropdown