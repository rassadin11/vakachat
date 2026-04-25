import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../../components/AuthLayout/AuthLayout";
import FormField from "../../components/FormField/FormField";
import { EmailIcon, CheckIcon } from "../../assets/icons";
import { authApi } from "../../api/auth";
import { ApiError } from "../../api/client";
import styles from "./ForgotPasswordPage.module.scss";

function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function ForgotPasswordPage(): JSX.Element {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [emailTouched, setEmailTouched] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const emailValid = validateEmail(email);
    const emailError = emailTouched && !emailValid ? "Введите корректный email-адрес" : "";
    const emailIsValid = emailTouched && emailValid;

    async function handleSubmit(): Promise<void> {
        setEmailTouched(true);
        if (!emailValid) return;
        setIsLoading(true);
        setErrorMessage("");
        try {
            const data = await authApi.forgotPassword(email);
            setSuccessMessage(data.message);
        } catch (e) {
            setErrorMessage(e instanceof ApiError ? e.message : "Произошла ошибка. Попробуйте ещё раз.");
        }
        setIsLoading(false);
    }

    return (
        <AuthLayout slim>
            <header className={styles.header}>
                <h1 className={styles.title}>
                    <span>Забыли</span><br />
                    <span className={styles.titleAccent}>пароль?</span>
                </h1>
                <p className={styles.subtitle}>// введите email вашего аккаунта</p>
            </header>

            <div className={styles.fields}>
                <FormField
                    label="Email"
                    error={emailError}
                    badge={emailIsValid ? <><CheckIcon /> корректный</> : null}
                >
                    <div className={styles.inputWrap}>
                        <input
                            type="email"
                            className={`${styles.input} ${emailError ? styles.inputError : emailIsValid ? styles.inputValid : ""}`}
                            placeholder="you@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            onBlur={() => setEmailTouched(true)}
                            onKeyDown={e => e.key === "Enter" && handleSubmit()}
                            autoComplete="email"
                            disabled={!!successMessage || isLoading}
                        />
                        <span className={`${styles.inputIcon} ${styles.inputIconStatic}`}>
                            <EmailIcon />
                        </span>
                    </div>
                </FormField>
            </div>

            {!successMessage && (
                <button
                    type="button"
                    className={styles.submitBtn}
                    onClick={handleSubmit}
                    disabled={isLoading}
                >
                    {isLoading ? "Отправка..." : "Отправить ссылку"}
                </button>
            )}

            {successMessage && (
                <div className={`${styles.feedback} ${styles.feedbackSuccess}`}>
                    {successMessage}
                </div>
            )}

            {errorMessage && (
                <div className={`${styles.feedback} ${styles.feedbackError}`}>
                    {errorMessage}
                </div>
            )}

            <button
                type="button"
                className={styles.backLink}
                onClick={() => navigate("/login")}
            >
                ← вернуться ко входу
            </button>
        </AuthLayout>
    );
}
