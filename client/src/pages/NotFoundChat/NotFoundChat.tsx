import { Button } from '../../components/Button/Button';
import styles from './NotFoundChat.module.scss';
import { ChatDotsIcon } from '../../assets/icons';

function NotFoundChat() {
    return (
        <div className={styles.wrap}>
            <div className={styles.code}>404</div>

            <div className={styles.iconWrap}>
                <ChatDotsIcon />
            </div>

            <h1 className={styles.title}>Чат не найден</h1>
            <p className={styles.subtitle}>Этот чат был удалён или вам закрыт доступ к нему</p>

            <Button title="Создать новый чат" />
        </div>
    );
}

export default NotFoundChat;