import { Component, type ErrorInfo, type ReactNode } from "react";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Erro de renderização capturado no frontend", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main
          style={{
            minHeight: "100vh",
            margin: 0,
            padding: 16,
            display: "grid",
            placeItems: "center",
            background: "linear-gradient(180deg, #041423 0%, #0a2740 100%)",
            color: "#f2f6fa",
            fontFamily: "Inter, system-ui, sans-serif"
          }}
        >
          <section
            style={{
              width: "100%",
              maxWidth: 460,
              borderRadius: 16,
              border: "1px solid #2f5c83",
              background: "#0f3555",
              padding: 16,
              display: "grid",
              gap: 8
            }}
          >
            <h1 style={{ margin: 0, fontSize: 20 }}>Ocorreu um erro inesperado</h1>
            <p style={{ margin: 0, opacity: 0.9 }}>
              Não foi possível renderizar a partida agora. Atualize a página para tentar novamente.
            </p>
            <button
              type="button"
              onClick={() => {
                window.location.reload();
              }}
              style={{
                marginTop: 4,
                borderRadius: 10,
                border: "1px solid #5aa3d6",
                background: "#14517c",
                color: "#fff",
                padding: "10px 12px",
                fontSize: 14,
                cursor: "pointer"
              }}
            >
              Recarregar página
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
