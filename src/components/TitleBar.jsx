import { useEffect, useState } from "react";
import { Minus, Square, Copy, X } from "lucide-react";

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
                    <Minus size={11} strokeWidth={2.5} />
                </button>

                <button onClick={() => window.electron.maximize()} style={styles.btn}>
                    {isMaximized ? <Copy size={10} strokeWidth={2.25} /> : <Square size={10} strokeWidth={2.25} />}
                </button>

                <button onClick={() => window.electron.close()} style={styles.close}>
                    <X size={11} strokeWidth={2.5} />
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

    // Centragem via flex — um botão tão pequeno (22x16) precisa disto para o
    // ícone (lucide-react) não ficar desalinhado lá dentro.
    btn: {
        width: 22,
        height: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        background: "rgba(var(--soft-rgb),0.06)",
        color: "var(--accent-text)",
        borderRadius: "var(--radius-sm)",
        cursor: "pointer",
        padding: 0,
    },

    close: {
        width: 22,
        height: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        background: "var(--accent-solid)",
        color: "var(--accent-solid-text)",
        borderRadius: "var(--radius-sm)",
        cursor: "pointer",
        padding: 0,
    },
};