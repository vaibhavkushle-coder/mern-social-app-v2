import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getProfileById } from "../../services/userService";
import Navbar from "../../components/Navbar/Navbar";
import ProfileContent from "../../components/ProfileContent/ProfileContent";
import { useUser } from "../../hooks/useUser";
import { useNavigate } from "react-router-dom";
import FollowButton from "../../components/FollowButton/FollowButton";
import { useSocket } from "../../hooks/useSocket";

function UserProfile() {
  const { id } = useParams();

  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);

  const navigate = useNavigate();
  const { socket } = useSocket();

  const { user: currentUser } = useUser();

  const isOwnProfile = currentUser?._id?.toString() === user?._id?.toString();

  useEffect(() => {
    if (currentUser?._id === id) {
      navigate("/profile");
    }
  }, [currentUser, id, navigate]);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await getProfileById(id);
        setUser(response.data.user);
        setPosts(response.data.posts);
      } catch (error) {
        console.log(error);
      }
    }
    fetchProfile();
  }, [id]);

  useEffect(() => {
    if (!socket) return;

    function handleUserUnfollowed(data) {
      console.log("USER UNFOLLOWED EVENT RECEIVED:", data);

      setUser((prev) => {
        if (!prev) return prev;

        if (prev._id !== data.userId) {
          return prev;
        }

        return {
          ...prev,
          followers: prev.followers.filter(
            (follower) => follower._id !== data.followerId,
          ),
        };
      });
    }

    socket.on("user-unfollowed", handleUserUnfollowed);

    return () => {
      socket.off("user-unfollowed", handleUserUnfollowed);
    };
  }, [socket]);
  if (!user) {
    return (
      <>
        <Navbar />
        <h1 className="text-center mt-20">Loading...</h1>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <ProfileContent user={user} posts={posts} isOwnProfile={isOwnProfile}>
        {!isOwnProfile && (
          <div className="flex mr-5 mt-6">
            <FollowButton profileUser={user} setProfileUser={setUser} />

            <button
              type="button"
              onClick={() => navigate(`/chat/${user._id}`)}
              className="
    
    rounded-xl ml-2
    

    w-full
    

    bg-[#08091c]
    text-white
    font-semibold
    text-sm

    border border-purple-500/50

    shadow-[0_0_15px_rgba(168,85,247,0.25)]

    hover:bg-purple-500/10
    hover:border-purple-400
    hover:text-purple-200

    hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]

    active:scale-95
    transition-all
    duration-200
  "
            >
              Message
            </button>
          </div>
        )}
      </ProfileContent>
    </>
  );
}

export default UserProfile;
