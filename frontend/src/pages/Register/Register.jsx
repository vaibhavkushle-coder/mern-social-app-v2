import { useEffect, useState } from "react";
import { register } from "../../services/authService";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, UserPlus } from "lucide-react";
import { useUser } from "../../hooks/useUser";

import AuthInput from "../../components/AuthInput/AuthInput";
import Button from "../../components/Button/Button";
import PasswordInput from "../../components/PasswordInput/PasswordInput";
import PageHeader from "../../components/PageHeader/PageHeader";

import { useToast } from "../../hooks/useToast";
import getApiErrorMessage from "../../utils/getApiErrorMessage";
import useAuthRateLimit from "../../hooks/useAuthRateLimit";
import logger from "../../utils/logger";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rateLimitError, setRateLimitError] = useState("");
  const {
    status: attemptStatus,
    refresh: refreshAttempts,
    syncFromError,
  } = useAuthRateLimit("register");

  const navigate = useNavigate();

  const { setUser } = useUser();
  const { showToast } = useToast();
  const limitActive =
    attemptStatus?.remaining === 0 &&
    (!attemptStatus.resetAt ||
      new Date(attemptStatus.resetAt).getTime() > Date.now());

  useEffect(() => {
    if (attemptStatus?.remaining > 0) setRateLimitError("");
  }, [attemptStatus?.remaining]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setRateLimitError("");

    // Validation
    if (!name && !email && !password) {
      showToast("Please fill all fields", "error");
      return;
    }

    if (!name) {
      showToast("Please enter your name", "error");
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

    try {
      setSubmitting(true);
      const response = await register({
        name,
        email,
        password,
      });

      localStorage.setItem("token", response.data.token);

      setUser(response.data.user);

      navigate("/profile");

      showToast("Registration successful 🎉", "success");
    } catch (error) {
      logger.error("auth.register.failed", error);

      const errorMessage = getApiErrorMessage(
        error,
        "Registration failed. Please try again.",
      );
      if (error?.response?.status === 429) {
        syncFromError(error);
        setRateLimitError(errorMessage);
      } else {
        showToast(errorMessage, "error");
      }
      await refreshAttempts();
    } finally {
      setSubmitting(false);
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

      {/* Register Card */}
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
        "
      >
        <form onSubmit={handleSubmit}>
          <p className="text-center text-xs text-gray-500 mb-5">
            ✨ Create a new email just for Yuva.
          </p>
          {/* Page Header */}
          <PageHeader
            icon={<UserPlus size={27} strokeWidth={2} />}
            title="Create Account"
            subtitle="Join us and start sharing your moments."
          />

          {/* Name */}
          <AuthInput
            label="Name"
            type="text"
            placeholder="Enter your name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            icon={<User size={18} />}
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

          {/* Register Button */}
          <div className="mt-2">
            <Button
              type="submit"
              loading={submitting}
              loadingText="Creating account..."
              disabled={submitting || limitActive}
            >
              {!submitting && <UserPlus size={18} />}
              <span>{submitting ? "Creating account..." : "Register"}</span>
            </Button>
            {rateLimitError && (
              <p
                className="mt-2 text-center text-xs leading-5 text-amber-300"
                role="alert"
              >
                {rateLimitError}
              </p>
            )}
            {limitActive && !rateLimitError && (
              <p
                className="mt-2 text-center text-xs leading-5 text-amber-300"
                role="alert"
              >
                Attempt limit reached.
                {attemptStatus.resetAt &&
                  ` Try again after ${new Date(attemptStatus.resetAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`}
              </p>
            )}
            {attemptStatus && (
              <p className="mt-2 text-center text-xs text-purple-200/60">
                {attemptStatus.remaining} attempts remaining
              </p>
            )}
          </div>

          {/* Login Link */}
          <p
            className="
              text-center
              mt-6
              text-sm
              text-gray-500
            "
          >
            Already have an account?
            <Link
              to="/login"
              className="
                ml-2
                text-purple-400
                font-semibold
                hover:text-purple-300
                transition-colors
              "
            >
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Register;
