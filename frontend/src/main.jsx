import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { UserProvider } from "./context/UserContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";
import "./index.css";
import App from "./App.jsx";
import "./socket";
import { SocketProvider } from "./context/SocketContext.jsx";
import { ConversationProvider } from "./context/ConversationContext.jsx";
import { HomeProvider } from "./context/HomeContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <UserProvider>
        <ToastProvider>
          <SocketProvider>
            <NotificationProvider>
              <HomeProvider>
                <ConversationProvider>
                  <App />
                </ConversationProvider>
              </HomeProvider>
            </NotificationProvider>
          </SocketProvider>
        </ToastProvider>
      </UserProvider>
    </BrowserRouter>
  </StrictMode>,
);
