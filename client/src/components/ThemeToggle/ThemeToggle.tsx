import { useEffect, useState } from 'react';
import "./ThemeToggle.scss";
import { SunIcon, MoonIcon } from '../../assets/icons';

export default function ThemeToggle(): JSX.Element {
    const [isDark, setIsDark] = useState(
        () => (localStorage.getItem('theme') || 'light') === 'dark'
    );

    useEffect(() => {
        const theme = isDark ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [isDark]);

    function toggle() {
        document.documentElement.classList.add('theme-transitioning');
        setIsDark(v => !v);
        setTimeout(() => {
            document.documentElement.classList.remove('theme-transitioning');
        }, 300);
    }

    return (
        <button
            className="theme-toggle"
            onClick={toggle}
            title={isDark ? 'Светлая тема' : 'Тёмная тема'}
        >
            {isDark ? (
                <SunIcon width="16" height="16" />
            ) : (
                <MoonIcon width="16" height="16" />
            )}
        </button>
    );
}