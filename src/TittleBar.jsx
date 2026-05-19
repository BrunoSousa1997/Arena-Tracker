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
        background: "rgba(10,12,18,0.95)",
        borderBottom: "1px solid rgba(200,170,110,0.2)",
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

    btn: {
        width: 22,
        height: 16,
        border: "none",
        background: "rgba(255,255,255,0.06)",
        color: "#c8aa6e",
        borderRadius: 6,
        cursor: "pointer",
    },

    close: {
        width: 22,
        height: 16,
        border: "none",
        background: "#c8aa6e",
        color: "#0b0f1a",
        borderRadius: 6,
        cursor: "pointer",
    },
};