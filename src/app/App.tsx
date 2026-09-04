import { Home } from "../pages/home/Home";
import { NotificationPopup } from "../components/notification/NotificationPopup";

export function App() {
  return (
    <div className="app">
      <main className="app-content">
        <Home />
        <NotificationPopup />
      </main>
    </div>
  );
}
