import { prisma } from '../prisma.js';

export const GLOBAL_SYSTEM_PROMPT = `When writing mathematical expressions, always use LaTeX notation:
- Inline formulas: $formula$
- Block formulas: $$formula$$
Never use plain text for math (like x^2 or ax² + bx + c = 0). Always write it as $x^2$ or $$ax^2 + bx + c = 0$$.
Если пользователь меняет тему, отвечай лаконично, не повторяя информацию из предыдущих сообщений диалога, если об этом явно не просили.
Если вопрос подразумевает построение графика или визуализации данных, предоставь решение в виде Python-кода используя библиотеки matplotlib и numpy. Оберни код в блок \`\`\`python. Не вызывай plt.show() — просто создай и настрой фигуру.`;

async function fetchUsdToRub() {
    try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await res.json();
        return data.rates.RUB * 1.21;
    } catch {
        return null;
    }
}

let USD_TO_RUB = 105; // дефолт до первого запроса

export async function initCurrencyRate() {
    const rate = await fetchUsdToRub();
    if (rate) USD_TO_RUB = rate;
    console.log(`[currency] USD → RUB: ${USD_TO_RUB}`);

    // Обновляем каждый час
    setInterval(async () => {
        const updated = await fetchUsdToRub();
        if (updated) {
            USD_TO_RUB = updated;
            console.log(`[currency] обновлён: ${USD_TO_RUB}`);
        }
    }, 1000 * 60 * 60);
}

export function getRate() {
    return USD_TO_RUB;
}

export async function topUpBalance(userId, amountRub) {
    const rate = getRate(); // USD_TO_RUB без наценки, например 90
    const rateWithMarkup = rate * 1.21; // 117 руб за доллар для пользователя

    const amountUSD = amountRub / rateWithMarkup;

    await prisma.user.update({
        where: { id: userId },
        data: {
            balance: { increment: amountRub },
            balanceUSD: { increment: amountUSD },
        },
    });
}