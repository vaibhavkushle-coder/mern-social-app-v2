import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  sendMessage,
  getMessages,
  markMessageAsSeen,
  deleteMessageForMe,
  deleteMessageForEveryone,
  editMessage,
} from "../../services/messageService";
import { useUser } from "../../hooks/useUser";
import { getProfileById } from "../../services/userService";
import {
  FiArrowLeft,
  FiMoreVertical,
  FiTrash2,
  FiX,
  FiSmile,
  FiSend,
  FiCornerUpLeft,
  FiCheck,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../hooks/useSocket";
import { useToast } from "../../hooks/useToast";
import EmojiPicker from "emoji-picker-react";
import { useConversation } from "../../hooks/useConversation";

function Chat() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [editingMessage, setEditingMessage] = useState(null);
  const [chatUser, setChatUser] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(true);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyMessage, setReplyMessage] = useState(null);
  const [swipingMessageId, setSwipingMessageId] = useState(null);
  const [swipeX, setSwipeX] = useState(0);

  const { id } = useParams();

  const { fetchConversations, setConversations } = useConversation();

  const { user } = useUser();
  const { showToast } = useToast();
  const { socket, onlineUsers, lastSeenUsers } = useSocket();
  const isOnline = onlineUsers.includes(chatUser?._id);

  const typingTimer = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  const touchStartX = useRef(null);
  const touchCurrentX = useRef(null);

  const touchStartY = useRef(null);
  const touchCurrentY = useRef(null);

  const longPressTimer = useRef(null);
  const longPressed = useRef(false);

  const navigate = useNavigate();

  const selectedMessage = messages.find(
    (message) => message._id === selectedMessageIds[0],
  );

  const canEditMessage =
    selectedMessageIds.length === 1 &&
    selectedMessage?.sender?._id === user?._id &&
    !!selectedMessage?.text &&
    !selectedMessage?.post;

  useEffect(() => {
    const setAppHeight = () => {
      const height = window.visualViewport?.height || window.innerHeight;

      document.documentElement.style.setProperty("--app-height", `${height}px`);

      requestAnimationFrame(() => {
        const container = messagesContainerRef.current;

        if (container) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth",
          });
        }
      });
    };

    setAppHeight();

    window.visualViewport?.addEventListener("resize", setAppHeight);

    return () => {
      window.visualViewport?.removeEventListener("resize", setAppHeight);
    };
  }, []);

  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;

    body.style.overflow = "hidden";
    html.style.overflow = "hidden";

    return () => {
      body.style.overflow = "";
      html.style.overflow = "";
    };
  }, []);

  function handleSelectMessage(messageId) {
    setSelectedMessageIds((prev) =>
      prev.includes(messageId)
        ? prev.filter((id) => id !== messageId)
        : [...prev, messageId],
    );
  }

  function handleLongPressMessage(messageId) {
    if (selectMode) return;

    setSelectMode(true);
    setSelectedMessageIds([messageId]);
  }

  useEffect(() => {
    async function handleChatOpen() {
      await fetchMessages();
      await markMessageAsSeen(id);
      await fetchConversations();

      socket.emit("message-seen", {
        senderId: id,
      });
    }
    handleChatOpen();
    fetchChatUser();
  }, [id, user?._id]);

  useEffect(() => {
    async function handleReceiveMessage(message) {
      setMessages((prev) => [...prev, message]);

      if (message.sender._id === id) {
        await markMessageAsSeen(id);

        socket.emit("message-seen", {
          senderId: id,
        });
      }
    }

    function handleTyping({ senderId }) {
      if (senderId === id) {
        setIsTyping(true);
      }
    }

    function handleStopTyping({ senderId }) {
      if (senderId === id) {
        setIsTyping(false);
      }
    }

    function handleMessageSeen({ receiverId }) {
      if (receiverId === id) {
        setMessages((prev) =>
          prev.map((message) => {
            if (message.sender._id === user?._id) {
              return {
                ...message,
                seen: true,
              };
            }

            return message;
          }),
        );
      }
    }

    function handlePostDeleted({ postId }) {
      setMessages((prevMessages) =>
        prevMessages.map((message) => {
          if (message.post?._id === postId) {
            return {
              ...message,
              post: null,
            };
          }

          return message;
        }),
      );
    }

    function handleMessageDeletedForEveryone({ messageId }) {
      setMessages((prev) =>
        prev.map((message) =>
          message._id === messageId
            ? { ...message, isDeletedForEveryone: true }
            : message,
        ),
      );
    }

    function handleMessageEdited(updatedMessage) {
      setMessages((prev) =>
        prev.map((message) =>
          message._id === updatedMessage._id ? updatedMessage : message,
        ),
      );
    }

    socket.on("post-deleted", handlePostDeleted);
    socket.on("receive-message", handleReceiveMessage);
    socket.on("typing", handleTyping);
    socket.on("stop-typing", handleStopTyping);
    socket.on("message-seen", handleMessageSeen);
    socket.on("message-deleted-for-everyone", handleMessageDeletedForEveryone);
    socket.on("message-edited", handleMessageEdited);

    return () => {
      socket.off("receive-message", handleReceiveMessage);
      socket.off("typing", handleTyping);
      socket.off("stop-typing", handleStopTyping);
      socket.off("message-seen", handleMessageSeen);
      socket.off("post-deleted", handlePostDeleted);
      socket.off(
        "message-deleted-for-everyone",
        handleMessageDeletedForEveryone,
      );
      socket.off("message-edited", handleMessageEdited);

      clearTimeout(typingTimer.current);
    };
  }, [id, user?._id]);

  useEffect(() => {
    const container = messagesContainerRef.current;

    if (!container) return;

    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }, [messages]);

  async function fetchMessages() {
    try {
      setLoadingMessage(true);
      const response = await getMessages(id);
      setMessages(response.data.messages);
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingMessage(false);
    }
  }

  async function handleSend() {
    try {
      if (!text.trim() || sending) {
        return;
      }

      setSending(true);

      if (editingMessage) {
        const response = await editMessage(editingMessage._id, text);

        setMessages((prev) =>
          prev.map((message) =>
            message._id === editingMessage._id
              ? response.data.message
              : message,
          ),
        );

        setEditingMessage(null);
        setText("");

        inputRef.current?.focus();
        showToast("Edited successfully", "success");

        return;
      }

      const response = await sendMessage(
        id,
        text,
        null,
        replyMessage?._id || null,
      );

      const newMessage = response.data.message;

      setMessages((prev) => [...prev, response.data.message]);

      setConversations((prev) => {
        const existingConversation = prev.find(
          (conversation) => conversation.user._id === id,
        );

        if (existingConversation) {
          return [
            {
              ...existingConversation,
              lastMessage: newMessage.text,
              lastMessageTime: newMessage.createdAt,
              lastMessageId: newMessage._id,
            },
            ...prev.filter((conversation) => conversation.user._id !== id),
          ];
        }

        return [
          {
            user: chatUser,
            lastMessage: newMessage.text,
            lastMessageTime: newMessage.createdAt,
            lastMessageId: newMessage._id,
            unreadCount: 0,
          },
          ...prev,
        ];
      });

      setText("");
      setReplyMessage(null);

      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    } catch (error) {
      console.log(error);
      showToast("Failed to send message", "error");
    } finally {
      setSending(false);
    }
  }

  async function fetchChatUser() {
    try {
      const response = await getProfileById(id);
      setChatUser(response.data.user);
    } catch (error) {
      console.log(error);
    }
  }

  function handleBack() {
    navigate(-1);
  }

  async function handleDeleteForMe() {
    if (selectedMessageIds.length === 0) return;

    try {
      setDeleting(true);
      for (const messageId of selectedMessageIds) {
        await deleteMessageForMe(messageId);
      }

      setMessages((prev) =>
        prev.filter((message) => !selectedMessageIds.includes(message._id)),
      );

      setShowDeleteConfirm(false);
      setSelectMode(false);
      setSelectedMessageIds([]);
    } catch (error) {
      console.log(error);
      showToast("Failed to delete messages", "error");
    }
    setDeleting(false);
  }

  const canDeleteForEveryone = selectedMessageIds.every((messageId) => {
    const message = messages.find((msg) => msg._id === messageId);

    return message?.sender?._id === user?._id;
  });

  async function handleDeleteForEveryone() {
    if (selectedMessageIds.length === 0) return;

    try {
      setDeleting(true);
      for (const messageId of selectedMessageIds) {
        await deleteMessageForEveryone(messageId);
      }

      setMessages((prev) =>
        prev.map((message) =>
          selectedMessageIds.includes(message._id)
            ? { ...message, isDeletedForEveryone: true }
            : message,
        ),
      );

      setShowDeleteConfirm(false);
      setSelectMode(false);
      setSelectedMessageIds([]);
    } catch (error) {
      console.log(error);
      showToast("Failed to delete messages", "error");
    } finally {
      setDeleting(false);
    }
  }

  function handleReplySelectedMessage() {
    if (selectedMessageIds.length !== 1) return;

    const messageId = selectedMessageIds[0];

    const message = messages.find((msg) => msg._id === messageId);

    if (!message) return;

    setReplyMessage(message);
    setSelectMode(false);
    setSelectedMessageIds([]);
    inputRef.current?.focus();
  }

  function handleStartEdit(message) {
    setEditingMessage(message);
    setText(message.text);
    inputRef.current?.focus();
  }

  function formatLastSeen(lastSeen) {
    if (!lastSeen || typeof lastSeen === "object") {
      return "";
    }

    const date = new Date(lastSeen);

    if (isNaN(date.getTime())) {
      return "";
    }

    const now = new Date();

    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const time = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (isToday) {
      return `Last seen today at ${time}`;
    }

    return `Last seen on ${date.toLocaleDateString()} at ${time}`;
  }
  return (
    <div
      className="fixed inset-x-0 top-0 w-full
  bg-black overflow-hidden overscroll-none"
      style={{ height: "var(--app-height)" }}
    >
      <div
        className="w-full max-w-2xl mx-auto h-full
     flex flex-col bg-black text-white overflow-hidden
     shadow-2xl shadow-black/30"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(139, 92, 246, 0.5) transparent",
        }}
        onClick={() => {
          setShowMenu(false);
          setShowEmojiPicker(false);
        }}
      >
        {editingMessage ? (
          <div
            className="flex items-center justify-between
        p-4 border-b border-white/10 bg-black/40 backdrop-blur-md 
        shadow-lg sticky top-0 z-10"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="w-10 h-10  rounded-full bg-blue-500/20
            text-blue-400 flex items-center justify-center shrink-0"
              >
                ✏️
              </span>

              <div>
                <h2 className="font-semibold text-base text-white">
                  Editing message
                </h2>

                <p
                  className="text-xs text-gray-400
              truncate max-w-[220px]"
                >
                  {editingMessage.text}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setEditingMessage(null);
                setText("");
                inputRef.current?.focus();
              }}
              className="w-9 h-9 flex items-center justify-center 
            rounded-full text-gray-500 hover:bg-gray-100
            hover:text-blak transition text-2xl"
            >
              <FiX size={21} />
            </button>
          </div>
        ) : selectMode ? (
          <div
            className="flex items-center gap-3 px-4 py-3
 border-b border-white/10 bg-black
 backdrop-blur-xl sticky top-0 z-10"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <FiArrowLeft
                size={24}
                onClick={() => {
                  setSelectMode(false);
                  setSelectedMessageIds([]);
                }}
                className="cursor-pointer text-gray-600"
              />

              <div className="flex items-center gap-2 shrink-0">
                <div
                  className="w-9 h-9 rounded-xl bg-violet-500/10
                text-violet-400 border-violet-500/20
                 flex items-center justify-center
              font-bold text-sm border-2"
                >
                  {selectedMessageIds.length}
                </div>
                <h1 className="text-base font-bold text-white whitespace-nowrap">
                  Selected
                </h1>
              </div>
            </div>

            {canEditMessage && (
              <button
                onClick={() => {
                  const selectedMessage = messages.find(
                    (message) => message._id === selectedMessageIds[0],
                  );

                  if (selectedMessage) {
                    handleStartEdit(selectedMessage);
                    setSelectMode(false);
                    setSelectedMessageIds([]);
                  }
                }}
                className="px-3 py-2 text-sm font-semibold
              text-white bg-blue-500 rounded-xl hover:bg-blue-600
              active:scale-95 transition shrink-0 hower:bg-blur-600"
              >
                ✏️ Edit
              </button>
            )}

            {selectedMessageIds.length === 1 && (
              <button
                onClick={handleReplySelectedMessage}
                className="w-9 h-9 rounded-full
              flex items-center justify-center
              text-blue-600 hover:bg-blue-50 
              active:scale-95 transition-all duration-200"
                title="Reply"
              >
                <FiCornerUpLeft size={20} />
              </button>
            )}

            <div className="flex gap-4">
              {selectedMessageIds.length > 0 && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-10 h-10 rounded-full flex items-center justify-center
                text-red-500 hover:bg-red-50 active:scale-95 transtion
                border border-gray-200 shadow-sm"
                  title="Delete"
                >
                  <FiTrash2 size={21} />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div
            className="flex items-center justify-between px-5 py-2
         border-b border-white/10 bg-[#151821]/80 backdrop-blur-xl
         sticky top-0 z-10"
          >
            <div className="flex items-center gap-2">
              <FiArrowLeft
                size={24}
                onClick={handleBack}
                className="cursor-pointer text-gray-400
          hover:text-white hover:bg-white/10 rounded-full
          p-1 transition-all duration-200"
              />

              {chatUser?.profilePic ? (
                <img
                  src={chatUser?.profilePic}
                  alt={chatUser?.name}
                  className="w-11 h-11 rounded-full object-cover
          border-2 border-white/10 shadow-lg"
                />
              ) : (
                <div
                  className="w-11 h-11 rounded-full 
          bg-gradient-to-br from-violet-500 to-purple-700
           flex items-center justify-center
          text-white font-semibold text-lg 
          shadow-lg"
                >
                  {chatUser?.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <div
                className="cursor-pointer"
                onClick={() => navigate(`/profile/${chatUser._id}`)}
              >
                <h2 className="font-semibold  text-[16px] text-white">
                  {chatUser?.name || "Loading..."}
                </h2>

                <p
                  className={`text-sm ${
                    isOnline ? "text-emerald-400" : "text-gray-500"
                  }`}
                >
                  {isOnline
                    ? "● Online"
                    : lastSeenUsers[chatUser?._id]
                      ? formatLastSeen(lastSeenUsers[chatUser._id])
                      : chatUser?.lastSeen &&
                          typeof chatUser.lastSeen !== "object"
                        ? formatLastSeen(chatUser.lastSeen)
                        : "● Offline"}
                </p>
              </div>
            </div>

            <div className="ml-auto relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu((prev) => !prev);
                }}
                className="w-10 h-10 rounded-full flex
items-center justify-center text-gray-400
hover:text-white hover:bg-white/10
active:scale-95 transition-all duration-200
border border-white/10"
              >
                <FiMoreVertical size={20} />
              </button>

              {showMenu && (
                <div
                  className="absolute right-0 top-12
bg-[#1b1e27] border border-white/10
rounded-xl shadow-2xl shadow-black/30
z-50 overflow-hidden"
                >
                  <button
                    onClick={() => {
                      setSelectMode(true);
                      setShowMenu(false);
                      setSelectedMessageIds([]);
                    }}
                    className="px-5 py-3 text-sm font-semibold
                  text-gray-200 hover:bg-white/10 whitespace-nowrap
                  transition"
                  >
                    Select
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div
          ref={messagesContainerRef}
          className={`flex-1 overflow-y-auto px-5 py-5
         space-y-2 scroll-smooth  scrollbar-thin
       bg-[linear-gradient(rgba(5,7,15,0.45),rgba(5,7,15,0.45)),url('/images/chat-bg.png.jpeg')]
        bg-cover bg-center  ${editingMessage ? "blur-sm pointer-events-none" : ""}`}
        >
          {loadingMessage ? (
            <div
              className="h-full flex items-center
          justify-center text-gray-400"
            >
              <p>Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <div
                className="w-16 h-16 mb-4 rounded-2xl
    bg-white/10 backdrop-blur-md
    border border-white/10
    flex items-center justify-center
    text-3xl shadow-xl"
              >
                💬
              </div>

              <h3 className="text-base font-semibold text-white">
                No messages yet
              </h3>

              <p className="text-sm text-gray-400 mt-1">
                Start a conversation with {chatUser?.name || "them"} 👋
              </p>

              <p className="text-xs text-gray-500 mt-2">
                Send a message to get started
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message._id}
                onClick={() => {
                  if (longPressed.current) {
                    longPressed.current = false;
                    return;
                  }

                  if (selectMode) {
                    handleSelectMessage(message._id);
                    return;
                  }
                }}
                onPointerDown={() => {
                  longPressed.current = false;

                  longPressTimer.current = setTimeout(() => {
                    longPressed.current = true;
                    handleLongPressMessage(message._id);
                  }, 600);
                }}
                onTouchStart={(e) => {
                  touchStartX.current = e.touches[0].clientX;
                  touchCurrentX.current = e.touches[0].clientX;

                  touchStartY.current = e.touches[0].clientY;
                  touchCurrentY.current = e.touches[0].clientY;
                }}
                onTouchMove={(e) => {
                  touchCurrentX.current = e.touches[0].clientX;
                  touchCurrentY.current = e.touches[0].clientY;

                  clearTimeout(longPressTimer.current);

                  const distanceX = touchCurrentX.current - touchStartX.current;

                  const distanceY = touchCurrentY.current - touchStartY.current;

                  if (Math.abs(distanceY) > 15) {
                    setSwipingMessageId(null);
                    setSwipeX(0);
                    return;
                  }

                  if (
                    distanceX > 30 &&
                    Math.abs(distanceX) > Math.abs(distanceY) * 2
                  ) {
                    setSwipingMessageId(message._id);
                    setSwipeX(Math.min(distanceX, 80));
                  }
                }}
                onPointerUp={() => {
                  clearTimeout(longPressTimer.current);
                }}
                onTouchEnd={() => {
                  const distanceX = touchCurrentX.current - touchStartX.current;

                  const distanceY = touchCurrentY.current - touchStartY.current;

                  const isValidReplySwipe =
                    distanceX > 70 && Math.abs(distanceY) <= 15;

                  if (isValidReplySwipe) {
                    const messageToReply = messages.find(
                      (msg) => msg._id === message._id,
                    );

                    if (messageToReply) {
                      setReplyMessage(messageToReply);

                      setTimeout(() => {
                        inputRef.current?.focus();
                      }, 0);
                    }
                  }

                  setSwipeX(0);
                  setSwipingMessageId(null);

                  touchStartX.current = null;
                  touchCurrentX.current = null;

                  touchStartY.current = null;
                  touchCurrentY.current = null;
                }}
                onPointerLeave={() => {
                  clearTimeout(longPressTimer.current);
                }}
                className={`flex ${
                  message.sender._id === user?._id
                    ? "justify-end"
                    : "justify-start"
                } ${
                  selectedMessageIds.includes(message._id)
                    ? "bg-violet-500/10 rounded-xl ring-2 ring-violet-500/60"
                    : ""
                }`}
                style={{
                  transform:
                    swipingMessageId === message._id
                      ? `translateX(${swipeX}px)`
                      : "translateX(0)",
                  transition:
                    swipingMessageId === message._id
                      ? "none"
                      : "transform 0.2s ease",
                }}
              >
                {swipingMessageId === message._id && swipeX > 20 && (
                  <div
                    className="flex items-center justify-center
                w-10 h-10 rounded-full bg-blue-500 
                text-white shrink-0"
                  >
                    ↩
                  </div>
                )}
                <div
                  className={`w-full flex flex-col 
                ${
                  message.sender._id === user?._id ? "items-end" : "items-start"
                }`}
                >
                  <div
                    className={`max-w-[70%] break-words px-2.5 py-1
                   rounded-2xl shadow-md transition-all duration-200 ${
                     message.sender._id === user?._id
                       ? "bg-gradient-to-br from-violet-600/95 to-purple-700/95 backdrop-blur-md text-white rounded-br-md border border-violet-400/20 shadow-lg shadow-violet-900/20"
                       : "bg-[#171a24]/90 backdrop-blur-md text-gray-100 rounded-bl-md border border-white/10 shadow-lg"
                   }
                   ${
                     selectedMessageIds.includes(message._id)
                       ? "ring-2 ring-violet-400 ring-offset-2 ring-offset-[#0f1117]"
                       : ""
                   }`}
                  >
                    {message.isDeletedForEveryone ? (
                      <p className="italic text-sm opacity-70">
                        {message.sender._id === user?._id
                          ? "You deleted this message"
                          : "This message was deleted"}
                      </p>
                    ) : (
                      <>
                        {message.replyTo && (
                          <div
                            className={`mb-2 px-3 py-2 rounded-lg border-l-4 ${
                              message.sender._id === user?._id
                                ? "bg-white/10 border-blue-300"
                                : "bg-black/5 border-blue-500"
                            }`}
                          >
                            <p
                              className={`text-xs font-semibold ${
                                message.sender._id === user?._id
                                  ? "text-blue-300"
                                  : "text-blue-600"
                              }`}
                            >
                              {message.replyTo.sender?.name}
                            </p>

                            <p
                              className={`text-xs truncate ${
                                message.sender._id === user?._id
                                  ? "text-gray-300"
                                  : "text-gray-600"
                              }`}
                            >
                              {message.replyTo.text || "Shared post"}
                            </p>
                          </div>
                        )}

                        {message.post ? (
                          <div
                            onClick={() => {
                              if (selectMode) return;
                              navigate("/", {
                                state: {
                                  postId: message.post._id,
                                },
                              });
                            }}
                            className="cursor-pointer
        bg-black/20 rounded-xl p-2.5
        border border-white/10
        hover:bg-black/30
        transition-all duration-200
        hover:scale-[1.01] overflow-hidden"
                          >
                            {message.post.image && (
                              <img
                                src={message.post.image}
                                alt="Shared post"
                                className="w-full max-w-[240px] max-h-60
            object-cover rounded-lg border border-white/10"
                              />
                            )}

                            {message.post.caption && (
                              <p className="mt-2 text-sm">
                                {message.post.caption}
                              </p>
                            )}

                            <div className="flex items-center justify-between mt-2">
                              <p className="text-sm text-gray-300">
                                📌 Shared post
                              </p>

                              <span className="text-xs text-blue-400">
                                View post →
                              </span>
                            </div>
                          </div>
                        ) : message.text.includes("Shared a post") ? (
                          <div className="bg-gray-200 rounded-xl p-3 text-sm text-gray-500">
                            📌 This post is no longer available
                          </div>
                        ) : message.text ? (
                          <p className="text-[15px] leading-relaxed">
                            {message.text}
                          </p>
                        ) : null}
                      </>
                    )}

                    <div
                      className={`flex justify-end items-center gap-1 mt-1
  ${message.sender._id === user?._id ? "text-gray-400" : "text-gray-500"}`}
                    >
                      {message.edited && (
                        <span className="text-[9px] italic text-blue-400">
                          Edited
                        </span>
                      )}

                      <span className="text-[10px]">
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>

                      {message.sender._id === user?._id && (
                        <span
                          className={`text-[11px]
      ${message.seen ? "text-blue-400" : "text-gray-400"}`}
                        >
                          {message.seen ? "✓✓" : "✓"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          <div />
        </div>
        {isTyping && (
          <div className="px-4 pb-3">
            <div
              className="inline-flex items-center gap-2
bg-[#1b1e27] text-gray-400
border border-white/5
px-4 py-2.5 rounded-2xl
text-sm shadow-sm"
            >
              <span
                className="w-2 h-2 bg-violet-500
            rounded-full animate-bounce"
              ></span>

              <span
                className="w-2 h-2 bg-violet-500 
            rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              ></span>

              <span
                className="w-2 h-2 bg-violet-500
            rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              ></span>
              <span>{chatUser?.name} is typing...</span>
            </div>
          </div>
        )}

        {replyMessage && (
          <div className="px-4 pt-3 bg-gray-900 border-t">
            <div
              className="flex items-center justify-between
      bg-gray-800 rounded-xl px-3 py-2
      border-l-4 border-blue-500"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-blue-600">
                  Replying to {replyMessage.sender?.name}
                </p>

                <p className="text-sm text-gray-200 truncate">
                  {replyMessage.text || "Shared post"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setReplyMessage(null);
                  inputRef.current?.focus();
                }}
                className="w-7 h-7 rounded-full
        flex items-center justify-center
        text-gray-500 hover:bg-gray-200
        hover:text-gray-900 transition"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="relative shrink-0 px-3 mb-2">
          <div
            className="flex items-center gap-1.5 w-full
        px-2 py-1 bg-[#1b1e27] border border-white/10
        rounded-full shadow-lg shadow-black/20
        focus-within:border-violet-500/50 transition-all
        duration-200"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowEmojiPicker((prev) => !prev);
              }}
              className="w-10 h-10 shrink-0 rounded-full
  flex items-center justify-center text-xl
  text-gray-400 hover:text-violet-400 active:scale-90
  hover:bg-white/5 transition-all duration-200"
            >
              <FiSmile size={21} />
            </button>

            {showEmojiPicker && (
              <div
                className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <EmojiPicker
                  onEmojiClick={(emojiObject) => {
                    setText((prev) => prev + emojiObject.emoji);
                    setShowEmojiPicker(false);
                    inputRef.current?.focus();
                  }}
                  theme="dark"
                  width={Math.min(300, window.innerWidth - 32)}
                  height={380}
                />
              </div>
            )}

            <textarea
              ref={inputRef}
              placeholder={
                editingMessage ? "Edit message..." : "Enter message..."
              }
              value={text}
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();

                  handleSend();

                  socket.emit("stop-typing", {
                    receiverId: id,
                  });
                }
              }}
              onChange={(e) => {
                const value = e.target.value;

                setText(value);

                clearTimeout(typingTimer.current);

                if (value.trim()) {
                  socket.emit("typing", {
                    receiverId: id,
                  });

                  typingTimer.current = setTimeout(() => {
                    socket.emit("stop-typing", {
                      receiverId: id,
                    });
                  }, 1000);
                } else {
                  socket.emit("stop-typing", {
                    receiverId: id,
                  });
                }
              }}
              className="
    flex-1
    min-w-0
    resize-none
    overflow-y-auto
    bg-transparent
    border-none
    outline-none
    text-white
    placeholder-gray-500
    px-2
    py-2
    text-[15px]
    leading-5
    focus:ring-0
    max-h-28
  "
            />

            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className={`w-10 h-10 shrink-0 rounded-full
              flex items-center justify-center transition-all
              duration-200
${
  text.trim() && !sending
    ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500 hover:shadow-lg hover:shadow-violet-500/30 cursor-pointer active:scale-95"
    : "bg-[#292d38] text-gray-500 cursor-not-allowed"
}`}
            >
              {sending ? (
                <span className="">...</span>
              ) : editingMessage ? (
                <FiCheck size={21} />
              ) : (
                <FiSend size={21} />
              )}
            </button>
          </div>
        </div>

        {showDeleteConfirm && (
          <div
            className="fixed inset-0 bg-black/70 flex 
          backdrop-blur-sm
        items-center justify-center z-50 px-4"
          >
            <div
              className="w-full max-w-sm
bg-[#1b1e27] border border-white/10
rounded-2xl p-6
shadow-2xl shadow-black/40"
            >
              <h2 className="text-lg font-bold text-white">Delete message?</h2>

              <p className="text-sm text-gray-400 mt-2">
                what do you want to do with the selected message?
              </p>

              <div className="flex flex-col gap-2 mt-6">
                <button
                  onClick={handleDeleteForMe}
                  disabled={deleting}
                  className="w-full px-4 py-2.5
rounded-xl bg-white/5 text-gray-200
border border-white/10
font-semibold hover:bg-white/10 transition"
                >
                  {deleting ? "Deleting..." : "Delete for me"}
                </button>

                {canDeleteForEveryone && (
                  <button
                    onClick={handleDeleteForEveryone}
                    disabled={deleting}
                    className="w-full px-4 py-2.5 rounded-xl
              bg-red-500 text-white font-semibold 
              hover:bg-red-600 transition"
                  >
                    {deleting ? "Deleting..." : "Delete for everyone"}
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl
              text-gray-400 font-semibold hover:bg-white/5
              hover:text-white
              transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Chat;
