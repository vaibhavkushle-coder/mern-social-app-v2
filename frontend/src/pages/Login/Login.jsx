import { useState } from "react";
import { login } from "../../services/authService";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../../hooks/useUser";
import { Mail, LogIn } from "lucide-react";

import AuthInput from "../../components/AuthInput/AuthInput";
import Button from "../../components/Button/Button";
import PasswordInput from "../../components/PasswordInput/PasswordInput";
import PageHeader from "../../components/PageHeader/PageHeader";

import { useToast } from "../../hooks/useToast";
import { getUserProfile } from "../../services/userService";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { setUser } = useUser();
  const { showToast } = useToast();

  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    // Validation
    if (!email && !password) {
      showToast("Please enter your email and password", "error");
      return;
    }

    if (!email) {
      showToast("Please enter your email", "error");
      return;
    }

    if (!password) {
      showToast("Please enter your password", "error");
      return;
    }

    let tokenStored = false;

    try {
      const response = await login({
        email,
        password,
      });

      localStorage.setItem("token", response.data.token);
      tokenStored = true;

      const profile = await getUserProfile();

      setUser(profile.data.user);

      navigate("/profile");

      showToast("Login successful 🎉", "success");
    } catch (error) {
      if (tokenStored) {
        localStorage.removeItem("token");
      }

      console.log(error);

      showToast(
        error?.response?.data?.message ||
          "Login failed. Please check your details.",
        "error",
      );
    }
  }

  return (
    <div
      className="
        min-h-screen
        bg-[#05051a]
        flex items-center
        justify-center
        px-4 py-8
        relative
        overflow-hidden
      "
    >
      {/* Background Glow */}
      <div
        className="
          absolute
          w-[420px]
          h-[420px]
          rounded-full
          bg-purple-600/40
          blur-[120px]
          -top-40
          -left-40
          pointer-events-none
        "
      />

      <div
        className="
          absolute
          w-[360px]
          h-[360px]
          rounded-full
          bg-blue-600/40
          blur-[120px]
          -bottom-40
          -right-40
          pointer-events-none
        "
      />

      {/* Login Card */}
      <div
        className="
          relative
          w-full
          max-w-md
          bg-[#08081c]
          border
          border-purple-900
          rounded-3xl
          p-6
          sm:p-8
          shadow-[0_25px_80px_rgba(0,0,0,0.55)]
          modal-content
        "
      >
        <form onSubmit={handleSubmit}>
          {/* Page Header */}
          <PageHeader
            icon={<LogIn size={27} strokeWidth={2} />}
            title="Welcome Back"
            subtitle="Login to continue your journey."
          />

          {/* Email */}
          <AuthInput
            label="Email"
            type="email"
            placeholder="Enter your email..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            icon={<Mail size={18} />}
          />

          {/* Password */}
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {/* Login Button */}
          <div className="mt-2">
            <Button type="submit">Login</Button>
          </div>

          {/* Register */}
          <p
            className="
              text-center
              mt-6
              text-sm
              text-gray-500
            "
          >
            Don't have an account?
            <Link
              to="/register"
              className="
                ml-2
                text-purple-400
                font-semibold
                hover:text-purple-300
                transition-colors
              "
            >
              Register
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;
