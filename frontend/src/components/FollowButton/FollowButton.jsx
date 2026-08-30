import { useUser } from "../../hooks/useUser";
import { followUser, unfollowUser } from "../../services/userService";
import { useToast } from "../../hooks/useToast";
import { useHome } from "../../hooks/useHome";
import { useState } from "react";

function FollowButton({ profileUser, setProfileUser }) {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const { user: currentUser, setUser: setCurrentUser } = useUser();

  const { fetchSuggestedUsers } = useHome();

  const isFollowing = currentUser?.following?.some((user) => {
    return user._id === profileUser._id;
  });

  async function handleFollow() {
    if (loading) return;
    try {
      setLoading(true);

      if (isFollowing) {
        await unfollowUser(profileUser._id);
        await fetchSuggestedUsers();

        setCurrentUser((prev) => ({
          ...prev,
          following: prev.following.filter(
            (user) => user._id !== profileUser._id,
          ),
        }));

        setProfileUser((prev) => ({
          ...prev,
          followers: prev.followers.filter(
            (user) => user._id !== currentUser._id,
          ),
        }));

        showToast("User Unfollowed successfully", "success");
      } else {
        await followUser(profileUser._id);
        await fetchSuggestedUsers();

        setCurrentUser((prev) => ({
          ...prev,
          following: [...prev.following, profileUser],
        }));

        setProfileUser((prev) => ({
          ...prev,
          followers: [...prev.followers, currentUser],
        }));
        showToast("User followed successfully", "success");
      }
    } catch (error) {
      console.log(error);

      showToast(
        error.response?.data?.message || "Something went wrong",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <button
      type="button"
      onClick={handleFollow}
      disabled={loading}
      className={`
     py-2.5
    rounded-xl
    mr-2

    w-full

    text-sm
    font-semibold

    transition-all
    duration-200
    active:scale-95
     
  disabled:opacity-60
  disabled:cursor-not-allowed
  disabled:scale-100
  disabled:shadow-none

    ${
      isFollowing
        ? `
          bg-[#08091c]
          text-purple-200
          border border-purple-500/50
          shadow-[0_0_15px_rgba(168,85,247,0.25)]
          hover:bg-purple-500/10
          hover:border-purple-400
          hover:text-white
          hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]
        `
        : `
          bg-gradient-to-r
          from-purple-600
          to-violet-500
          text-white
          border border-purple-400/60
          shadow-[0_0_18px_rgba(168,85,247,0.45)]
          hover:from-purple-500
          hover:to-violet-400
          hover:shadow-[0_0_25px_rgba(168,85,247,0.65)]
        `
    }
  `}
    >
      {loading ? "Loading..." : isFollowing ? "Unfollow" : "Follow"}
    </button>
  );
}
export default FollowButton;
