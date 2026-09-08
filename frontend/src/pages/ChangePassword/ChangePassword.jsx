import { useState } from "react";
import { ArrowLeft, KeyRound } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar";
import PasswordInput from "../../components/PasswordInput/PasswordInput";
import Button from "../../components/Button/Button";
import PageHeader from "../../components/PageHeader/PageHeader";
import { changePassword } from "../../services/authService";
import { useToast } from "../../hooks/useToast";
import { useSocket } from "../../hooks/useSocket";
import getApiErrorMessage from "../../utils/getApiErrorMessage";
import logger from "../../utils/logger";

const MIN_PASSWORD_BYTES = 8;
const MAX_PASSWORD_BYTES = 72;

function getPasswordByteLength(value) {
  return new TextEncoder().encode(value).length;
}

function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  function handleBack() {
    if (location.key === "default") {
      navigate("/profile", { replace: true });
      return;
    }

    navigate(-1);
  }

  function clearFieldError(field) {
    setErrors((current) => {
      if (!current[field] && !current.form) return current;
      const next = { ...current };
      delete next[field];
      delete next.form;
      return next;
    });
  }

  function validate() {
    const nextErrors = {};

    if (!currentPassword) {
      nextErrors.currentPassword = "Current password is required";
    }

    if (!newPassword) {
      nextErrors.newPassword = "New password is required";
    } else {
      const passwordBytes = getPasswordByteLength(newPassword);

      if (
        passwordBytes < MIN_PASSWORD_BYTES ||
        passwordBytes > MAX_PASSWORD_BYTES
      ) {
        nextErrors.newPassword = "Password must be 8 to 72 bytes long";
      } else if (newPassword === currentPassword) {
        nextErrors.newPassword =
          "New password must be different from current password";
      }
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your new password";
    } else if (newPassword !== confirmPassword) {
      nextErrors.confirmPassword = "New passwords do not match";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting || !validate()) return;

    try {
      setSubmitting(true);
      setErrors({});

      const response = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      const replacementToken = response.data.token;

      if (typeof replacementToken !== "string" || !replacementToken) {
        throw new Error("Password change response did not include a new token");
      }

      localStorage.setItem("token", replacementToken);
      socket.disconnect();
      socket.auth = { token: replacementToken };
      socket.connect();

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast(response.data.message, "success");
    } catch (error) {
      logger.error("auth.change_password.failed", error);
      setErrors({
        form: getApiErrorMessage(error, "Unable to change password"),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#05051a] px-4 py-8 pb-24 text-white">
      <Navbar />

      <main className="mx-auto w-full max-w-md rounded-3xl border border-purple-900 bg-[#08081c] p-6 shadow-[0_25px_80px_rgba(0,0,0,0.55)] sm:p-8">
        <button
          type="button"
          onClick={handleBack}
          className="mb-5 flex h-9 items-center gap-2 rounded-xl px-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-purple-500/10 hover:text-white active:bg-purple-500/15"
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>

        <form onSubmit={handleSubmit} noValidate>
          <PageHeader
            icon={<KeyRound size={27} strokeWidth={2} />}
            title="Change Password"
            subtitle="Choose a secure password you do not use elsewhere."
          />

          <PasswordInput
            label="Current Password"
            placeholder="Enter current password..."
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => {
              setCurrentPassword(event.target.value);
              clearFieldError("currentPassword");
            }}
          />
          {errors.currentPassword && (
            <p className="-mt-3 mb-4 text-xs text-red-400" role="alert">
              {errors.currentPassword}
            </p>
          )}

          <PasswordInput
            label="New Password"
            placeholder="Enter new password..."
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => {
              setNewPassword(event.target.value);
              clearFieldError("newPassword");
            }}
          />
          {errors.newPassword && (
            <p className="-mt-3 mb-4 text-xs text-red-400" role="alert">
              {errors.newPassword}
            </p>
          )}

          <PasswordInput
            label="Confirm New Password"
            placeholder="Confirm new password..."
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              clearFieldError("confirmPassword");
            }}
          />
          {errors.confirmPassword && (
            <p className="-mt-3 mb-4 text-xs text-red-400" role="alert">
              {errors.confirmPassword}
            </p>
          )}

          <p className="mb-5 text-xs leading-5 text-gray-500">
            Use 8 to 72 bytes. Your account will stay signed in after the change.
          </p>

          {errors.form && (
            <p
              className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-300"
              role="alert"
            >
              {errors.form}
            </p>
          )}

          <Button
            type="submit"
            loading={submitting}
            loadingText="Changing Password..."
            disabled={submitting}
          >
            <KeyRound size={17} />
            <span>Change Password</span>
          </Button>
        </form>
      </main>
    </div>
  );
}

export default ChangePassword;
