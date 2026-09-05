import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserListModal from "../UserListModal/UserListModal";
import {
  FiLogOut,
  FiMoreVertical,
  FiBookmark,
  FiCamera,
  FiArrowLeft,
} from "react-icons/fi";
import { useSocket } from "../../hooks/useSocket";
import { removeFollower } from "../../services/userService";
import { useToast } from "../../hooks/useToast";
import { logout } from "../../services/authService";
import logger from "../../utils/logger";

function ProfileContent({ user, posts, children, isOwnProfile, setUser }) {
  const [isFollowersOpen, setIsFollowersOpen] = useState(false);
  const [isFollowingOpen, setIsFollowingOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [removingFollowerId, setRemovingFollowerId] = useState(null);

  const { socket } = useSocket();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const followers = user?.followers || [];
  const following = user?.following || [];
  const userPosts = posts || [];

  useEffect(() => {
    if (!socket || !user?._id) return;

    const profileUserId = user._id.toString();

    function joinProfileRoom() {
      socket.emit("join-profile", profileUserId);
    }

    if (socket.connected) {
      joinProfileRoom();
    }

    socket.on("connect", joinProfileRoom);

    return () => {
      socket.emit("leave-profile", profileUserId);
      socket.off("connect", joinProfileRoom);
    };
  }, [socket, user?._id]);

  useEffect(() => {
    if (!socket || !setUser) return;

    function handleUserFollowed(data) {
      setUser((prev) => {
        if (!prev) return prev;

        if (prev._id.toString() !== data.userId.toString()) {
          return prev;
        }

        const isAlreadyFollower = (prev.followers || []).some((follower) => {
          const followerId = follower?._id || follower;

          return followerId.toString() === data.follower._id.toString();
        });

        if (isAlreadyFollower) {
          return prev;
        }

        return {
          ...prev,
          followers: [...(prev.followers || []), data.follower],
        };
      });
    }

    function handleUserUnfollowed(data) {
      setUser((prev) => {
        if (!prev) return prev;

        if (prev._id.toString() !== data.userId.toString()) {
          return prev;
        }

        return {
          ...prev,
          followers: prev.followers.filter(
            (follower) =>
              follower._id.toString() !== data.followerId.toString(),
          ),
        };
      });
    }

    socket.on("user-followed", handleUserFollowed);
    socket.on("user-unfollowed", handleUserUnfollowed);

    return () => {
      socket.off("user-followed", handleUserFollowed);
      socket.off("user-unfollowed", handleUserUnfollowed);
    };
  }, [socket, setUser]);

  useEffect(() => {
    if (isFollowersOpen || isFollowingOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isFollowersOpen, isFollowingOpen]);

  async function handleLogout() {
    try {
      await logout();
    } catch {
      logger.warn("auth.logout.server_failed");
    } finally {
      socket.disconnect();
      socket.auth = {};
      localStorage.removeItem("token");
      setUser(null);
      navigate("/login", { replace: true });
    }
  }

  function handleMenuToggle(e) {
    e.stopPropagation();
    setIsMenuOpen((prev) => !prev);
  }

  async function handleRemovingFollower(userId) {
    try {
      setRemovingFollowerId(userId);

      await removeFollower(userId);
    } catch (error) {
      logger.error("user.remove_follower.failed", error);

      showToast(
        error.response?.data?.message || "Failed to remove follower",
        "error",
      );
    } finally {
      setRemovingFollowerId(null);
    }
  }

  function handlePostsClick() {
    const postsSection = document.getElementById("profile-posts");

    if (postsSection) {
      postsSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }

  return (
    <div
      className="
        w-full max-w-2xl mx-auto
        bg-[#030511]
        text-white
        rounded-2xl
        overflow-hidden
        border border-purple-500
        shadow-[0_0_80px_rgba(124,58,237,0.16)]
        
      "
      onClick={() => setIsMenuOpen(false)}
    >
      {/* ================= PROFILE HEADER ================= */}

      <div className="relative">
        {/* Cover */}
        <div
          className="
            relative
            h-32 sm:h-48
          
            bg-[#05051a]
            border-b border-purple-800
          "
        >
          {/* Purple Glow */}
          <div
            className="
              absolute inset-0
              bg-[radial-gradient(circle_at_50%_65%,rgba(139,92,246,0.28),transparent_55%)]
            "
          />

          {/* ================= WAVE ================= */}

          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 1000 400"
            preserveAspectRatio="none"
          >
            {/* Dots */}
            <g fill="rgba(168,85,247,0.35)">
              {Array.from({ length: 90 }).map((_, i) => (
                <circle
                  key={i}
                  cx={(i * 137) % 1000}
                  cy={40 + ((i * 83) % 170)}
                  r="2.2"
                />
              ))}
            </g>

            <defs>
              <filter id="waveGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />

                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <g fill="none" strokeLinecap="round" filter="url(#waveGlow)">
              {/* Wave 1 */}
              <path
                d="M-100 220 C80 80 220 390 390 210 S700 70 850 220 S1080 350 1200 170"
                stroke="rgba(168,85,247,0.75)"
                strokeWidth="3"
              />

              {/* Wave 2 */}
              <path
                d="M-100 240 C80 100 220 410 390 230 S700 90 850 240 S1080 370 1200 190"
                stroke="rgba(139,92,246,0.65)"
                strokeWidth="2.5"
              />

              {/* Wave 3 */}
              <path
                d="M-100 260 C80 120 220 430 390 250 S700 110 850 260 S1080 390 1200 210"
                stroke="rgba(124,58,237,0.55)"
                strokeWidth="2"
              />

              {/* Wave 4 */}
              <path
                d="M-100 280 C80 140 220 450 390 270 S700 130 850 280 S1080 410 1200 230"
                stroke="rgba(192,132,252,0.45)"
                strokeWidth="2"
              />

              {/* Wave 5 */}
              <path
                d="M-100 200 C100 340 230 70 400 200 S700 350 870 190 S1080 70 1200 230"
                stroke="rgba(168,85,247,0.55)"
                strokeWidth="2"
              />

              {/* Wave 6 */}
              <path
                d="M-100 180 C100 320 230 50 400 180 S700 330 870 170 S1080 50 1200 210"
                stroke="rgba(139,92,246,0.45)"
                strokeWidth="3"
              />

              {/* Wave 7 */}
              <path
                d="M-100 300 C100 150 240 460 420 290 S720 140 900 290 S1100 400 1200 250"
                stroke="rgba(124,58,237,0.40)"
                strokeWidth="1.8"
              />

              {/* Main Bright Wave */}
              <path
                d="M-100 230 C100 60 230 420 410 220 S720 70 900 230 S1100 370 1200 180"
                stroke="rgba(216,180,254,0.9)"
                strokeWidth="3"
              />
            </g>
          </svg>

          {/* Bottom Fade */}
          <div
            className="
              absolute inset-x-0 bottom-0
              h-16
              bg-gradient-to-t
              from-[#030511]
              to-transparent
            "
          />

          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="
    absolute
    top-3 right-2
    w-8 h-8
    rounded-xl
    flex items-center justify-center

    bg-[#08091c]/90
    backdrop-blur-md

    border border-purple-400/50
    text-white

    shadow-[0_0_5px_rgba(168,85,247,0.45),0_0_35px_rgba(124,58,237,0.25)]

    hover:bg-purple-500/15
    hover:border-purple-300
    hover:shadow-[0_0_20px_rgba(168,85,247,0.65),0_0_45px_rgba(124,58,237,0.35)]

    hover:scale-105
    active:scale-95

    transition-all duration-200
    z-20
  "
          >
            <span className="text-3xl leading-none font-light -mt-1">
              <FiArrowLeft size={18} />
            </span>
          </button>
          {/* Profile Menu Button */}
          {isOwnProfile && (
            <button
              onClick={handleMenuToggle}
              aria-label="Profile menu"
              className="
                absolute
    top-3 right-15
    w-8 h-8
    rounded-xl
    flex items-center justify-center

    bg-[#08091c]/90
    backdrop-blur-md

    border border-purple-400/50
    text-white

    shadow-[0_0_5px_rgba(168,85,247,0.45),0_0_35px_rgba(124,58,237,0.25)]

    hover:bg-purple-500/15
    hover:border-purple-300
    hover:shadow-[0_0_20px_rgba(168,85,247,0.65),0_0_45px_rgba(124,58,237,0.35)]

    hover:scale-105
    active:scale-95

    transition-all duration-200
    z-20
              "
            >
              <FiMoreVertical size={21} />
            </button>
          )}

          {/* ================= PROFILE PICTURE ================= */}

          <div
            className="
              absolute
              left-23
              -bottom-10
              -translate-x-1/2
              z-10
              
              
            "
          >
            {user?.profilePic ? (
              <div
                className="rounded-full p-[4px] bg-gradient-to-r
                form-violet-400 via-fuchsia-500 to purple-600

                shadow-[0_0_10px_rgba(168,85,247,0.8),0_0_10px_rgba(139,92,247,0.45)]
              "
              >
                <img
                  src={user.profilePic}
                  alt={user?.name || "Profile"}
                  className="
                  w-30 h-30
                  sm:w-36 sm:h-36
                  rounded-full
                  object-cover
                  border-4 border-[#030511]
                  
                 
                "
                />
              </div>
            ) : (
              <div
                className="
                  w-24 h-24
                  sm:w-28 sm:h-28
                  rounded-full
                  border-4 border-[#030511]
                  ring-3 ring-purple-500
                  bg-gradient-to-br
                  from-blue-500
                  to-purple-600
                  flex items-center justify-center
                  text-3xl font-bold text-white
                  shadow-[0_0_25px_rgba(168,85,247,0.65)]
                "
              >
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            )}
          </div>
          <h1
            className="absolute left-45 -bottom-4 z-20 mb-1.5
          text-xl sm:text-2xl font-bold text-white tracking-tight
          bg-[#080b1b]/70 px-4 rounded-md"
          >
            {user?.name || "User"}
          </h1>
        </div>

        {/* ================= PROFILE MENU ================= */}

        {isOwnProfile && isMenuOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="
              absolute
              top-14 right-4
              w-40
              bg-[#0d1124]
              rounded-xl
              shadow-xl
              border border-purple-500/30
              overflow-hidden
              z-30
            "
          >
            <button
              onClick={() => {
                setIsMenuOpen(false);
                navigate("/saved-posts");
              }}
              className="
                flex items-center gap-3
                px-4 py-2.5
                w-full
                text-left
                text-gray-200
                hover:bg-purple-500/10
                transition
              "
            >
              <FiBookmark size={17} />

              <span className="font-medium text-sm">Saved Posts</span>
            </button>

            <button
              onClick={handleLogout}
              className="
                flex items-center gap-3
                px-4 py-2.5
                w-full
                text-left
                text-red-400
                hover:bg-red-500/10
                transition
              "
            >
              <FiLogOut size={17} />

              <span className="font-medium text-sm">Logout</span>
            </button>
          </div>
        )}
      </div>

      {/* ================= PROFILE STATS ================= */}

      <div
        className="
    ml-34
    mr-1
    mt-2
    mb-2
   
  "
      >
        <div className="flex items-center justify-center py-4 px-2">
          {/* Posts */}
          <button
            type="button"
            onClick={handlePostsClick}
            className="flex-1 flex flex-col items-center justify-center 
            transition-all duration-200 active:scale-95"
          >
            <h2 className="text-xl font-bold text-white leading-none">
              {userPosts.length}
            </h2>

            <p className="text-sm text-purple-200 font-semibold mt-2 tracking-wide">
              Posts
            </p>
          </button>

          {/* Divider */}
          <div className="h-9 w-px bg-purple-400/20" />

          {/* Followers */}
          <button
            type="button"
            onClick={() => setIsFollowersOpen(true)}
            className="
      flex-1
      flex flex-col items-center justify-center
      transition-all duration-200
      active:scale-95
    "
          >
            <h2 className="text-xl font-bold text-white leading-none">
              {followers.length}
            </h2>

            <p className="text-sm text-purple-200 font-semibold mt-2 tracking-wide">
              Followers
            </p>
          </button>

          {/* Divider */}
          <div className="h-9 w-px bg-purple-400/20" />

          {/* Following */}
          <button
            type="button"
            onClick={() => setIsFollowingOpen(true)}
            className="
      flex-1
      flex flex-col items-center justify-center
      transition-all duration-200
      active:scale-95
    "
          >
            <h2 className="text-xl font-bold text-white leading-none">
              {following.length}
            </h2>

            <p className="text-sm text-purple-200 font-semibold mt-2 tracking-wide">
              Following
            </p>
          </button>
        </div>
      </div>

      {/* ================= PROFILE INFO ================= */}

      <div className="text-left -mt-10 ml-3 w-full px-4 sm:px-5">
        {/* Username */}

        <p
          className="
            text-sm sm:text-sm
            text-purple-400
            font-semibold
            mt-2 ml-3
          "
        >
          @{user?.name?.toLowerCase().replace(/\s+/g, "")}
        </p>

        {/* Caption */}
        <p
          className="
            text-sm font-semibold sm:text-sm
            text-gray-300
            mt-6
            w-full
            max-w-[200px]
            ml-0.1
            leading-relaxed
            break-all
            
          "
        >
          {user?.bio || "Welcome to my profile"}
        </p>

        {/* Existing Edit Profile */}
        <div className="text-center">{children}</div>
      </div>

      {/* ================= STATS ================= */}

      {/* ================= FOLLOWERS MODAL ================= */}

      {isFollowersOpen && (
        <UserListModal
          title="Followers"
          users={followers}
          isOwnProfile={isOwnProfile}
          showFollowerActions={true}
          onClose={() => setIsFollowersOpen(false)}
          showRemoveFollower={isOwnProfile}
          onRemoveFollower={handleRemovingFollower}
          removingFollowerId={removingFollowerId}
        />
      )}

      {/* ================= FOLLOWING MODAL ================= */}

      {isFollowingOpen && (
        <UserListModal
          title="Following"
          users={following}
          onClose={() => setIsFollowingOpen(false)}
          showUnfollow={true}
          isOwnProfile={isOwnProfile}
        />
      )}

      {/* ================= POSTS SECTION ================= */}

      <div
        id="profile-posts"
        className="
          mt-5
          px-4 sm:px-5
          pb-45
        "
      >
        {/* Posts Header */}
        <div
          className="
            flex items-center
            justify-between
            mb-3
          "
        >
          <div className="flex items-center gap-2">
            <FiCamera size={18} className="text-purple-400" />

            <h2
              className="
                text-base sm:text-lg
                font-bold
                text-white
              "
            >
              Posts
            </h2>
          </div>

          <p className="text-[11px] sm:text-xs text-gray-400">
            {userPosts.length} {userPosts.length === 1 ? "Post" : "Posts"}
          </p>
        </div>

        {/* Purple Line */}
        <div
          className="
            h-px
            bg-gradient-to-r
            from-purple-500
            via-purple-500/30
            to-transparent
            mb-4
          "
        />

        {/* ================= POSTS ================= */}

        {userPosts.length === 0 ? (
          <div
            className="
              py-12
              text-center
              rounded-xl
              border border-purple-500/15
              bg-[#080b1b]
            "
          >
            <FiCamera size={34} className="mx-auto mb-3 text-purple-400/50" />

            <h3 className="font-semibold text-sm text-gray-300">
              No posts yet
            </h3>

            <p className="text-xs text-gray-500 mt-1">
              {isOwnProfile
                ? "Create your first post."
                : "This user hasn't posted anything yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {userPosts.map((post) => (
              <div
                key={post._id}
                onClick={() =>
                  navigate("/", {
                    state: {
                      postId: post._id,
                    },
                  })
                }
                className="
                  group
                  relative
                  flex
                  gap-3
                  p-2.5
                  sm:p-3
                  rounded-xl
                  border
                  border-purple-500/20
                  bg-[#080b1b]
                  hover:border-purple-500/50
                  hover:bg-[#0b0e20]
                  shadow-[0_0_18px_rgba(124,58,237,0.05)]
                  hover:shadow-[0_0_22px_rgba(124,58,237,0.12)]
                  cursor-pointer
                  transition-all
                  duration-300
                "
              >
                {/* Post Image */}
                <div
                  className="
                    flex-shrink-0
                    w-24 h-24
                    sm:w-28 sm:h-28
                    overflow-hidden
                    rounded-lg
                    border border-purple-500/20
                    bg-black
                  "
                >
                  <img
                    src={post.image}
                    alt={post.caption || "Post"}
                    className="
                      w-full
                      h-full
                      object-cover
                      group-hover:scale-105
                      transition-transform
                      duration-300
                    "
                  />
                </div>

                {/* Post Content */}
                <div
                  className="
                    flex-1
                    min-w-0
                    flex
                    flex-col
                    justify-center
                    pr-5
                  "
                >
                  {/* Caption */}
                  <h3
                    className="
                      text-sm
                      sm:text-base
                      font-bold
                      text-white
                      line-clamp-2
                    "
                  >
                    {post.caption || "My Post"}
                  </h3>

                  {/* Time */}
                  {post.createdAt && (
                    <p
                      className="
                      absolute 
                        -mt-20
                        right-2
                        text-[13px]
                        font-bold
                        sm:text-xs
                        text-purple-400/80
                      
                      "
                    >
                      {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfileContent;
