import { useEffect } from "react";
import ChatArea from "../../components/ChatArea/ChatArea";
import { useChatStore } from "../../store/chatStore";

export const MainPage = () => {
    const fetchModels = useChatStore((s) => s.fetchModels);

    useEffect(() => {
        fetchModels();
    }, [fetchModels]);

    return (
        <main className="app__main">
            <ChatArea />
        </main>
    );
}