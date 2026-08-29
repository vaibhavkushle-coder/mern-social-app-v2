import { createContext, useState } from "react";

export const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [message, setMessage] = useState("");
  const [type, setType] = useState("success");
  const [show, setShow] = useState(false);

  function showToast(message, type = "success") {
    setMessage(message);
    setType(type);
    setShow(true);
    setTimeout(() => {
      setShow(false);
    }, 3000);
  }
  return (
    <ToastContext.Provider value={{ message, type, show, showToast }}>
      {children}
    </ToastContext.Provider>
  );
}
