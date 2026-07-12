import { useEffect, useState } from "react";

export default function TitleBar() {
    if (!window.electron) return null;
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        async function check() {
            const value = await window.electron.isMaximized();
            setIsMaximized(value);
        }

        check();

        const interval = setInterval(check, 500); // simples sync com estado window
        return () => clearInterval(interval);
    }, []);
    return (
        <div style={styles.titleBar}>
            <div style={styles.drag} />

            <div style={styles.controls}>
                <button onClick={() => window.electron.minimize()} style={styles.btn}>
                    ─
                </button>

                <button onClick={() => window.electron.maximize()} style={styles.btn}>
                    {isMaximized ? "❐" : "□"}
                </button>

                <button onClick={() => window.electron.close()} style={styles.close}>
                    ✕
                </button>
            </div>
        </div>
    );
}

const styles = {
    titleBar: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(var(--panel-deep-rgb),0.95)",
        borderBottom: "1px solid rgba(var(--accent-rgb),0.2)",
        zIndex: 99999,
        WebkitAppRegion: "drag",
    },

    drag: {
        flex: 1,
    },

    controls: {
        display: "flex",
        gap: 6,
        paddingRight: 10,
        WebkitAppRegion: "no-drag",
    },

    // fontSize/lineHeight explícitos (não herdados) e centragem via flex —
    // sem isto, um botão tão pequeno (22x16) fica à mercê do tamanho de letra
    // global da app (18px/145%), que não cabe nem de perto nesta altura e
    // desformata o glifo lá dentro.
    btn: {
        width: 22,
        height: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        background: "rgba(var(--soft-rgb),0.06)",
        color: "var(--accent-text)",
        borderRadius: 6,
        cursor: "pointer",
        fontSize: 10,
        lineHeight: 1,
        padding: 0,
    },

    close: {
        width: 22,
        height: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        background: "#4f46e5",
        color: "#ffffff",
        borderRadius: 6,
        cursor: "pointer",
        fontSize: 10,
        lineHeight: 1,
        padding: 0,
    },
};