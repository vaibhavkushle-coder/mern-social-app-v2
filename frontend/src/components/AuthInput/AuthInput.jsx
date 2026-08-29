function AuthInput({
  label,
  type,
  value,
  onChange,
  placeholder,
  icon,
  rightIcon,
  autoComplete,
}) {
  return (
    <div className="mb-5">
      {/* Label */}
      <label
        className="
          block
          mb-2
          text-sm
          font-medium
          text-gray-300
        "
      >
        {label}
      </label>

      {/* Input Wrapper */}
      <div className="relative group">
        {/* Left Icon */}
        <div
          className="
            absolute
            left-4
            top-1/2
            -translate-y-1/2
            text-gray-500
            group-focus-within:text-purple-400
            transition-colors duration-200
          "
        >
          {icon}
        </div>

        {/* Input */}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className="
            w-full
            h-12
            pl-11
            pr-12
            rounded-xl

            bg-[#11112b]

            border
            border-purple-900/50

            text-sm
            text-white

            placeholder:text-gray-500

            outline-none

            shadow-sm

            transition-all duration-200

            focus:border-purple-500/70
            focus:bg-[#141433]
            focus:ring-2
            focus:ring-purple-500/10
            focus:shadow-[0_0_18px_rgba(139,92,246,0.10)]
          "
        />

        {/* Right Icon */}
        {rightIcon && (
          <div
            className="
              absolute
              right-4
              top-1/2
              -translate-y-1/2
              text-gray-500
              hover:text-purple-400
              transition-colors
            "
          >
            {rightIcon}
          </div>
        )}
      </div>
    </div>
  );
}

export default AuthInput;
