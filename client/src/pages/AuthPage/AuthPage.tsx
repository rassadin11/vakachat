import { useLocation, useNavigate } from "react-router-dom";
import styles from "./AuthPage.module.scss";
import { AuthMode } from "../../components/AuthForm/AuthForm.types";
import AuthForm from "../../components/AuthForm/AuthForm";

export default function AuthPage(): JSX.Element {
    const { pathname } = useLocation();
    const navigate = useNavigate();

    const mode: AuthMode = pathname === "/register" ? "register" : "login";

    function handleModeChange(nextMode: AuthMode): void {
        navigate(nextMode === "register" ? "/register" : "/login");
    }

    return (
        <div className={styles.root}>
            <div className={styles.noiseOverlay} />
            <div className={`${styles.glowOrb} ${styles.glowOrb1}`} />
            <div className={`${styles.glowOrb} ${styles.glowOrb2}`} />

            <div className={styles.card}>
                <div className={styles.cornerTl} />
                <div className={styles.cornerBr} />
                <div className={styles.accentLine} />

                <div className={styles.cardInner}>
                    <AuthForm mode={mode} onModeChange={handleModeChange} />
                </div>
            </div>
        </div>
    );
}