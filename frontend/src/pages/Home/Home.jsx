import { useEffect, useState } from "react";
import { useHome } from "../../hooks/useHome";
import { useLocation } from "react-router-dom";
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
      if (element.scrollHeight - element.scrollTop - element.clientHeight < 700) loadMorePosts();
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
      showToast("Failed to like post", "error");
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
      showToast("Failed to unlike post", "error");
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
      showToast("Failed to add comment 💬", "error");
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
      showToast("Failed to delete post 🗑️", "error");
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
      showToast("Failed to delete comment 🗑️", "error");
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
      showToast("Failed to update comment ✏️", "error");
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
      showToast("Failed to update post ✏️", "error");
    }
  }

  if (!postsLoaded && !selectedPostId) {
    return (
      <div className="min-h-screen  bg-[#0b0b1f]">
        <Navbar />
        <div className="flex justify-center items-center py-20">
          <p className="text-xl font-semibold text-gray-200">
            ⌛ Loading posts...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen  bg-[#0b0b1f]">
        <Navbar />
        <div className="flex justify-center items-center py-20">
          <p className="text-xl font-semibold text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  const visiblePosts = selectedPostId && selectedPost ? [selectedPost] : posts;

  if (visiblePosts.length === 0) {
    return (
      <div className="min-h-screen  bg-[#0b0b1f]">
        <Navbar />
        <div className="flex flex-col justify-center items-center py-20">
          <h2 className="text-2xl font-bold text-gray-200">✖️ No Post Yet</h2>
          <p className="text-gray-500 mt-2">
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

      <div className="max-w-2xl mx-auto py-6 space-y-6 pb-20">
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
            />

            {index === 0 && suggestedUsers.length > 0 && (
              <SuggestedUsers
                users={suggestedUsers}
                onFollow={handleSuggestedUserFollow}
              />
            )}
          </div>
        ))}
        {!selectedPostId && feedMeta.loadingMore && <p className="text-center text-gray-400">Loading more posts...</p>}
      </div>
    </div>
  );
}

export default Home;
