import { useNavigate } from "react-router";
import { useChatStore } from "../../store/chatStore";
import { FORMAT_PROMPT } from "../../utils/system-settings";
import { PlusIcon } from "../../assets/icons";

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
            <PlusIcon width="13" height="13" />
            {title}
        </button>
    )
}