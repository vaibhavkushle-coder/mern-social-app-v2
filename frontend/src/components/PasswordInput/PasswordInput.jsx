import { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";

function PasswordInput({
  value,
  onChange,
  placeholder = "Enter your password...",
  label = "Password",
}) {
  const [showPassword, setShowPassword] = useState(false);

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
        {/* Lock Icon */}
        <Lock
          size={18}
          className="
            absolute
            left-4
            top-1/2
            -translate-y-1/2
            text-gray-500
            group-focus-within:text-purple-400
            transition-colors duration-200
          "
        />

        {/* Password Input */}
        <input
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
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

        {/* Show / Hide Password */}
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="
            absolute
            right-3
            top-1/2
            -translate-y-1/2

            w-8
            h-8
            rounded-lg

            flex
            items-center
            justify-center

            text-gray-500

            hover:text-purple-400
            hover:bg-purple-500/10

            active:scale-95

            transition-all duration-200
          "
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

export default PasswordInput;
