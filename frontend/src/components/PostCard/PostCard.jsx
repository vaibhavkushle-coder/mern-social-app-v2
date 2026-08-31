import { useState, useRef, useEffect } from "react";
import { getPostLikes } from "../../services/postService";
import { useNavigate } from "react-router-dom";
import {
  FiMoreHorizontal,
  FiHeart,
  FiMessageCircle,
  FiSend,
  FiMoreVertical,
  FiBookmark,
  FiSearch,
  FiUser,
  FiFlag,
  FiLink,
  FiEdit3,
  FiTrash2,
} from "react-icons/fi";
import { FaBookmark } from "react-icons/fa";
import { FaHeart } from "react-icons/fa";
import { useUser } from "../../hooks/useUser";
import { Link } from "react-router-dom";
import EditPostModal from "../EditPostModal/EditPostModal";
import getTimeAgo from "../../utils/getTimeAgo";
import { savePost, unsavePost, searchUsers } from "../../services/userService";
import { sendMessage, getConversations } from "../../services/messageService";
import { useToast } from "../../hooks/useToast";
import { reportPost } from "../../services/reportService";
import { useSocket } from "../../hooks/useSocket";
import { useConversation } from "../../hooks/useConversation";

function PostCard({
  post,
  onLike,
  onUnlike,
  onComment,
  onDelete,
  onCommentDelete,
  onEditComment,
  onEditPost,
}) {
  const [comment, setComment] = useState("");
  const [editText, setEditText] = useState("");
  const [caption, setCaption] = useState("");
  const [shareSearch, setShareSearch] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [openPostMenuId, setOpenPostMenuId] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [shareUsers, setShareUsers] = useState([]);
  const [likes, setLikes] = useState([]);
  const [sendingComment, setSendingComment] = useState(false);
  const [savingComment, setSavingComment] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [showLikes, setShowLikes] = useState(false);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isSave, setIsSave] = useState(false);
  const [savingPost, setSavingPost] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [loadingShareUsers, setLoadingShareUsers] = useState(false);

  const navigate = useNavigate();

  const textareaRef = useRef(null);
  const likeAnimationTimeout = useRef(null);
  const likeAnimationRef = useRef(null);
  const { onlineUsers } = useSocket();

  const { user } = useUser();
  const { showToast } = useToast();
  const { fetchConversations } = useConversation();

  const userId = user?._id;

  const isLiked = post.likes.some(
    (likeUser) => likeUser._id.toString() === userId,
  );

  const currentUserLike = post.likes.find(
    (likeUser) => likeUser._id.toString() === userId,
  );

  const firstLikeUser = currentUserLike || post.likes[0];

  const otherLikesCount = post.likes.length - 1;

  const CAPTION_LIMIT = 50;

  const captionText = post.caption || "";

  const shouldShowMore = captionText.length > CAPTION_LIMIT;

  const displayedCaption =
    showFullCaption || !shouldShowMore
      ? captionText
      : captionText.slice(0, CAPTION_LIMIT);

  useEffect(() => {
    if (!user?.savedPosts || !post?._id) return;

    const alreadySaved = user.savedPosts.some(
      (savedPost) =>
        (savedPost._id || savedPost).toString() === post._id.toString(),
    );

    setIsSave(alreadySaved);
  }, [user, post?._id]);

  function handleShowCaption() {
    setShowFullCaption(true);
  }

  function handleHideCaption() {
    setShowFullCaption(false);
  }

  function handleDoubleClick() {
    if (likeAnimationRef.current) {
      likeAnimationRef.current.classList.remove("heart-animation");

      void likeAnimationRef.current.offsetWidth;

      likeAnimationRef.current.classList.add("heart-animation");
    }

    setShowLikeAnimation(true);

    if (likeAnimationTimeout.current) {
      clearTimeout(likeAnimationTimeout.current);
    }
    likeAnimationTimeout.current = setTimeout(() => {
      setShowLikeAnimation(false);
    }, 800);

    if (!isLiked) {
      onLike(post._id);
    }
  }

  async function handleShowLikes(postId) {
    try {
      const response = await getPostLikes(postId);

      setLikes(response.data.likes);

      setShowLikes(true);
    } catch (error) {
      console.log(error);
    }
  }

  function handleCloseLikes() {
    setShowLikes(false);
    setLikes([]);
  }

  function handleCloseModal() {
    setIsClosing(true);

    setTimeout(() => {
      setEditingPost(null);
      setCaption("");
      setIsClosing(false);
    }, 350);
  }
  function handleEditClick(post) {
    setEditingPost(post);
    setCaption(post.caption);
    setOpenPostMenuId(null);
  }

  async function handleSaveEdit() {
    try {
      await onEditPost(post._id, caption);

      setIsClosing(true);

      setTimeout(() => {
        setEditingPost(null);
        setCaption("");
        setIsClosing(false);
      }, 350);
    } catch (error) {
      console.log(error);
    }
  }
  async function handleSaveBookmark() {
    if (savingPost) return;
    try {
      setSavingPost(true);
      if (isSave) {
        await unsavePost(post._id);
        setIsSave(false);
      } else {
        await savePost(post._id);
        setIsSave(true);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setSavingPost(false);
    }
  }
  async function handleShareSearch(value) {
    setShareSearch(value);

    if (!value.trim()) {
      setShareUsers([]);
      return;
    }
    try {
      const response = await searchUsers(value);
      console.log("SEARCH RESPONSE:", response.data);
      setShareUsers(response.data.usersWithFollowStatus || []);
    } catch (error) {
      console.log(error);
      setShareUsers([]);
    }
  }

  async function handleSendPost(shareUser) {
    try {
      await sendMessage(shareUser._id, "📷 Shared a post", post._id);

      showToast("Post shared successfully 📤", "success");

      setShareSearch("");
      setShareUsers([]);
      setShowShareModal(false);
      await fetchConversations();
    } catch (error) {
      console.log(error);
      showToast("Failed to share post", "error");
    }
  }

  async function handleOpenSharemodal() {
    setShowShareModal(true);

    try {
      setLoadingShareUsers(true);

      const response = await getConversations();

      setConversations(response.data.conversations || []);
    } catch (error) {
      console.log(error);
      setConversations([]);
    } finally {
      setLoadingShareUsers(false);
    }
  }

  async function handleSaveComment(commentId) {
    const trimmedText = editText.trim();

    if (!trimmedText || savingComment) return;

    try {
      setSavingComment(true);

      await onEditComment(post._id, commentId, trimmedText);

      setEditText("");
      setEditingCommentId(null);
    } finally {
      setSavingComment(false);
    }
  }

  return (
    <div
      id={`post-${post._id}`}
      className="max-w-xl mx-auto bg-[#0b0b1f] rounded-2xl
        shadow-lg border border-purple-900 overflow-hidden"
      onClick={() => setOpenPostMenuId(null)}
    >
      <div className="flex items-center justify-between px-3 py-3 bg-[#070719]">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate(`/profile/${post.user._id}`)}
        >
          {post.user?.profilePic ? (
            <img
              src={post.user?.profilePic}
              alt="profile"
              className="h-10 w-10 rounded-full object-cover border-2
              border-purple-500/50"
            />
          ) : (
            <div
              className="h-10 w-10 rounded-full
            bg-[#15152b] flex items-center justify-center
            text-purple-300 font-semibold border border border-purple-500/40"
            >
              {post.user?.name?.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold text-sm text-white">
              {post.user?.name || "Unknown User"}
            </p>

            <p className="text-[11px] text-gray-500 mt-0.5">
              {getTimeAgo(post.createdAt)}
            </p>
          </div>
        </div>

        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            className="w-8 h-8 text-gray-400
            flex items-center justify-center
            rounded-full hover:text-white 
            hover:bg-white/5 border border-gray-700 
            shadow-md 
         transition cursor-pointer"
            onClick={() => {
              setOpenPostMenuId(openPostMenuId === post._id ? null : post._id);
            }}
          >
            <FiMoreHorizontal />
          </button>
          {openPostMenuId === post._id && (
            <div
              className="absolute right-0 mt-2 w-48
    bg-[#101024] rounded-xl shadow-[0_10px_35px_rgba(0,0,0,0.45)] 
    border border-white/10
    py-1.5 z-50 overflow-hidden"
            >
              <Link
                to={`/profile/${post.user._id}`}
                onClick={() => setOpenPostMenuId(null)}
                className="flex items-center gap-3 w-full
      px-4 py-2.5 text-sm font-medium text-gray-300
      hover:bg-blue-50 hover:text-blue-600
      transition-all duration-200"
              >
                <FiUser size={18} />
                <span>View Profile</span>
              </Link>

              {userId === post.user._id && (
                <button
                  onClick={() => handleEditClick(post)}
                  className="flex items-center gap-3 w-full
        px-4 py-2.5 text-sm font-medium text-gray-300
        hover:bg-gray-100
        transition-all duration-200"
                >
                  <FiEdit3 size={18} />
                  <span>Edit Post</span>
                </button>
              )}

              {userId === post.user._id && (
                <button
                  onClick={() => onDelete(post._id)}
                  className="flex items-center gap-3 w-full
        px-4 py-2.5 text-sm font-medium text-red-500
        hover:bg-red-50
        transition-all duration-200"
                >
                  <FiTrash2 size={18} />
                  <span>Delete Post</span>
                </button>
              )}

              {userId !== post.user._id && (
                <button
                  onClick={async () => {
                    try {
                      await reportPost(post._id);

                      setOpenPostMenuId(null);

                      showToast("Post reported successfully 🚩", "success");
                    } catch (error) {
                      console.log(error);

                      if (error.response?.data?.message) {
                        showToast(error.response.data.message, "error");
                      } else {
                        showToast("Failed to report post 🚩", "error");
                      }
                    }
                  }}
                  className="flex items-center gap-3 w-full
        px-4 py-2.5 text-sm font-medium text-orange-500
        hover:bg-orange-50
        transition-all duration-200"
                >
                  <FiFlag size={18} />
                  <span>Report Post</span>
                </button>
              )}

              {userId !== post.user._id && (
                <button
                  onClick={async () => {
                    try {
                      const link = `${window.location.origin}/?post=${post._id}`;

                      await navigator.clipboard.writeText(link);

                      setOpenPostMenuId(null);

                      showToast("Post link copied 🔗", "success");
                    } catch (error) {
                      console.log(error);

                      showToast("Failed to copy link", "error");
                    }
                  }}
                  className="flex items-center gap-3 w-full
        px-4 py-2.5 text-sm font-medium text-gray-300
        hover:bg-gray-100
        transition-all duration-200"
                >
                  <FiLink size={18} />
                  <span>Copy Link</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        <img
          src={post.image}
          alt="post"
          onDoubleClick={handleDoubleClick}
          className={`w-full max-h-[550px] 
            object-contain bg-[#050514]
            transition-transform duration-300
            hover:scale-[1.01]
             ${showLikeAnimation ? "brightness-75" : ""}`}
        />
        {showLikeAnimation && (
          <FaHeart
            ref={likeAnimationRef}
            size={100}
            className="heart-animation absolute text-red-500 top-1/2 left-1/2
             -translate-x-1/2 -translate-y-1/2 pointer-events-none
              drop-shadow-[0_0_20px_rgba(255,0,0,0.8)]"
          />
        )}
      </div>

      <div className="flex items-center justify-between px-3 mt-2 text-gray-300">
        <div className="flex items-center gap-5">
          {isLiked ? (
            <button
              onClick={() => onUnlike(post._id)}
              className="text-purple-400 hover:scale-110 
              active:scale-90 transition-all hover:text-purple-300"
            >
              <FaHeart size={26} />
            </button>
          ) : (
            <button
              onClick={() => onLike(post._id)}
              className="hover:text-purple-400 hover:scale-110 active:scale-90 transition-all"
            >
              <FiHeart size={26} />
            </button>
          )}

          <div
            className="flex items-center gap-1
          cursor-pointer hover:text-purple-400"
          >
            <button
              onClick={() => setShowComments(true)}
              className="hover:scale-110 transition-all active:scale-90"
            >
              <FiMessageCircle size={26} />
            </button>
            <span
              className="font-semibold"
              onClick={() => setShowComments(true)}
            >
              {post.comments.length}
            </span>
          </div>

          <button
            onClick={handleOpenSharemodal}
            className="hover:scale-110 transition-all active:scale-90 hover:text-purple-400"
          >
            <FiSend size={24} />
          </button>
        </div>
        <button
          onClick={handleSaveBookmark}
          disabled={savingPost}
          className={`hover:scale-110 active:scale-90 transition-all
            ${isSave ? "text-purple-400" : "text-gray-300"}
            ${savingPost ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {isSave ? <FaBookmark size={24} /> : <FiBookmark size={24} />}
        </button>
      </div>

      <p
        onClick={() => handleShowLikes(post._id)}
        className="px-4  cursor-pointer hover:underline text-sm text-gray-300"
      >
        {post.likes.length === 0 ? (
          "Be the first to like this post"
        ) : post.likes.length === 1 ? (
          <>
            Liked by{" "}
            <span className="font-semibold">
              {isLiked ? "You" : firstLikeUser.name}
            </span>
          </>
        ) : (
          <>
            Liked by{" "}
            <span className="font-semibold">
              {isLiked ? "You" : firstLikeUser.name}
            </span>{" "}
            and {otherLikesCount} others...
          </>
        )}
      </p>

      <p className="px-4 mt-2 text-sm mb-1 text-gray-300">
        {displayedCaption}
        {shouldShowMore && !showFullCaption && (
          <>
            {" "}
            <span
              onClick={handleShowCaption}
              className="text-purple-400 cursor-pointer font-medium"
            >
              ...more
            </span>
          </>
        )}
        {showFullCaption && (
          <>
            {" "}
            <span
              onClick={handleHideCaption}
              className="text-purple-400 cursor-pointer font-medium "
            >
              ...less
            </span>
          </>
        )}
      </p>

      {showComments && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm
    flex items-center justify-center z-50
    modal-overlay p-3"
          onClick={() => {
            setShowComments(false);
            setOpenMenuId(null);
          }}
        >
          <div
            className="bg-[#0b0b1f] rounded-2xl
      w-[calc(100%-1.5rem)] max-w-sm
      h-[540px] max-h-[82vh]
      border border-purple-900/60
      shadow-2xl shadow-purple-950/30
      modal-content flex flex-col overflow-hidden"
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenuId(null);
            }}
          >
            {/* Header */}
            <div
              className="shrink-0 flex items-center
        justify-between px-4 py-3
        border-b border-gray-800
        bg-[#0f0f26]"
            >
              <h2
                className="text-base font-bold text-gray-100
          flex items-center gap-2.5"
              >
                <span
                  className="flex items-center justify-center
            w-9 h-9 rounded-lg
            bg-purple-600/15
            border border-purple-800/50
            text-purple-400"
                >
                  <FiMessageCircle size={17} />
                </span>
                Comments
              </h2>

              <button
                onClick={() => setShowComments(false)}
                className="w-8 h-8 flex items-center
          justify-center rounded-lg
          text-xl text-gray-500
          hover:bg-purple-950/40
          hover:text-purple-400
          active:scale-90
          transition-all duration-200"
              >
                ×
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-2">
              {post.comments.length === 0 ? (
                <div
                  className="h-full flex flex-col
            items-center justify-center
            text-center px-5"
                >
                  <div
                    className="w-16 h-16 rounded-full
              bg-purple-600/10
              border border-purple-900/50
              flex items-center justify-center"
                  >
                    <FiMessageCircle size={28} className="text-purple-500" />
                  </div>

                  <h3
                    className="text-base font-bold
              text-gray-200 mt-3"
                  >
                    No comments yet
                  </h3>

                  <p className="text-xs text-gray-500 mt-1">
                    Be the first to share your thoughts.
                  </p>
                </div>
              ) : (
                [...post.comments].reverse().map((comment) => (
                  <div
                    key={comment._id}
                    className="flex items-start gap-2.5
              p-2 rounded-lg
              hover:bg-[#101025]
              transition-colors duration-200
              relative"
                  >
                    {/* Profile */}
                    <div
                      className="shrink-0 cursor-pointer"
                      onClick={() => navigate(`/profile/${comment.user._id}`)}
                    >
                      {comment.user?.profilePic ? (
                        <img
                          src={comment.user.profilePic}
                          alt="profile"
                          className="w-9 h-9 rounded-full
                    object-cover
                    border border-purple-900/60"
                        />
                      ) : (
                        <div
                          className="w-9 h-9 rounded-full
                    bg-purple-600/20
                    border border-purple-800/60
                    text-purple-300
                    flex items-center justify-center
                    font-bold text-sm"
                        >
                          {comment.user?.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Comment Content */}
                    <div
                      className="flex-1 min-w-0
                bg-[#11112a]
                border border-gray-800
                rounded-xl px-3 py-2"
                    >
                      <div
                        className="flex justify-between
                  items-center relative"
                      >
                        <p
                          className="font-semibold
                    text-gray-200 text-sm truncate
                    cursor-pointer"
                          onClick={() =>
                            navigate(`/profile/${comment.user._id}`)
                          }
                        >
                          {comment.user.name}
                        </p>

                        {/* More Button */}
                        {userId === comment.user._id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(
                                openMenuId === comment._id ? null : comment._id,
                              );
                            }}
                            className="w-7 h-7
                      flex items-center justify-center
                      rounded-md
                      text-gray-500
                      hover:bg-purple-950/40
                      hover:text-purple-400
                      transition-all duration-200"
                          >
                            <FiMoreVertical size={16} />
                          </button>
                        )}

                        {/* Edit / Delete Menu */}
                        {openMenuId === comment._id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-8
                      w-32
                      bg-[#0f0f26]
                      rounded-lg
                      shadow-2xl
                      border border-gray-800
                      py-1 z-50 overflow-hidden"
                          >
                            <button
                              className="flex items-center gap-2
                        w-full px-3 py-2
                        text-xs font-medium
                        text-gray-300
                        hover:bg-[#171735]
                        hover:text-purple-400
                        transition-all duration-200"
                              onClick={() => {
                                setEditingCommentId(comment._id);
                                setEditText(comment.text);
                                setOpenMenuId(null);
                              }}
                            >
                              <FiEdit3 size={15} />
                              <span>Edit</span>
                            </button>

                            <button
                              className="flex items-center gap-2
                        w-full px-3 py-2
                        text-xs font-medium
                        text-red-400
                        hover:bg-red-950/30
                        transition-all duration-200"
                              onClick={() => {
                                onCommentDelete(post._id, comment._id);
                                setOpenMenuId(null);
                              }}
                            >
                              <FiTrash2 size={15} />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Edit Comment */}
                      {editingCommentId === comment._id ? (
                        <div className="mt-2">
                          <input
                            type="text"
                            value={editText}
                            className="w-full
                      bg-[#0b0b1f]
                      border border-gray-800
                      rounded-lg px-3 py-2
                      text-sm text-gray-200
                      placeholder:text-gray-500
                      outline-none
                      focus:border-purple-500
                      focus:ring-1
                      focus:ring-purple-500"
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSaveComment(comment._id);
                              }
                            }}
                          />

                          <div className="flex gap-2 mt-2">
                            <button
                              className="bg-purple-600
                        hover:bg-purple-500
                        text-white text-xs
                        px-3 py-1.5
                        rounded-lg
                        transition-all duration-200
                        disabled:opacity-50"
                              onClick={() => handleSaveComment(comment._id)}
                              disabled={savingComment}
                            >
                              {savingComment ? "Saving..." : "Save"}
                            </button>

                            <button
                              className="bg-[#1a1a35]
                        border border-gray-800
                        text-gray-400
                        hover:text-gray-200
                        text-xs px-3 py-1.5
                        rounded-lg
                        transition-all duration-200"
                              onClick={() => {
                                setEditText("");
                                setEditingCommentId(null);
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p
                          className="text-gray-400
                    mt-1 whitespace-pre-wrap
                    break-all text-xs
                    leading-relaxed pr-1"
                        >
                          {comment.text}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment Input */}
            <div
              className="shrink-0
        border-t border-gray-800
        bg-[#0f0f26] p-2.5"
            >
              <div
                className="flex items-end gap-2
          bg-[#11112a]
          rounded-xl
          border border-gray-800
          p-1.5
          focus-within:border-purple-500
          focus-within:ring-1
          focus-within:ring-purple-500/30
          transition-all duration-200"
              >
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={comment}
                  onChange={(e) => {
                    setComment(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height =
                      Math.min(e.target.scrollHeight, 120) + "px";
                  }}
                  className="flex-1
            bg-transparent border-none
            outline-none
            px-2 py-1.5
            text-sm text-gray-200
            placeholder:text-gray-600
            resize-none overflow-y-auto"
                  placeholder="Write a comment..."
                />

                <button
                  onClick={async () => {
                    const trimmedComment = comment.trim();

                    if (!trimmedComment || sendingComment) return;

                    try {
                      setSendingComment(true);

                      await onComment(post._id, trimmedComment);

                      setComment("");

                      if (textareaRef.current) {
                        textareaRef.current.style.height = "auto";
                        textareaRef.current.focus();
                      }
                    } finally {
                      setSendingComment(false);
                    }
                  }}
                  className="shrink-0 w-9 h-9
            rounded-lg
            bg-purple-600
            hover:bg-purple-500
            text-white
            flex items-center justify-center
            shadow-md shadow-purple-950/30
            hover:shadow-lg
            active:scale-95
            disabled:opacity-40
            disabled:cursor-not-allowed
            transition-all duration-200"
                  title={sendingComment ? "Posting..." : "Comment"}
                  disabled={!comment.trim() || sendingComment}
                >
                  {sendingComment ? (
                    <span className="text-xs font-bold">...</span>
                  ) : (
                    <FiSend size={16} />
                  )}
                </button>
              </div>

              <p
                className="text-[10px]
          text-gray-600 mt-1.5 mx-1"
              >
                Be respectful and keep the conversation friendly.
              </p>
            </div>
          </div>
        </div>
      )}

      {showShareModal && (
        <div
          onClick={() => setShowShareModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center
    bg-black/60 backdrop-blur-sm
    modal-overlay p-3"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b0b1f]
      rounded-2xl w-full max-w-sm
      h-[540px] max-h-[82vh]
      border border-purple-900/60
      shadow-2xl shadow-purple-950/30
      overflow-hidden flex flex-col modal-content"
          >
            {/* Header */}
            <div
              className="shrink-0 flex items-center justify-between
        px-4 py-3
        border-b border-gray-800
        bg-[#0f0f26]"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-lg
            bg-purple-600/15
            border border-purple-800/50
            text-purple-400
            flex items-center justify-center"
                >
                  <FiSend size={17} />
                </div>

                <div>
                  <h2 className="text-base font-bold text-gray-100">
                    Share Post
                  </h2>

                  <p className="text-[11px] text-gray-500">
                    Send this post to someone
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowShareModal(false)}
                className="w-8 h-8 flex items-center justify-center
          rounded-lg text-xl text-gray-500
          hover:bg-purple-950/40
          hover:text-purple-400
          active:scale-90
          transition-all duration-200"
              >
                ×
              </button>
            </div>

            {/* Search */}
            <div
              className="shrink-0 p-3
        border-b border-gray-800"
            >
              <div className="relative">
                <FiSearch
                  size={16}
                  className="absolute left-3.5 top-1/2
            -translate-y-1/2 text-gray-600"
                />

                {shareSearch && (
                  <button
                    onClick={() => handleShareSearch("")}
                    className="absolute right-2.5 top-1/2
              -translate-y-1/2 w-6 h-6 rounded-md
              flex items-center justify-center
              text-gray-500
              hover:bg-purple-950/40
              hover:text-purple-400
              transition-all"
                  >
                    ×
                  </button>
                )}

                <input
                  type="text"
                  value={shareSearch}
                  onChange={(e) => handleShareSearch(e.target.value)}
                  placeholder="Search people..."
                  className="w-full
            bg-[#11112a]
            rounded-lg
            py-2.5 pl-10 pr-9
            outline-none
            border border-gray-800
            text-sm text-gray-200
            placeholder:text-gray-600
            focus:border-purple-500
            focus:ring-1
            focus:ring-purple-500/30
            transition-all duration-200"
                />
              </div>
            </div>

            {/* Users / Conversations */}
            <div className="flex-1 overflow-y-auto p-2.5">
              {!shareSearch.trim() && (
                <p
                  className="text-[10px] font-semibold
            text-gray-600 uppercase
            tracking-wider px-2 mb-1.5"
                >
                  Recent conversations
                </p>
              )}

              {shareSearch.trim() ? (
                <>
                  {shareUsers.length > 0 ? (
                    shareUsers.map((shareUser) => (
                      <div
                        key={shareUser._id}
                        className="flex items-center gap-2.5
                  p-2.5 rounded-lg
                  hover:bg-[#11112a]
                  transition-all duration-200"
                      >
                        {/* Avatar */}
                        {shareUser.profilePic ? (
                          <img
                            src={shareUser.profilePic}
                            alt={shareUser.name}
                            className="w-9 h-9 rounded-full
                      object-cover
                      border border-purple-900/50"
                          />
                        ) : (
                          <div
                            className="w-9 h-9 rounded-full
                      bg-purple-600/20
                      border border-purple-800/60
                      text-purple-300
                      flex items-center justify-center
                      font-bold text-sm"
                          >
                            {shareUser.name?.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <p
                            className="font-semibold
                      text-gray-200 text-sm truncate"
                          >
                            {shareUser.name}
                          </p>

                          <p className="text-[11px] text-gray-600">
                            Share post
                          </p>
                        </div>

                        {/* Send */}
                        <button
                          onClick={() => handleSendPost(shareUser)}
                          className="shrink-0
                    px-3.5 py-1.5
                    rounded-lg
                    bg-purple-600
                    hover:bg-purple-500
                    text-white text-xs font-semibold
                    shadow-sm
                    active:scale-95
                    transition-all duration-200"
                        >
                          Send
                        </button>
                      </div>
                    ))
                  ) : (
                    <div
                      className="h-full flex flex-col
                items-center justify-center
                text-center px-5"
                    >
                      <div
                        className="w-14 h-14 rounded-full
                  bg-purple-600/10
                  border border-purple-900/50
                  flex items-center justify-center mb-3"
                      >
                        <FiSearch size={23} className="text-purple-500" />
                      </div>

                      <h3
                        className="font-semibold
                  text-gray-200 text-sm"
                      >
                        No users found
                      </h3>

                      <p className="text-xs text-gray-600 mt-1">
                        Try searching with another name.
                      </p>
                    </div>
                  )}
                </>
              ) : loadingShareUsers ? (
                <div className="h-full flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-full
                border-2 border-gray-800
                border-t-purple-500
                animate-spin"
                    />

                    <p className="text-xs text-gray-500">
                      Loading conversations...
                    </p>
                  </div>
                </div>
              ) : conversations.length > 0 ? (
                conversations.map((conversation) => {
                  const shareUser = conversation.user;

                  return (
                    <div
                      key={shareUser._id}
                      className="flex items-center gap-2.5
                p-2.5 rounded-lg
                hover:bg-[#11112a]
                transition-all duration-200"
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {shareUser.profilePic ? (
                          <img
                            src={shareUser.profilePic}
                            alt={shareUser.name}
                            className="w-9 h-9 rounded-full
                      object-cover
                      border border-purple-900/50"
                          />
                        ) : (
                          <div
                            className="w-9 h-9 rounded-full
                      bg-purple-600/20
                      border border-purple-800/60
                      text-purple-300
                      flex items-center justify-center
                      font-bold text-sm"
                          >
                            {shareUser.name?.charAt(0).toUpperCase()}
                          </div>
                        )}

                        {onlineUsers?.includes(shareUser._id) && (
                          <span
                            className="absolute bottom-0 right-0
                      w-2.5 h-2.5
                      bg-green-500
                      border-2 border-[#0b0b1f]
                      rounded-full"
                          />
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="font-semibold
                    text-gray-200 text-sm truncate"
                        >
                          {shareUser.name}
                        </p>

                        <p
                          className="text-[11px]
                    text-gray-600 truncate"
                        >
                          {conversation.lastMessage || "Start a conversation"}
                        </p>
                      </div>

                      {/* Send */}
                      <button
                        onClick={() => handleSendPost(shareUser)}
                        className="shrink-0
                  px-3.5 py-1.5
                  rounded-lg
                  bg-purple-600
                  hover:bg-purple-500
                  text-white text-xs font-semibold
                  shadow-sm
                  active:scale-95
                  transition-all duration-200"
                      >
                        Send
                      </button>
                    </div>
                  );
                })
              ) : (
                <div
                  className="h-full flex flex-col
            items-center justify-center
            text-center px-5"
                >
                  <div
                    className="w-16 h-16 rounded-full
              bg-purple-600/10
              border border-purple-900/50
              flex items-center justify-center mb-3"
                  >
                    <FiMessageCircle size={27} className="text-purple-500" />
                  </div>

                  <h3
                    className="text-base font-bold
              text-gray-200"
                  >
                    No conversations yet
                  </h3>

                  <p className="text-xs text-gray-600 mt-1">
                    Search for someone to share this post.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showLikes && (
        <div
          className="fixed inset-0 z-50 flex
    items-center justify-center
    bg-black/60 backdrop-blur-sm
    modal-overlay p-3"
          onClick={handleCloseLikes}
        >
          <div
            className="bg-[#0b0b1f] w-full max-w-sm
      h-[520px] max-h-[82vh]
      rounded-2xl
      border border-purple-900/60
      shadow-2xl shadow-purple-950/30
      overflow-hidden
      flex flex-col modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="shrink-0 flex items-center
        justify-between px-4 py-3
        border-b border-gray-800
        bg-[#0f0f26]"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-lg
            bg-purple-600/20
            border border-purple-800/60
            text-purple-400
            flex items-center justify-center"
                >
                  <FaHeart size={16} />
                </div>

                <div>
                  <h2 className="text-base font-bold text-gray-100">
                    Liked by
                  </h2>

                  <p className="text-xs text-gray-500">
                    {likes.length} {likes.length === 1 ? "like" : "likes"}
                  </p>
                </div>
              </div>

              <button
                onClick={handleCloseLikes}
                className="w-8 h-8 flex items-center
          justify-center rounded-lg
          text-lg text-gray-500
          hover:bg-purple-950/40
          hover:text-purple-400
          active:scale-90
          transition-all duration-200"
              >
                ×
              </button>
            </div>

            {/* Likes List */}
            <div className="flex-1 overflow-y-auto p-2">
              {likes.length === 0 ? (
                <div
                  className="h-full flex flex-col
            items-center justify-center
            text-center px-5"
                >
                  <div
                    className="w-16 h-16 rounded-full
              bg-purple-600/10
              border border-purple-900/50
              flex items-center justify-center mb-3"
                  >
                    <FaHeart size={26} className="text-purple-500" />
                  </div>

                  <h3 className="text-base font-bold text-gray-200">
                    No likes yet
                  </h3>

                  <p className="text-xs text-gray-500 mt-1">
                    Be the first person to like this post.
                  </p>
                </div>
              ) : (
                likes.map((like) => (
                  <div
                    key={like._id}
                    onClick={() => navigate(`/profile/${like._id}`)}
                    className="flex items-center gap-3
              p-2.5 rounded-lg
              cursor-pointer
              hover:bg-[#11112a]
              active:bg-[#171735]
              transition-all duration-200"
                  >
                    {/* Profile Picture */}
                    {like.profilePic ? (
                      <img
                        src={like.profilePic}
                        alt="profile"
                        className="w-10 h-10 rounded-full
                  object-cover
                  border-2 border-purple-900/50
                  shadow-sm"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full
                  bg-purple-600/20
                  border border-purple-800/60
                  text-purple-300
                  flex items-center justify-center
                  font-bold text-base"
                      >
                        {like.name?.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-semibold
                  text-sm text-gray-200 truncate"
                      >
                        {like.name}
                      </p>

                      <p className="text-xs text-gray-500">View profile</p>
                    </div>

                    {/* Heart */}
                    <FiHeart size={14} className="text-purple-500 mr-1" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      <EditPostModal
        editingPost={editingPost}
        caption={caption}
        setCaption={setCaption}
        onClose={handleCloseModal}
        onSave={handleSaveEdit}
        isClosing={isClosing}
      />
    </div>
  );
}

export default PostCard;
