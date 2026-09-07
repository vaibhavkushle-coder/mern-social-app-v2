import { useUser } from "../../hooks/useUser";
import { useState, useEffect, useRef } from "react";
import { getMyPosts } from "../../services/postService";
import EditProfileModal from "../../components/EditProfileModal/EditProfileModal";
import Navbar from "../../components/Navbar/Navbar";
import ProfileContent from "../../components/ProfileContent/ProfileContent";
import logger from "../../utils/logger";
import LoadingMoreIndicator from "../../components/LoadingMoreIndicator/LoadingMoreIndicator";

function Profile() {
  const [posts, setPosts] = useState([]);
  const [postMeta, setPostMeta] = useState({
    hasMore: false,
    nextCursor: null,
    loadingMore: false,
    totalPosts: 0,
  });
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const {
    user,
    setUser,
    fetchUser,
    userInitializing,
    userInitializationError,
  } = useUser();
  const postsRequestRef = useRef(null);
  const requestVersionRef = useRef(0);
  const currentUserId = user?._id?.toString() || null;

  useEffect(() => {
    const version = ++requestVersionRef.current;
    postsRequestRef.current = null;
    setPosts([]);
    setPostMeta({
      hasMore: false,
      nextCursor: null,
      loadingMore: false,
      totalPosts: 0,
    });

    if (!currentUserId) return;

    async function fetchPosts() {
      try {
        const response = await getMyPosts();

        if (requestVersionRef.current !== version) return;

        setPosts(response.data.posts);
        setPostMeta({
          hasMore: response.data.hasMore,
          nextCursor: response.data.nextCursor,
          loadingMore: false,
          totalPosts: response.data.totalPosts,
        });
      } catch (error) {
        if (requestVersionRef.current === version) {
          logger.error("profile.posts_fetch.failed", error);
        }
      }
    }
    fetchPosts();

    return () => {
      if (requestVersionRef.current === version) {
        requestVersionRef.current += 1;
      }
    };
  }, [currentUserId]);

  useEffect(() => {
    fetchUser().catch(() => {});
  }, [fetchUser]);

  function handleCloseEditProfile() {
    setIsEditProfileOpen(false);
  }

  async function loadMorePosts() {
    if (
      !currentUserId ||
      !postMeta.hasMore ||
      !postMeta.nextCursor ||
      postMeta.loadingMore ||
      postsRequestRef.current
    ) {
      return;
    }

    const version = requestVersionRef.current;
    const requestMarker = {};
    postsRequestRef.current = requestMarker;
    setPostMeta((meta) => ({ ...meta, loadingMore: true }));

    try {
      const response = await getMyPosts(postMeta.nextCursor);

      if (requestVersionRef.current !== version) return;

      setPosts((current) => {
        const map = new Map(
          [...current, ...response.data.posts].map((post) => [post._id, post]),
        );
        return [...map.values()];
      });
      setPostMeta({
        hasMore: response.data.hasMore,
        nextCursor: response.data.nextCursor,
        loadingMore: false,
        totalPosts: response.data.totalPosts,
      });
    } catch (error) {
      if (requestVersionRef.current === version) {
        logger.error("profile.posts_load_more.failed", error);
      }
    } finally {
      if (postsRequestRef.current === requestMarker) {
        postsRequestRef.current = null;
      }
      if (requestVersionRef.current === version) {
        setPostMeta((meta) => ({ ...meta, loadingMore: false }));
      }
    }
  }

  function handleProfileScroll(event) {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;

    if (scrollHeight - scrollTop - clientHeight <= 200) {
      loadMorePosts();
    }
  }

  if (!user && userInitializing) {
    return <h1>Loading...</h1>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p>{userInitializationError || "Unable to load your profile."}</p>
        <button
          type="button"
          onClick={() => fetchUser().catch(() => {})}
          className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      className="bg-[#030511] h-screen overflow-y-auto bg-black"
      onScroll={handleProfileScroll}
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
          totalPosts={postMeta.totalPosts}
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
        {postMeta.loadingMore && (
          <LoadingMoreIndicator label="Loading more posts..." />
        )}
        {isEditProfileOpen && (
          <EditProfileModal user={user} onClose={handleCloseEditProfile} />
        )}
      </>
    </div>
  );
}

export default Profile;
