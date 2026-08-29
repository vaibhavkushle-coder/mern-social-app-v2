import { useToast } from "../../hooks/useToast";

function Toast() {
  const { message, type, show } = useToast();

  const color = {
    success: "bg-green-500 text-white border-green-600",
    error: "bg-red-500 text-white border-red-600",
    warning: "bg-yellow-500 text-black border-yellow-600",
  };

  if (!show) {
    return null;
  }

  return (
    <div
      className={`fixed top-5 right-5 px-5 py-3 rounded-xl
         shadow-2xl border-2 z-[9999] ${color[type]}`}
    >
      <p className="font semibold">{message}</p>
    </div>
  );
}

export default Toast;
