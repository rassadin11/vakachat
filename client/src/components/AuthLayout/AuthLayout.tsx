import React from "react";
import styles from "./AuthLayout.module.scss";

interface AuthLayoutProps {
    children: React.ReactNode;
    slim?: boolean;
}

export default function AuthLayout({ children, slim }: AuthLayoutProps): JSX.Element {
    return (
        <div className={styles.root}>
            <div className={styles.noiseOverlay} />
            <div className={`${styles.glowOrb} ${styles.glowOrb1}`} />
            <div className={`${styles.glowOrb} ${styles.glowOrb2}`} />

            <div className={`${styles.card} ${slim ? styles.cardSlim : ""}`}>
                <div className={styles.cornerTl} />
                <div className={styles.cornerBr} />
                <div className={styles.accentLine} />

                <div className={styles.cardInner}>
                    {children}
                </div>
            </div>
        </div>
    );
}
