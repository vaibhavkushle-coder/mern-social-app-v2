import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { getProfileById } from "../../services/userService";
import Navbar from "../../components/Navbar/Navbar";
import ProfileContent from "../../components/ProfileContent/ProfileContent";
import { useUser } from "../../hooks/useUser";
import { useNavigate } from "react-router-dom";
import FollowButton from "../../components/FollowButton/FollowButton";

function UserProfile() {
  const { id } = useParams();

  const [user, setUser] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const [posts, setPosts] = useState([]);
  const [postMeta, setPostMeta] = useState({
    hasMore: false,
    nextCursor: null,
    loadingMore: false,
    totalPosts: 0,
  });
  const postsRequestRef = useRef(null);
  const requestVersionRef = useRef(0);

  const navigate = useNavigate();

  const { user: currentUser } = useUser();
  const currentUserId = currentUser?._id?.toString() || null;

  const isOwnProfile = currentUser?._id?.toString() === user?._id?.toString();

  useEffect(() => {
    if (currentUser?._id === id) {
      navigate("/profile");
    }
  }, [currentUser, id, navigate]);

  useEffect(() => {
    const version = ++requestVersionRef.current;
    postsRequestRef.current = null;
    setUser(null);
    setLoadingProfile(true);
    setProfileError(null);
    setPosts([]);
    setPostMeta({
      hasMore: false,
      nextCursor: null,
      loadingMore: false,
      totalPosts: 0,
    });

    async function fetchProfile() {
      try {
        const response = await getProfileById(id);

        if (requestVersionRef.current !== version) return;

        setUser(response.data.user);
        setPosts(response.data.posts);
        setPostMeta({
          hasMore: response.data.hasMore,
          nextCursor: response.data.nextCursor,
          loadingMore: false,
          totalPosts: response.data.totalPosts,
        });
      } catch (error) {
        if (requestVersionRef.current === version) {
          logger.error("user.profile.failed", error);
          setProfileError(
            error.response?.status === 404
              ? "User not found."
              : "Unable to load profile. Please try again.",
          );
        }
      } finally {
        if (requestVersionRef.current === version) {
          setLoadingProfile(false);
        }
      }
    }
    fetchProfile();

    return () => {
      if (requestVersionRef.current === version) {
        requestVersionRef.current += 1;
      }
    };
  }, [id, currentUserId, retryVersion]);

  async function loadMorePosts() {
    if (
      !id ||
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
      const response = await getProfileById(id, postMeta.nextCursor);

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
        logger.error("user.profile_posts_load_more.failed", error);
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

  if (loadingProfile) {
    return (
      <>
        <div
          className="h-screen bg-[#0b0b1f] overflow-y-auto bg-black"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(139, 92, 246, 0.5) transparent",
          }}
        >
          <Navbar />

          <div className="flex flex-col items-center justify-center mt-50 gap-4">
            <div className="w-9 h-9 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>

            <p className="text-sm font-medium text-gray-400 animate-pulse">
              Loading profile...
            </p>
          </div>
        </div>
      </>
    );
  }

  if (profileError || !user) {
    return (
      <div className="h-screen bg-[#0b0b1f] overflow-y-auto bg-black">
        <Navbar />

        <div className="flex flex-col items-center justify-center mt-50 gap-4 px-6 text-center">
          <p className="text-sm font-medium text-gray-300">
            {profileError || "Unable to load profile."}
          </p>

          <button
            type="button"
            onClick={() => setRetryVersion((version) => version + 1)}
            className="rounded-lg border border-purple-500/60 px-5 py-2 text-sm font-semibold text-purple-200 transition hover:bg-purple-500/10"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="h-screen bg-[#0b0b1f] overflow-y-auto bg-black"
        onScroll={handleProfileScroll}
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(139, 92, 246, 0.5) transparent",
        }}
      >
        <Navbar />

        <ProfileContent
          user={user}
          posts={posts}
          totalPosts={postMeta.totalPosts}
          isOwnProfile={isOwnProfile}
          setUser={setUser}
        >
          {!isOwnProfile && (
            <div className="flex mr-5 mt-6">
              <FollowButton profileUser={user} />

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
      </div>
    </>
  );
}

export default UserProfile;
import logger from "../../utils/logger";
