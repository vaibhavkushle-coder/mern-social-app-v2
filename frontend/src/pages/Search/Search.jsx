import Navbar from "../../components/Navbar/Navbar";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch } from "react-icons/fi";
import {
  followUser,
  unfollowUser,
  searchUsers,
} from "../../services/userService";
import { useUser } from "../../hooks/useUser";
import { useHome } from "../../hooks/useHome";

function Search() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [followingId, setFollowingId] = useState(null);

  const navigate = useNavigate();
  const { fetchUser } = useUser();
  const { fetchSuggestedUsers } = useHome();

  useEffect(() => {
    const time = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(time);
  }, [search]);

  useEffect(() => {
    async function fetchUsers() {
      try {
        if (!debouncedSearch.trim()) {
          setUsers([]);
          return;
        }

        setError("");

        setLoading(true);
        const response = await searchUsers(debouncedSearch);

        setUsers(response.data.usersWithFollowStatus);
      } catch (error) {
        console.log(error);
        setError("Failed to search users");
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, [debouncedSearch]);

  async function handleFollow(userId) {
    try {
      setFollowingId(userId);

      await followUser(userId);

      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user._id === userId ? { ...user, isFollowing: true } : user,
        ),
      );
      await fetchUser();
      await fetchSuggestedUsers();
    } catch (error) {
      console.log(error);
    } finally {
      setFollowingId(null);
    }
  }

  async function handleUnfollow(userId) {
    try {
      setFollowingId(userId);

      await unfollowUser(userId);

      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user._id === userId ? { ...user, isFollowing: false } : user,
        ),
      );
      await fetchUser();
      await fetchSuggestedUsers();
    } catch (error) {
      console.log(error);
    } finally {
      setFollowingId(null);
    }
  }
  return (
    <div
      className="h-screen overflow-y-auto bg-black text-white"
      style={{
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(139, 92, 246, 0.5) transparent",
      }}
    >
      <Navbar />

      <div
        className="w-full max-w-xl mx-auto px-3 sm:px-4
       pt-4 pb-24"
      >
        {/* Main Container */}
        <div
          className="
          rounded-2xl
          border border-purple-400
          bg-black
          px-3 sm:px-4
          py-4
          shadow-[0_0_35px_rgba(76,29,149,0.12)]
        "
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-4 px-1">
            <div
              className="
              w-9 h-9
              rounded-xl
              bg-[#0b0b20]
              border border-purple-500/30
              flex items-center justify-center
              shrink-0
            "
            >
              <FiSearch size={19} className="text-purple-400" />
            </div>

            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold leading-tight">
                Search Users
              </h1>

              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Find people and connect
              </p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative mb-4">
            <FiSearch
              size={19}
              className="
              absolute
              left-4
              top-1/2
              -translate-y-1/2
              text-gray-500
              pointer-events-none
            "
            />

            {search && (
              <button
                onClick={() => setSearch("")}
                className="
                absolute
                right-3.5
                top-1/2
                -translate-y-1/2
                w-7 h-7
                flex items-center justify-center
                text-gray-500
                hover:text-white
                text-xl
                rounded-full
                transition
              "
              >
                ×
              </button>
            )}

            <input
              type="text"
              placeholder="Search by name or username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="
              w-full
              h-12
              rounded-xl
              border border-purple-500/30
              bg-[#0a0a1d]
              px-11
              pr-10
              text-sm
              text-white
              placeholder:text-gray-600
              outline-none
              focus:border-purple-500/60
              focus:ring-1
              focus:ring-purple-500/20
              transition
            "
            />
          </div>

          {/* Results */}
          <div className="space-y-2.5">
            {loading ? (
              <div className="text-center py-50">
                <p className="text-sm font-semibold text-gray-400">
                  🔍 Searching...
                </p>
              </div>
            ) : error ? (
              <div className="text-center py-50">
                <h2 className="text-lg font-bold text-red-400">
                  😔 Search failed
                </h2>
              </div>
            ) : !search.trim() ? (
              <div className="text-center py-50">
                <h2 className="text-lg font-bold text-gray-300">
                  🔍 Search for users
                </h2>

                <p className="text-xs text-gray-500 mt-1.5">
                  Find your friends and explore profiles.
                </p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-50">
                <h2 className="text-lg font-bold text-gray-300">
                  😕 No users found
                </h2>

                <p className="text-xs text-gray-500 mt-1.5">
                  Try searching with another name.
                </p>
              </div>
            ) : (
              users.map((user) => (
                <div
                  key={user._id}
                  onClick={() => navigate(`/profile/${user._id}`)}
                  className="
                  flex
                  items-center
                  gap-3
                  p-2.5
                  sm:p-3
                  rounded-xl
                  border border-white/10
                  bg-[#0a0a1c]
                  hover:bg-[#0d0d25]
                  hover:border-purple-500/25
                  cursor-pointer
                  transition-all
                  duration-200
                  active:scale-[0.99]
                "
                >
                  {/* Profile Picture */}
                  {user.profilePic ? (
                    <img
                      src={user.profilePic}
                      alt={user.name}
                      className="
                      w-11 h-11
                      sm:w-12 sm:h-12
                      rounded-full
                      object-cover
                      border
                      border-purple-500/60
                      shrink-0
                    "
                    />
                  ) : (
                    <div
                      className="
                      w-11 h-11
                      sm:w-12 sm:h-12
                      rounded-full
                      bg-[#15152b]
                      border
                      border-purple-500/50
                      flex
                      items-center
                      justify-center
                      text-purple-300
                      font-semibold
                      text-base
                      shrink-0
                    "
                    >
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* User Information */}
                  <div
                    className="
                    flex-1
                    min-w-0
                    flex
                    items-center
                    justify-between
                    gap-2
                  "
                  >
                    <div className="min-w-0">
                      <h3
                        className="
                        text-sm
                        sm:text-base
                        font-semibold
                        text-white
                        truncate
                      "
                      >
                        {user.name}
                      </h3>

                      <p
                        className="
                        text-xs
                        sm:text-sm
                        text-gray-500
                        truncate
                        mt-0.5
                      "
                      >
                        {user.bio || "No bio"}
                      </p>
                    </div>

                    {/* Follow Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();

                        if (user.isFollowing) {
                          handleUnfollow(user._id);
                        } else {
                          handleFollow(user._id);
                        }
                      }}
                      disabled={followingId === user._id}
                      className={`
                      shrink-0
                      px-3.5
                      sm:px-4
                      py-1.5
                      rounded-lg
                      text-xs
                      sm:text-sm
                      font-semibold
                      border
                      transition-all
                      duration-200

                      ${
                        user.isFollowing
                          ? `
                            bg-purple-500/10
                            text-purple-300
                            border-purple-500/20
                            hover:bg-purple-500/15
                            
                          `
                          : `
                            bg-gradient-to-r
                            from-purple-600
                            to-violet-500
                            text-white px-5.5 sm:px-5.5
                            border-purple-400/20
                            shadow-[0_0_12px_rgba(124,58,237,0.2)]
                            hover:shadow-[0_0_18px_rgba(124,58,237,0.3)]
                          `
                      }
                    `}
                    >
                      {followingId === user._id
                        ? user.isFollowing
                          ? "Unfollowing..."
                          : "Following..."
                        : user.isFollowing
                          ? "Following"
                          : "Follow"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Search;
