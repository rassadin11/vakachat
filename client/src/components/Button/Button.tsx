import { useNavigate } from "react-router";
import { useChatStore } from "../../store/chatStore";
import { FORMAT_PROMPT } from "../../utils/system-settings";

interface IButton {
    title: string,
}

export const Button = ({ title }: IButton) => {
    const navigate = useNavigate();
    const createChat = useChatStore((s) => s.createChat);

    const handleCreateChat = async () => {
        const chat = await createChat('Новый чат', FORMAT_PROMPT);
        navigate(`/chats/${chat.id}`);
    };

    return (
        <button className="empty-page__btn" onClick={handleCreateChat}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {title}
        </button>
    )
}