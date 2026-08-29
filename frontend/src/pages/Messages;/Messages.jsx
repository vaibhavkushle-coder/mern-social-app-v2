import { useState, useEffect, useRef } from "react";
import { deleteConversation } from "../../services/messageService";
import Navbar from "../../components/Navbar/Navbar";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../hooks/useSocket";
import {
  FiSearch,
  FiEdit3,
  FiMessageCircle,
  FiMoreVertical,
} from "react-icons/fi";
import getTimeAgo from "../../utils/getTimeAgo";
import { useConversation } from "../../hooks/useConversation";

function Messages() {
  const [search, setSearch] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { conversations, setConversations, fetchConversations } =
    useConversation();

  const navigate = useNavigate();
  const { socket, onlineUsers } = useSocket();

  const longPressTimer = useRef(null);
  const longPressed = useRef(false);

  function handleSelectCoversation(userId) {
    setSelectedIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  }

  async function handleDeleteConversation() {
    if (selectedIds.length === 0) return;

    try {
      for (const userId of selectedIds) {
        await deleteConversation(userId);
      }

      setConversations((prev) =>
        prev.filter(
          (conversation) => !selectedIds.includes(conversation.user._id),
        ),
      );

      setSelectedIds([]);
      setSelectMode(false);
    } catch (error) {
      console.log(error);
    }
  }

  function handleLongPress(userId) {
    if (selectMode) return;

    setSelectMode(true);
    setSelectedIds([userId]);
  }

  useEffect(() => {
    async function handleMessageDeletedForEveryone({ messageId }) {
      try {
        await fetchConversations();
      } catch (error) {
        console.log(error);
      }
    }

    socket.on("message-deleted-for-everyone", handleMessageDeletedForEveryone);

    return () => {
      socket.off(
        "message-deleted-for-everyone",
        handleMessageDeletedForEveryone,
      );
    };
  }, [socket, fetchConversations]);

  const filteredConversations = conversations.filter((conversation) =>
    conversation.user?.name?.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="min-h-screen bg-black text-white">
      <div
        className="max-w-2xl mx-auto min-h-screen
      bg-black
      border border-purple-500
      rounded-[24px]
      overflow-hidden
      shadow-2xl shadow-black/30"
      >
        <>
          <Navbar />
        </>

        {/* ================= HEADER ================= */}
        <div
          className="relative flex items-center justify-between
        px-5 pt-2 pb-5"
          onClick={() => setShowMenu(false)}
        >
          {selectMode ? (
            <>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl
                bg-purple-500/15
                border border-purple-400/20
                text-purple-300
                flex items-center justify-center
                font-bold text-sm"
                >
                  {selectedIds.length}
                </div>

                <h1 className="text-xl font-bold text-white">Selected</h1>
              </div>

              <div className="flex items-center gap-3">
                {selectedIds.length > 0 && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 text-sm font-semibold
                  bg-red-500/15
                  text-red-400
                  border border-red-500/20
                  hover:bg-red-500/25
                  rounded-xl
                  cursor-pointer
                  transition-all duration-200"
                  >
                    Delete
                  </button>
                )}

                <button
                  onClick={() => {
                    setSelectMode(false);
                    setSelectedIds([]);
                  }}
                  className="px-4 py-2 text-sm font-semibold
                text-gray-400
                bg-[#101426]
                border border-white/10
                hover:bg-[#171b32]
                hover:text-white
                rounded-xl
                cursor-pointer
                transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Logo + Title */}
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl
                bg-gradient-to-br
                from-blue-500 to-purple-600
                text-white
                flex items-center justify-center
                shadow-lg shadow-purple-500/25"
                >
                  <FiMessageCircle size={24} />
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-white leading-tight">
                    Messages
                  </h1>

                  <p className="text-sm text-gray-400 mt-1">
                    Your conversations
                  </p>
                </div>
              </div>

              {/* Header Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate("/search")}
                  className="w-11 h-11 rounded-full
                flex items-center justify-center
                bg-[#101426]
                border border-white/10
                text-purple-400
                hover:bg-[#171b32]
                hover:text-purple-300
                hover:border-purple-500/30
                active:scale-95
                transition-all duration-200"
                  title="New Message"
                >
                  <FiEdit3 size={21} />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu((prev) => !prev);
                  }}
                  className="w-11 h-11 rounded-full
                flex items-center justify-center
                bg-[#101426]
                border border-white/10
                text-purple-400
                hover:bg-[#171b32]
                hover:text-purple-300
                hover:border-purple-500/30
                active:scale-95
                transition-all duration-200"
                  title="More options"
                >
                  <FiMoreVertical size={21} />
                </button>
              </div>

              {/* More Menu */}
              {showMenu && (
                <div
                  className="absolute right-5 top-[82px]
                bg-[#101426]
                border border-white/10
                rounded-xl
                shadow-xl shadow-black/30
                z-50
                overflow-hidden"
                >
                  <button
                    onClick={() => {
                      setSelectMode(true);
                      setShowMenu(false);
                      setSelectedIds([]);
                    }}
                    className="px-5 py-3
                  text-sm font-semibold
                  text-gray-200
                  hover:bg-white/5
                  transition"
                  >
                    Select
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ================= SEARCH ================= */}
        <div className="px-5 pb-5">
          <div className="relative">
            <FiSearch
              size={21}
              className="absolute left-5 top-1/2
            -translate-y-1/2
            text-gray-500"
            />

            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2
              -translate-y-1/2
              text-gray-500
              hover:text-white
              text-xl
              transition-all duration-200"
              >
                ×
              </button>
            )}

            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11
            bg-[#0b1022]
            text-white
            rounded-xl
            pl-14 pr-12
            outline-none
            border border-white/10
            placeholder:text-gray-500
            focus:border-purple-500/40
            focus:ring-2 focus:ring-purple-500/10
            transition-all duration-200"
            />
          </div>
        </div>

        {/* ================= CONVERSATIONS ================= */}
        {filteredConversations.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center
          text-center px-6 py-20"
          >
            <div
              className="w-20 h-20 rounded-full
            bg-[#101426]
            border border-white/10
            flex items-center justify-center
            text-4xl mb-5"
            >
              💬
            </div>

            <h2 className="text-xl font-bold text-white">
              {search.trim() ? "No conversation found" : "No conversation yet"}
            </h2>

            <p className="text-sm text-gray-500 mt-2 max-w-sm">
              {search.trim()
                ? "Try searching with another name."
                : "Start chatting with your friends and connect with people."}
            </p>

            {!search.trim() && (
              <button
                onClick={() => navigate("/search")}
                className="mt-6 px-6 py-2.5
              bg-gradient-to-r
              from-blue-600 to-purple-600
              text-white
              rounded-xl
              font-semibold
              hover:opacity-90
              transition-all duration-200
              active:scale-95
              shadow-lg shadow-purple-500/20"
              >
                Find people
              </button>
            )}
          </div>
        ) : (
          <div
            className="mx-4 overflow-hidden
  rounded-2xl
  border border-white/20
  bg-[#080c1b]
  shadow-[0_8px_30px_rgba(0,0,0,0.35)]
  h-[calc(100vh-240px)]"
          >
            <div
              className="h-full overflow-y-auto"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "rgba(139, 92, 246, 0.5) transparent",
              }}
            >
              {filteredConversations.map((conversation, index) => (
                <div
                  key={conversation.user._id}
                  onPointerDown={() => {
                    longPressed.current = false;

                    longPressTimer.current = setTimeout(() => {
                      longPressed.current = true;
                      handleLongPress(conversation.user._id);
                    }, 600);
                  }}
                  onPointerUp={() => {
                    clearTimeout(longPressTimer.current);
                  }}
                  onPointerLeave={() => {
                    clearTimeout(longPressTimer.current);
                  }}
                  onClick={() => {
                    if (longPressed.current) {
                      longPressed.current = false;
                      return;
                    }

                    if (selectMode) {
                      handleSelectCoversation(conversation.user._id);
                      return;
                    }

                    navigate(`/chat/${conversation.user._id}`);
                  }}
                  className={`flex items-center gap-3
        px-4 py-1
        min-h-[69px]
        cursor-pointer
        transition-all duration-200
        ${
          index !== filteredConversations.length - 1
            ? "border-b border-white/[0.07]"
            : ""
        }
        ${
          conversation.unreadCount > 0
            ? "bg-[#17132b] hover:bg-[#1d1735]"
            : "hover:bg-white/[0.025] active:bg-white/[0.05]"
        }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {selectMode && (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(conversation.user._id)}
                        onChange={() =>
                          handleSelectCoversation(conversation.user._id)
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="absolute -top-1 -left-1
            w-5 h-5
            accent-purple-600
            cursor-pointer
            z-10"
                      />
                    )}

                    {conversation.user?.profilePic ? (
                      <img
                        src={conversation.user.profilePic}
                        alt={conversation.user.name}
                        className="w-11 h-11
            rounded-full
            object-cover
            border border-white/10"
                      />
                    ) : (
                      <div
                        className="w-12 h-12
            rounded-full
            bg-gradient-to-br
            from-gray-700 to-gray-800
            flex items-center justify-center
            text-gray-200
            font-semibold
            text-lg
            border border-white/10"
                      >
                        {conversation.user?.name?.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {onlineUsers.includes(conversation.user?._id) && (
                      <span
                        className="absolute
            bottom-0 right-0
            w-3.5 h-3.5
            bg-green-500
            border-2 border-[#080c1b]
            rounded-full"
                      />
                    )}
                  </div>

                  {/* Name + Message */}
                  <div className="flex-1 min-w-0">
                    <h2
                      className={`truncate text-[15px] ${
                        conversation.unreadCount > 0
                          ? "font-bold text-white"
                          : "font-semibold text-gray-200"
                      }`}
                    >
                      {conversation.user?.name}
                    </h2>

                    <p
                      className={`text-sm truncate mt-0.5 ${
                        conversation.unreadCount > 0
                          ? "text-gray-300 font-medium"
                          : "text-gray-500"
                      }`}
                    >
                      {conversation.lastMessage}
                    </p>
                  </div>

                  {/* Time + Unread */}
                  <div
                    className="shrink-0
        self-stretch
        flex flex-col
        items-end
        justify-center"
                  >
                    <p
                      className={`text-xs ${
                        conversation.unreadCount > 0
                          ? "text-purple-300 font-semibold"
                          : "text-gray-500"
                      }`}
                    >
                      {getTimeAgo(conversation.lastMessageTime)}
                    </p>

                    {conversation.unreadCount > 0 && (
                      <span
                        className="flex items-center justify-center
            mt-1
            min-w-5 h-5
            px-1
            rounded-full
            bg-gradient-to-br
            from-blue-500 to-purple-600
            text-white
            text-[11px]
            font-semibold"
                      >
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= DELETE MODAL ================= */}
        {showDeleteConfirm && (
          <div
            className="fixed inset-0
          bg-black/60
          backdrop-blur-sm
          flex items-center justify-center
          z-50
          px-4"
          >
            <div
              className="w-full max-w-sm
            bg-[#101426]
            rounded-2xl
            p-6
            shadow-2xl
            border border-white/10"
            >
              <h2 className="text-lg font-bold text-white">
                Delete conversation?
              </h2>

              <p className="text-sm text-gray-400 mt-2">
                This conversation will be removed from your index.
              </p>

              <div
                className="flex justify-end gap-3
              mt-6"
              >
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2
                rounded-xl
                text-sm font-semibold
                text-gray-400
                hover:bg-white/5
                hover:text-white
                transition"
                >
                  Cancel
                </button>

                <button
                  onClick={async () => {
                    await handleDeleteConversation();
                    setShowDeleteConfirm(false);
                  }}
                  className="px-4 py-2
                rounded-xl
                text-sm font-semibold
                text-white
                bg-red-600
                hover:bg-red-700
                active:scale-95
                transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Messages;
