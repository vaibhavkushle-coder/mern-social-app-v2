import { useEffect, useState } from "react";
import { useHome } from "../../hooks/useHome";
import { Link, useLocation } from "react-router-dom";
import { FiBell, FiPlus } from "react-icons/fi";
import {
  likePost,
  unlikePost,
  commentPost,
  deletePost,
  deleteComment,
  editComment,
  editPost,
} from "../../services/postService";
import PostCard from "../../components/PostCard/PostCard";
import Navbar from "../../components/Navbar/Navbar";
import { useToast } from "../../hooks/useToast";
import SuggestedUsers from "../../components/SuggestedUsers/SuggestedUsers";
import { getPostById } from "../../services/postService";
import logger from "../../utils/logger";
import LoadingMoreIndicator from "../../components/LoadingMoreIndicator/LoadingMoreIndicator";
import getApiErrorMessage from "../../utils/getApiErrorMessage";
import { useNotification } from "../../hooks/useNotification";

function Home() {
  const [error, setError] = useState("");
  const [likeLoading, setLikeLoading] = useState({});
  const [selectedPost, setSelectedPost] = useState(null);

  const { showToast } = useToast();
  const location = useLocation();
  const postId = location.state?.postId;

  const params = new URLSearchParams(window.location.search);
  const urlpostId = params.get("post");

  const {
    posts,
    setPosts,
    suggestedUsers,
    setSuggestedUsers,
    postsLoaded,
    suggestedUsersLoaded,
    fetchPosts,
    fetchSuggestedUsers,
    loadMorePosts,
    feedMeta,
  } = useHome();

  const selectedPostId = urlpostId || postId;

  useEffect(() => {
    if (!suggestedUsersLoaded) {
      fetchSuggestedUsers();
    }
  }, [suggestedUsersLoaded, fetchSuggestedUsers]);

  function handleSuggestedUserFollow(userId) {
    setSuggestedUsers((prevUsers) =>
      prevUsers.filter((user) => user._id !== userId),
    );
  }

  useEffect(() => {
    async function loadPosts() {
      try {
        if (selectedPostId) {
          const response = await getPostById(selectedPostId);

          setSelectedPost(response.data.post);
        } else if (!postsLoaded) {
          await fetchPosts();
        }
      } catch (error) {
        logger.error("home.feed_load.failed", error);
        setError("😔 Failed to load post");
      }
    }

    loadPosts();
  }, [selectedPostId, postsLoaded, fetchPosts]);

  useEffect(() => {
    if (selectedPostId) return;
    function onScroll(event) {
      const element = event.currentTarget;
      if (element.scrollHeight - element.scrollTop - element.clientHeight < 700)
        loadMorePosts();
    }
    const element = document.querySelector("[data-home-scroll]");
    element?.addEventListener("scroll", onScroll);
    return () => element?.removeEventListener("scroll", onScroll);
  }, [selectedPostId, loadMorePosts]);

  useEffect(() => {
    if (!selectedPostId || posts.length === 0) return;

    requestAnimationFrame(() => {
      const element = document.getElementById(`post-${selectedPostId}`);

      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    });
  }, [selectedPostId, posts]);

  async function handleLike(postId) {
    if (likeLoading[postId]) return;

    try {
      setLikeLoading((prev) => ({
        ...prev,
        [postId]: true,
      }));
      const response = await likePost(postId);

      const updatedPost = response.data.post;

      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post._id === updatedPost._id) {
            return updatedPost;
          }

          return post;
        }),
      );
    } catch (error) {
      logger.error("post.like.failed", error);
      showToast(getApiErrorMessage(error, "Failed to like post"), "error");
    } finally {
      setLikeLoading((prev) => ({
        ...prev,
        [postId]: false,
      }));
    }
  }

  async function handleUnlike(postId) {
    if (likeLoading[postId]) return;

    try {
      setLikeLoading((prev) => ({
        ...prev,
        [postId]: true,
      }));
      const response = await unlikePost(postId);

      const updatedPost = response.data.post;

      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post._id === updatedPost._id) {
            return updatedPost;
          }

          return post;
        }),
      );
    } catch (error) {
      logger.error("post.unlike.failed", error);
      showToast(getApiErrorMessage(error, "Failed to unlike post"), "error");
    } finally {
      setLikeLoading((prev) => ({
        ...prev,
        [postId]: false,
      }));
    }
  }

  async function handleComment(postId, comment) {
    try {
      const response = await commentPost(postId, comment);

      const updatedPost = response.data.post;

      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post._id === updatedPost._id) {
            return updatedPost;
          }

          return post;
        }),
      );
      showToast("Comment added successfully 💬", "success");
    } catch (error) {
      logger.error("post.comment.failed", error);
      showToast(getApiErrorMessage(error, "Failed to add comment 💬"), "error");
    }
  }

  async function handleDelete(postId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this post?",
    );

    if (!confirmed) {
      return;
    }
    try {
      await deletePost(postId);

      setPosts((prevPosts) => prevPosts.filter((post) => post._id !== postId));
      showToast("Post deleted successfully 🗑️", "success");
    } catch (error) {
      logger.error("post.delete.failed", error);
      showToast(getApiErrorMessage(error, "Failed to delete post 🗑️"), "error");
    }
  }

  async function handleCommentDelete(postId, commentId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this comment?",
    );

    if (!confirmed) {
      return;
    }
    try {
      await deleteComment(postId, commentId);

      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post._id === postId) {
            return {
              ...post,
              comments: post.comments.filter(
                (comment) => comment._id !== commentId,
              ),
            };
          }
          return post;
        }),
      );
      showToast("Comment deleted successfully 🗑️", "success");
    } catch (error) {
      logger.error("comment.delete.failed", error);
      showToast(
        getApiErrorMessage(error, "Failed to delete comment 🗑️"),
        "error",
      );
    }
  }

  async function handleEditComment(postId, commentId, text) {
    try {
      const response = await editComment(postId, commentId, text);

      const updatedPost = response.data.post;

      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post._id === updatedPost._id) {
            return updatedPost;
          }

          return post;
        }),
      );
      showToast("Comment updated successfully ✏️", "success");
    } catch (error) {
      logger.error("comment.edit.failed", error);
      showToast(
        getApiErrorMessage(error, "Failed to update comment ✏️"),
        "error",
      );
    }
  }

  async function handleEditPost(postId, caption) {
    try {
      const response = await editPost(postId, caption);

      const updatedPost = response.data.post;

      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post._id === updatedPost._id) {
            return updatedPost;
          }
          return post;
        }),
      );
      showToast("Post updated successfully ✏️", "success");
    } catch (error) {
      logger.error("post.edit.failed", error);
      showToast(getApiErrorMessage(error, "Failed to update post ✏️"), "error");
    }
  }

  function HomeHeader() {
    const { notificationUnreadCount } = useNotification();

    return (
      <header className="border-b border-white/[0.07]">
        <div
          className="mx-auto grid h-14 max-w-2xl 
        grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center px-4 sm:px-5"
        >
          <Link
            to="/create-post"
            aria-label="Create post"
            title="Create Post"
            className="flex h-10 w-10 items-center justify-center 
            justify-self-start rounded-xl border border-white/10
             bg-white/[0.03] text-violet-300 transition-all 
             hover:border-purple-400/30 hover:bg-purple-500/10 
             hover:text-purple-300 active:scale-95"
          >
            <FiPlus size={24} strokeWidth={2.2} />
          </Link>

          <Link
            to="/"
            aria-label="Home"
            className="min-w-0 justify-self-center px-2 
            text-center text-xl font-extrabold tracking-normal text-violet-300"
          >
            Social<span className="text-purple-400">.</span>
          </Link>

          <Link
            to="/notification"
            aria-label="Notifications"
            title="Notifications"
            className="relative flex h-10 w-10 items-center justify-center 
            justify-self-end rounded-xl border border-white/10 bg-white/[0.03] 
            text-violet-300 transition-all hover:border-purple-400/30
             hover:bg-purple-500/10 hover:text-purple-300 active:scale-95"
          >
            <FiBell size={21} strokeWidth={2.1} />
            {notificationUnreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full border-2 border-[#0b0b1f] bg-red-500 px-0.5 text-[9px] font-bold leading-none text-white">
                {notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}
              </span>
            )}
          </Link>
        </div>
      </header>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen  bg-[#0b0b1f]">
        <Navbar />
        <HomeHeader />
        <div className="flex justify-center items-center py-20">
          <p className="text-xl font-semibold text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!postsLoaded && !selectedPostId) {
    return (
      <div className="min-h-screen  bg-[#0b0b1f]">
        <Navbar />
        <HomeHeader />
        <div className="flex justify-center items-center py-20">
          <p className="text-xl font-semibold text-violet-300">
            ⌛ Loading posts...
          </p>
        </div>
      </div>
    );
  }

  const visiblePosts = selectedPostId && selectedPost ? [selectedPost] : posts;

  if (visiblePosts.length === 0) {
    return (
      <div className="min-h-screen  bg-[#0b0b1f]">
        <Navbar />
        <HomeHeader />
        <div className="flex flex-col justify-center items-center py-20">
          <h2 className="text-2xl font-bold text-violet-300">✖️ No Post Yet</h2>
          <p className="text-violet-500 mt-2">
            Be the first one to create a post.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-home-scroll
      className="h-screen overflow-y-auto bg-black"
      style={{
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(139, 92, 246, 0.5) transparent",
      }}
    >
      <Navbar />
      <HomeHeader />

      <div className="max-w-2xl mx-auto py-1 space-y-6 pb-20">
        {visiblePosts.map((post, index) => (
          <div key={post._id}>
            <PostCard
              post={post}
              onLike={handleLike}
              onUnlike={handleUnlike}
              onComment={handleComment}
              onDelete={handleDelete}
              onCommentDelete={handleCommentDelete}
              onEditComment={handleEditComment}
              onEditPost={handleEditPost}
              likePending={Boolean(likeLoading[post._id])}
            />

            {index === 0 && suggestedUsers.length > 0 && (
              <SuggestedUsers
                users={suggestedUsers}
                onFollow={handleSuggestedUserFollow}
              />
            )}
          </div>
        ))}
        {!selectedPostId && feedMeta.loadingMore && (
          <LoadingMoreIndicator label="Loading more posts..." />
        )}
      </div>
    </div>
  );
}

export default Home;
