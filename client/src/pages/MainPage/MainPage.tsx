import { useEffect } from "react";
import ChatArea from "../../components/ChatArea/ChatArea";
import { useChatStore } from "../../store/chatStore";
import { useNavigate, useParams } from "react-router";

export const MainPage = () => {
    const { chatId } = useParams()
    const setActiveChat = useChatStore(s => s.setActiveChat)
    const { isChatLoading } = useChatStore(s => s)
    const navigate = useNavigate()

    useEffect(() => {
        if (chatId) {
            setActiveChat(chatId).then(res => {
                if (!res) navigate('/chats/not-found')
            })
        }
    }, [chatId])

    return (
        <main className={isChatLoading ? 'app__main app__main--loading' : 'app__main'}>
            <ChatArea />
        </main>
    );
}