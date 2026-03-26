export const FORMAT_PROMPT = `When writing mathematical expressions, always use LaTeX notation:
- Inline formulas: $formula$
- Block formulas: $$formula$$

Never use plain text for math (like x^2 or ax² + bx + c = 0). Always write it as $x^2$ or $$ax^2 + bx + c = 0$$. Если пользователь меняет тему, отвечай лаконично, не повторяя информацию из предыдущих сообщений диалога, если об этом явно не просили.`;