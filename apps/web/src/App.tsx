import { AppErrorBoundary } from "./presentation/components/AppErrorBoundary";
import { MatchPage } from "./presentation/pages/MatchPage";

export default function App() {
  return (
    <AppErrorBoundary>
      <MatchPage />
    </AppErrorBoundary>
  );
}
