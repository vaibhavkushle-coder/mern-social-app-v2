function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  loading = false,
  disabled = false,
}) {
  const baseClass =
    "w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 cursor-pointer flex justify-center items-center gap-2";

  const variants = {
    primary:
      "bg-purple-600 text-white border border-purple-500 shadow-md shadow-purple-950/30 hover:bg-purple-500 hover:shadow-lg hover:shadow-purple-900/30",

    secondary:
      "bg-[#11112a] text-gray-300 border border-gray-800 shadow-md hover:bg-[#171735] hover:border-purple-800 hover:text-white",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className={`${baseClass} ${variants[variant]} ${
        disabled || loading ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      {loading ? "Loading..." : children}
    </button>
  );
}

export default Button;
