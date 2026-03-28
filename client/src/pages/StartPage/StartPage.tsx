import { Button } from '../../components/Button/Button';
import './StartPage.scss';
import { ChatBubbleIcon } from '../../assets/icons';

export default function StartPage(): JSX.Element {

    return (
        <div className="empty-page">
            <p className='sale'>При регистрации введите промокод <span>CHAT</span> и получите <span>50 рублей</span>!</p>
            <div className="empty-page__content">
                <div className="empty-page__icon-wrap">
                    <ChatBubbleIcon className="empty-page__icon" width="40" height="40" strokeWidth="1.2" />
                    <div className="empty-page__glow" />
                </div>

                <h1 className="empty-page__title">Нет активного чата</h1>
                <p className="empty-page__subtitle">
                    Создайте новый чат, чтобы начать общение с нейросетью
                </p>

                <Button title="Новый чат" />
            </div>
        </div>
    );
}