import { useUser } from "../../hooks/useUser";
import { useState } from "react";
import Button from "../Button/Button";
import { useToast } from "../../hooks/useToast";

function EditProfileModal({ user, onClose }) {
  const { editProfile } = useUser();
  const { showToast } = useToast();

  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [profilePic, setProfilePic] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (saving) return;

    try {
      setSaving(true);

      const formData = new FormData();

      formData.append("name", name.trim());
      formData.append("bio", bio.trim());

      if (profilePic) {
        formData.append("profilePic", profilePic);
      }

      await editProfile(formData);

      onClose();

      showToast("Profile updated successfully 🎉", "success");
    } catch (error) {
      console.log(error);

      showToast("Failed to update profile 🎉", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60
      backdrop-blur-sm flex justify-center
      items-center z-50 modal-overlay
      p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0b0b1f] w-full max-w-sm
        max-h-[88vh] overflow-y-auto border border-purple-900/60
        rounded-2xl shadow-2xl p-5 shadow-purple-900/60
        modal-content"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(139, 92, 246, 0.5) transparent",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <h1
          className="text-2xl font-bold
          text-center mb-4 text-gray-100"
        >
          ✏️ Edit Profile
        </h1>

        {/* Profile Picture */}
        <div className="flex justify-center mb-4">
          {profilePic ? (
            <img
              src={URL.createObjectURL(profilePic)}
              alt="profile preview"
              className="w-20 h-20 rounded-full
              object-cover border-2
              border-gray-200 shadow-lg"
            />
          ) : user?.profilePic ? (
            <img
              src={user.profilePic}
              alt={user?.name || "profile"}
              className="w-20 h-20 rounded-full
              object-cover border-4
              border-gray-200 shadow-lg"
            />
          ) : (
            <div
              className="w-28 h-28 rounded-full
              border-4 border-gray-200
              bg-gray-100 shadow-lg
              flex items-center justify-center
              text-3xl font-bold text-gray-500"
            >
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
          )}
        </div>

        {/* Form */}
        <div className="space-y-3">
          {/* Name */}
          <div>
            <label
              className="block text-sm font-semibold
              text-gray-300 mb-2"
            >
              Name
            </label>

            <input
              type="text"
              value={name}
              placeholder="Write your name..."
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
              className="w-full border
              border-gray-800 bg-[#11112a] text-gray-100
               rounded-lg
              px-3 py-2 outline-none
              focus:ring-2 focus:ring-purple-500
              disabled:bg-gray-900
              disabled:cursor-not-allowed"
            />
          </div>

          {/* Bio */}
          <div>
            <label
              className="block text-sm font-semibold
              text-gray-300 mb-2"
            >
              Bio
            </label>

            <textarea
              rows={3}
              value={bio}
              placeholder="Write your bio..."
              onChange={(e) => setBio(e.target.value)}
              disabled={saving}
              className="w-full border
              border-gray-800 bg-[#11112a] text-gray-100
               rounded-lg
              px-3 py-2 resize-none
              outline-none focus:ring-2
              focus:ring-purple-500
              disabled:bg-gray-900
              disabled:cursor-not-allowed"
            />
          </div>

          {/* Profile Image */}
          <div>
            <input
              id="profilePic"
              type="file"
              accept="image/*"
              className="hidden"
              disabled={saving}
              onChange={(e) => {
                const file = e.target.files?.[0];

                if (file) {
                  setProfilePic(file);
                }
              }}
            />

            <label
              htmlFor="profilePic"
              className={`flex justify-center
              items-center gap-2
              w-full border-2 border-dashed
              border-gray-800 bg-[#11112a] text-gray-300 rounded-lg py-3
              transition-all duration-300
              ${
                saving
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer hover:border-purple-500 hover:bg-purple-950/20"
              }`}
            >
              <span className="text-xl">📤</span>

              <div>
                <p className="font-semibold">
                  {profilePic ? "Change Image" : "Upload Image"}
                </p>

                <p className="text-xs text-gray-500">PNG, JPG, JPEG</p>
              </div>
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-4 mt-8">
          <Button onClick={onClose} variant="secondary" disabled={saving}>
            Cancel
          </Button>

          <Button
            onClick={handleSubmit}
            loading={saving}
            disabled={saving || !name.trim()}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default EditProfileModal;
