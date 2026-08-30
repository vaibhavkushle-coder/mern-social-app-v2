import { useNavigate } from "react-router-dom";
import { FiX, FiUsers, FiSearch, FiMoreVertical } from "react-icons/fi";
import { useUser } from "../../hooks/useUser";
import { followUser, unfollowUser } from "../../services/userService";
import { useToast } from "../../hooks/useToast";
import { useState } from "react";
import { useHome } from "../../hooks/useHome";

function UserListModal({
  title,
  users = [],
  profileUser,
  onClose,
  showUnfollow = false,
  showFollowerActions = false,
  isOwnProfile = false,
  onUnfollow,
  unfollowingUserId,
  setProfileUser,
  showRemoveFollower = false,
  onRemoveFollower,
  removingFollowerId,
}) {
  const [actionUserId, setActionUserId] = useState(null);
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const navigate = useNavigate();

  const { fetchSuggestedUsers } = useHome();

  const { user: currentUser, setUser: setCurrentUser } = useUser();

  const { showToast } = useToast();

  async function handleFollow(targetUser) {
    const isFollowing = currentUser?.following?.some(
      (followingUser) => followingUser._id === targetUser._id,
    );

    try {
      setActionUserId(targetUser._id);

      if (isFollowing) {
        await unfollowUser(targetUser._id);
        await fetchSuggestedUsers();

        setCurrentUser((prev) => ({
          ...prev,
          following: prev.following.filter(
            (user) => user._id !== targetUser._id,
          ),
        }));

        showToast("User Unfollowed successfully", "success");
      } else {
        await followUser(targetUser._id);
        await fetchSuggestedUsers();

        setCurrentUser((prev) => ({
          ...prev,
          following: [...prev.following, targetUser],
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
      setActionUserId(null);
    }
  }

  function handleUserClick(userId) {
    navigate(`/profile/${userId}`);
    onClose();
  }

  function handleModalClick() {
    setOpenActionMenuId(null);
  }

  const sortedUsers = [...users].sort((a, b) => {
    const alsCurrentUser = a?._id === currentUser?._id;
    const bIsCurrentUser = b?._id === currentUser?._id;

    if (alsCurrentUser) return -1;
    if (bIsCurrentUser) return 1;

    return 0;
  });

  const filteredUsers = sortedUsers.filter((user) =>
    user?.name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div
      className="fixed inset-0 z-50
    bg-black/60 backdrop-blur-sm
    flex items-center justify-center
    p-3 sm:p-4
    modal-overlay"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg
      max-h-[90vh]
      bg-[#08081c]
      border border-purple-900/60
      rounded-2xl
      shadow-[0_20px_70px_rgba(0,0,0,0.6)]
      overflow-hidden
      modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= HEADER ================= */}
        <div
          className="flex items-center justify-between
        px-4 py-3
        bg-[#0b0b24]
        border-b border-purple-900/50"
          onClick={() => setOpenActionMenuId(null)}
        >
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div
              className="w-9 h-9 rounded-xl
            bg-gradient-to-br from-purple-600 to-blue-600
            text-white
            flex items-center justify-center
            shadow-lg shadow-purple-900/30"
            >
              <FiUsers size={19} />
            </div>

            {/* Title */}
            <div>
              <h2 className="text-base font-bold text-white">{title}</h2>

              <p className="text-[11px] text-gray-400">
                {users.length} {users.length === 1 ? "person" : "people"}
              </p>
            </div>
          </div>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full
          flex items-center justify-center
          text-gray-400
          hover:text-white
          hover:bg-purple-900/40
          active:scale-95
          transition-all duration-200"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* ================= SEARCH ================= */}
        <div
          className="px-4 py-3
        bg-[#08081c]
        border-b border-purple-900/40"
        >
          <div
            className="flex items-center gap-2
          h-10 px-3
          rounded-xl
          bg-[#11112b]
          border border-purple-900/50
          focus-within:border-purple-500/70
          focus-within:shadow-[0_0_15px_rgba(139,92,246,0.12)]
          transition-all"
          >
            <FiSearch size={17} className="text-gray-500 shrink-0" />

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${title.toLowerCase()}...`}
              className="w-full
            bg-transparent
            outline-none
            text-sm text-white
            placeholder:text-gray-500"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-gray-500
              hover:text-white
              transition-colors"
              >
                <FiX size={16} />
              </button>
            )}
          </div>
        </div>

        {/* ================= USER LIST ================= */}
        <div
          className="px-3 py-2
        overflow-y-auto
        max-h-[68vh]
        custom-scrollbar"
        >
          {users.length === 0 ? (
            /* ================= EMPTY ================= */
            <div
              className="py-14
            flex flex-col
            items-center justify-center
            text-center"
            >
              <div
                className="w-14 h-14
              rounded-full
              bg-[#11112b]
              border border-purple-900/50
              flex items-center
              justify-center
              mb-4"
              >
                <FiUsers size={25} className="text-purple-400" />
              </div>

              <h3 className="font-semibold text-gray-300">
                No {title.toLowerCase()} yet
              </h3>

              <p className="text-xs text-gray-500 mt-1">
                There is nothing to show here.
              </p>
            </div>
          ) : filteredUsers.length === 0 ? (
            /* ================= NO SEARCH RESULT ================= */
            <div
              className="py-14
            flex flex-col
            items-center justify-center
            text-center"
            >
              <div
                className="w-14 h-14
              rounded-full
              bg-[#11112b]
              border border-purple-900/50
              flex items-center
              justify-center
              mb-4"
              >
                <FiSearch size={24} className="text-purple-400" />
              </div>

              <h3 className="font-semibold text-gray-300">No users found</h3>

              <p className="text-xs text-gray-500 mt-1">
                Try searching another name.
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredUsers.map((user) => {
                const isFollowing = currentUser?.following?.some(
                  (followingUser) => followingUser._id === user._id,
                );

                const isCurrentUser = currentUser?._id === user?._id;

                return (
                  <div
                    key={user._id}
                    onClick={() => handleUserClick(user._id)}
                    className="relative
                  flex items-center gap-2.5
                  px-2.5 py-2
                  rounded-xl
                  cursor-pointer
                  hover:bg-[#11112b]
                  active:bg-[#151535]
                  border border-transparent
                  hover:border-purple-900/40
                  transition-all duration-200"
                  >
                    {/* ================= PROFILE IMAGE ================= */}
                    <div className="shrink-0">
                      {user?.profilePic ? (
                        <img
                          src={user.profilePic}
                          alt={user?.name || "Profile"}
                          className="w-11 h-11
                        rounded-full
                        object-cover
                        border border-purple-800/50
                        shadow-md"
                        />
                      ) : (
                        <div
                          className="w-11 h-11
                        rounded-full
                        bg-gradient-to-br
                        from-purple-500
                        to-blue-500
                        text-white
                        flex items-center
                        justify-center
                        text-base
                        font-bold
                        shadow-md"
                        >
                          {user?.name?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                      )}
                    </div>

                    {/* ================= USER INFO ================= */}
                    <div className="min-w-0 flex-1">
                      <h3
                        className="text-sm
                      font-semibold
                      text-white
                      truncate"
                      >
                        {user?.name || "Unknown User"}
                      </h3>

                      <p
                        className="text-xs
                      text-gray-500
                      truncate
                      mt-0.5"
                      >
                        {user?.bio || "No bio available"}
                      </p>
                    </div>

                    {/* ================= FOLLOWING ACTIONS ================= */}
                    {!isCurrentUser && showUnfollow && (
                      <div
                        className="flex items-center
                      gap-1.5 shrink-0"
                      >
                        {isOwnProfile ? (
                          <>
                            {/* Message */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/chat/${user._id}`);
                                onClose();
                              }}
                              className="px-2.5 py-1.5
                            rounded-lg
                            bg-[#17172f]
                            border border-purple-900/50
                            text-gray-300
                            text-xs
                            font-semibold
                            hover:bg-purple-900/30
                            hover:text-white
                            transition-all
                            cursor-pointer"
                            >
                              Message
                            </button>

                            {/* More */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();

                                setOpenActionMenuId((prev) =>
                                  prev === user._id ? null : user._id,
                                );
                              }}
                              className="w-8 h-8
                            rounded-full
                            flex items-center
                            justify-center
                            text-gray-500
                            hover:text-white
                            hover:bg-purple-900/40
                            active:scale-95
                            transition-all"
                              title="More options"
                            >
                              <FiMoreVertical size={17} />
                            </button>

                            {/* Unfollow Menu */}
                            {openActionMenuId === user._id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute
                              right-2 top-12
                              w-28
                              bg-[#11112b]
                              rounded-xl
                              shadow-2xl
                              border border-purple-900/60
                              overflow-hidden
                              z-20"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleFollow(user);
                                    setOpenActionMenuId(null);
                                  }}
                                  disabled={actionUserId === user._id}
                                  className="w-full
                                px-3 py-2.5
                                text-left
                                text-xs
                                font-semibold
                                text-red-400
                                hover:bg-red-500/10
                                disabled:opacity-50"
                                >
                                  {actionUserId === user._id
                                    ? "Removing..."
                                    : "Unfollow"}
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          /* Other user's Following list */
                          <div
                            className="flex items-center
                          gap-1.5 shrink-0"
                          >
                            {isFollowing ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/chat/${user._id}`);
                                  onClose();
                                }}
                                className="px-2.5 py-1.5
                              rounded-lg
                              bg-[#17172f]
                              border border-purple-900/50
                              text-gray-300
                              text-xs
                              font-semibold
                              hover:bg-purple-900/30
                              hover:text-white
                              transition-all
                              cursor-pointer"
                              >
                                Message
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFollow(user);
                                }}
                                disabled={actionUserId === user._id}
                                className="px-3 py-1.5
                              rounded-lg
                              bg-gradient-to-r
                              from-purple-600
                              to-blue-600
                              text-white
                              text-xs
                              font-semibold
                              hover:from-purple-500
                              hover:to-blue-500
                              disabled:opacity-50
                              disabled:cursor-not-allowed
                              transition-all
                              cursor-pointer
                              shadow-md
                              shadow-purple-900/20"
                              >
                                {actionUserId === user._id ? "..." : "Follow"}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ================= FOLLOWERS ACTIONS ================= */}
                    {!isCurrentUser && showFollowerActions && (
                      <div
                        className="flex items-center
                        gap-1.5 shrink-0"
                      >
                        {isFollowing ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/chat/${user._id}`);
                              onClose();
                            }}
                            className="px-2.5 py-1.5
                            rounded-lg
                            bg-[#17172f]
                            border border-purple-900/50
                            text-gray-300
                            text-xs
                            font-semibold
                            hover:bg-purple-900/30
                            hover:text-white
                            transition-all
                            cursor-pointer"
                          >
                            Message
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFollow(user);
                            }}
                            disabled={actionUserId === user._id}
                            className="px-3 py-1.5
                            rounded-lg
                            bg-gradient-to-r
                            from-purple-600
                            to-blue-600
                            text-white
                            text-xs
                            font-semibold
                            hover:from-purple-500
                            hover:to-blue-500
                            disabled:opacity-50
                            disabled:cursor-not-allowed
                            transition-all
                            cursor-pointer
                            shadow-md
                            shadow-purple-900/20"
                          >
                            {actionUserId === user._id
                              ? "..."
                              : isOwnProfile
                                ? "Follow Back"
                                : "Follow"}
                          </button>
                        )}

                        {/* Remove Follower */}
                        {showRemoveFollower && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveFollower(user._id);
                            }}
                            disabled={removingFollowerId === user._id}
                            aria-label="Remove follower"
                            className="w-8 h-8
                            rounded-full
                            flex items-center
                            justify-center
                            border border-purple-900/50
                            bg-[#11112b]
                            text-gray-500
                            shadow-sm
                            hover:text-red-400
                            hover:bg-red-500/10
                            hover:border-red-500/30
                            active:scale-90
                            disabled:opacity-50
                            transition-all duration-200"
                          >
                            {removingFollowerId === user._id ? "..." : "×"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserListModal;
