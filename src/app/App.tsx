import { HashRouter } from "react-router-dom";
import { AppRouter } from "./router";
import { ToastProvider } from "@/components/common/Toast";

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </HashRouter>
  );
}
