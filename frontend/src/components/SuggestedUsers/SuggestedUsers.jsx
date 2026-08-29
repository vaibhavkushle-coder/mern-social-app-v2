import { useState } from "react";
import { followUser } from "../../services/userService";
import { useUser } from "../../hooks/useUser";
import { useNavigate } from "react-router-dom";

function SuggestedUsers({ users = [], onFollow }) {
  const [loadingUsers, setLoadingUsersId] = useState(null);

  const { fetchUser } = useUser();
  const navigate = useNavigate();

  async function handleFollow(userId) {
    try {
      setLoadingUsersId(userId);
      await followUser(userId);

      onFollow(userId);

      console.log("Followed successfully");

      await fetchUser();
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingUsersId(null);
    }
  }
  if (users.length === 0) {
    return null;
  }
  return (
    <div className=" max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-5 px-1">
        <div className="flex items-center gap-3 ml-6 mt-4">
          <div
            className="w-10 h-10 rounded-xl
        bg-gradient-to-br from-blue-500 to-purple-600
        text-white flex items-center justify-center
        shadow-md"
          >
            ✨
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-300">
              Suggested for you
            </h2>

            <p className="text-xs text-gray-400 mt-0.5">People you may know</p>
          </div>
        </div>

        <button
          onClick={() => navigate("/search")}
          className="text-sm font-semibold text-purple-500
      hover:text-purple-600 transition-colors"
        >
          See all
        </button>
      </div>

      <div
        className="flex gap-4 overflow-x-auto pb-4 px-1"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(139, 92, 246, 0.5) transparent",
        }}
      >
        {users.map((user) => (
          <div
            key={user._id}
            className="min-w-[180px] h-[190px]
         bg-[#0b0b1f] rounded-2xl border border-purple-900
        shadow-sm hover:shadow-lg
        p-4 flex-shrink-0 flex flex-col
        transition-all duration-300"
          >
            <div
              className="cursor-pointer"
              onClick={() => navigate(`/profile/${user._id}`)}
            >
              <div
                className="w-[68px] h-[68px] mx-auto rounded-full p-[2px]
            bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500"
              >
                {user?.profilePic ? (
                  <img
                    src={user?.profilePic}
                    alt={user?.name}
                    className="w-full h-full rounded-full
              object-cover border-2 border-white/50"
                  />
                ) : (
                  <div
                    className="w-full h-full text-white flex 
                  items-center justify-center text-2xl font-bold"
                  >
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
              </div>

              <h3
                className="text-center font-semibold text-gray-100
            mt-3 truncate"
              >
                {user?.name}
              </h3>
            </div>

            <button
              onClick={() => handleFollow(user._id)}
              disabled={loadingUsers === user._id}
              className="w-full mt-4
          bg-gradient-to-r from-blue-800 to-purple-800
          text-white py-2 rounded-xl font-semibold
          shadow-sm hover:shadow-md
          hover:opacity-90 active:scale-95
          disabled:opacity-60 disabled:cursor-not-allowed
          transition-all duration-200"
            >
              {loadingUsers === user._id ? "Following..." : "Follow"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
export default SuggestedUsers;
