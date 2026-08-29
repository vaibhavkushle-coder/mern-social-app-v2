import { useUser } from "../../hooks/useUser";
import { useState, useEffect } from "react";
import { getMyPosts } from "../../services/postService";
import EditProfileModal from "../../components/EditProfileModal/EditProfileModal";
import Navbar from "../../components/Navbar/Navbar";
import ProfileContent from "../../components/ProfileContent/ProfileContent";

function Profile() {
  const [posts, setPosts] = useState([]);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const { user, setUser, fetchUser } = useUser();

  useEffect(() => {
    async function fetchPosts() {
      const response = await getMyPosts();

      setPosts(response.data.posts);
    }
    fetchPosts();
  }, []);

  useEffect(() => {
    fetchUser();
  }, []);

  function handleCloseEditProfile() {
    setIsEditProfileOpen(false);
  }

  if (!user) {
    return <h1>Loading...</h1>;
  }

  return (
    <div
      className="bg-[#030511] h-screen overflow-y-auto bg-black"
      style={{
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(139, 92, 246, 0.5) transparent",
      }}
    >
      <>
        <Navbar />
        <ProfileContent
          user={user}
          posts={posts}
          isOwnProfile={true}
          setUser={setUser}
        >
          <button
            onClick={() => setIsEditProfileOpen(true)}
            className="
    mt-5
  
    px-25 sm:px-25
    py-3 sm:py-3.5

    bg-[#08091c]/90
    backdrop-blur-md

    text-white
    text-sm sm:text-base
    font-semibold

    rounded-xl

    border border-purple-500/60

    shadow-[0_0_15px_rgba(168,85,247,0.35),0_0_35px_rgba(124,58,237,0.18)]

    hover:bg-purple-500/10
    hover:border-purple-300
    hover:text-purple-100

    hover:shadow-[0_0_20px_rgba(168,85,247,0.65),0_0_45px_rgba(124,58,237,0.3)]

    hover:scale-[1.03]
    active:scale-95

    transition-all
    duration-200
  "
          >
            Edit Profile
          </button>
        </ProfileContent>
        {isEditProfileOpen && (
          <EditProfileModal user={user} onClose={handleCloseEditProfile} />
        )}
      </>
    </div>
  );
}

export default Profile;
