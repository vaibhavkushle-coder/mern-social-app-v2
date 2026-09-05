import Navbar from "../../components/Navbar/Navbar";
import { useEffect } from "react";
import getTimeAgo from "../../utils/getTimeAgo";
import { useNotification } from "../../hooks/useNotification";
import { useNavigate } from "react-router-dom";
import {
  FiHeart,
  FiMessageCircle,
  FiUserPlus,
  FiMoreVertical,
} from "react-icons/fi";
import { useState, useRef } from "react";
import { useUser } from "../../hooks/useUser";

function Notification() {
  const [selectMode, setSelectmode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const longPressTimer = useRef(null);
  const longPressed = useRef(false);
  const { user } = useUser();
  const currentUserId = user?._id?.toString() || null;

  const {
    notifications,
    readAllNotifications,
    fetchNotifications,
    deleteSelectedNotificationsFromState,
  } = useNotification();

  useEffect(() => {
    if (!currentUserId) return;

    setSelectmode(false);
    setSelectedIds([]);
    setIsMenuOpen(false);
    setShowDeleteConfirm(false);
    fetchNotifications().catch(() => {});
  }, [currentUserId, fetchNotifications]);

  const navigate = useNavigate();

  useEffect(() => {
    if (notifications.some((notification) => !notification.isRead)) {
      readAllNotifications();
    }
  }, [notifications, readAllNotifications]);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <div
        className="
        max-w-2xl mx-auto min-h-screen
        bg-black
        border border-purple-500/50
        rounded-none md:rounded-[24px]
        shadow-[0_0_35px_rgba(124,58,237,0.18)]
        overflow-hidden
        pb-20
      "
      >
        <>
          <Navbar />

          {/* ================= HEADER ================= */}
          <div
            className="relative flex items-center 
            justify-between px-7 pt-4 pb-4 border-b mb-5 border-purple-400/30"
            onClick={() => setIsMenuOpen(false)}
          >
            {selectMode ? (
              <>
                <div className="flex items-center gap-2">
                  <div
                    className="
                    w-9 h-9 rounded-xl
                    bg-purple-500/15
                    text-purple-300
                    border border-purple-500/30
                    flex items-center justify-center
                    font-bold text-sm
                  "
                  >
                    {selectedIds.length}
                  </div>

                  <h1 className="text-xl font-bold text-white">Selected</h1>
                </div>

                <div className="flex items-center gap-2">
                  {selectedIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="
                      px-3 py-1.5
                      rounded-xl
                      bg-red-500
                      text-white
                      text-sm font-semibold
                      hover:bg-red-600
                      active:scale-95
                      transition-all duration-200
                      border border-red-400/40
                      shadow-sm
                    "
                    >
                      Delete
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectmode(false);
                      setSelectedIds([]);
                    }}
                    className="
                    px-3 py-1.5
                    rounded-xl
                    bg-white/5
                    text-gray-300
                    text-sm font-semibold
                    hover:bg-white/10
                    active:scale-95
                    transition-all duration-200
                    border border-white/10
                  "
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="flex items-center gap-3 -mb-2 -ml-4 -mt-3">
                    <div
                      className="
                      w-9 h-9 rounded-xl
                      bg-gradient-to-br
                      from-blue-600 to-purple-600
                      text-white
                      flex items-center justify-center
                      shadow-[0_0_18px_rgba(124,58,237,0.45)]
                    "
                    >
                      <span className="text-lg">🔔</span>
                    </div>

                    <div>
                      <h1 className="text-2xl font-bold text-white">
                        Notifications
                      </h1>

                      <p className="text-sm text-purple-200/60 mt-0.5">
                        Your latest activity
                      </p>
                    </div>
                  </div>
                </div>

                {/* MORE */}
                <div className="relative flex -mr-4 -mt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMenuOpen((prev) => !prev);
                    }}
                    className="
                    w-10 h-10 rounded-full
                    flex items-center justify-center
                    bg-[#0b0f20] 
                    text-purple-300
                    hover:text-purple-200
                    hover:bg-purple-500/10
                    active:scale-95
                    transition-all duration-200
                    border border-purple-500/20 
                    shadow-[0_0_15px_rgba(124,58,237,0.12)]
                  "
                  >
                    <FiMoreVertical size={21} />
                  </button>

                  {isMenuOpen && (
                    <div
                      className="
                      absolute right-0 top-12
                      w-32
                      bg-[#0d1124]
                      rounded-xl
                      shadow-xl
                      border border-purple-500/30
                      overflow-hidden
                      z-50
                    "
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectmode(true);
                          setIsMenuOpen(false);
                          setSelectedIds([]);
                        }}
                        className="
                        w-full px-4 py-2.5
                        text-left text-sm font-semibold
                        text-gray-200
                        hover:bg-purple-500/10
                        transition
                      "
                      >
                        ▣ Select
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ================= NOTIFICATIONS ================= */}
          {notifications.length === 0 ? (
            <div
              className="
              flex flex-col items-center justify-center
              text-center px-6 py-20
            "
            >
              <div
                className="
                w-20 h-20 rounded-full
                bg-gradient-to-br
                from-blue-500 to-purple-600
                flex items-center justify-center
                text-4xl mb-5
                shadow-[0_0_25px_rgba(124,58,237,0.3)]
              "
              >
                🔔
              </div>

              <h2 className="text-xl font-bold text-white">
                No notification yet
              </h2>

              <p className="text-sm text-purple-200/50 mt-2">
                You&apos;re all caught up!
              </p>
            </div>
          ) : (
            <div
              className="px-7 pb-6 space-y-3 overflow-y-auto h-[calc(100vh-190px)]"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "rgba(139, 92, 246, 0.5) transparent",
              }}
            >
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  onPointerDown={() => {
                    longPressed.current = false;

                    longPressTimer.current = setTimeout(() => {
                      longPressed.current = true;
                      setSelectmode(true);
                      setSelectedIds([notification._id]);
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
                      setSelectedIds((prev) =>
                        prev.includes(notification._id)
                          ? prev.filter((id) => id !== notification._id)
                          : [...prev, notification._id],
                      );
                      return;
                    }

                    if (notification.type === "follow") {
                      navigate(`/profile/${notification.fromUser._id}`);
                    }

                    if (
                      notification.type === "like" ||
                      notification.type === "comment"
                    ) {
                      const notificationPostId =
                        notification.post?._id || notification.post;

                      if (!notificationPostId) return;

                      navigate("/", {
                        state: {
                          postId: notificationPostId,
                        },
                      });
                    }
                  }}
                  className={`
                  relative
                  flex items-center gap-4
                  px-4 py-2.5
                  min-h-[72px]
                  rounded-2xl
                  border
                  cursor-pointer
                  transition-all duration-200
                  ${
                    notification.isRead
                      ? "bg-[#070a18] border-white/10 hover:bg-white/[0.03]"
                      : "bg-[#0c1027] border-purple-500/25 hover:bg-[#101535]"
                  }
                `}
                >
                  {/* CHECKBOX */}
                  {selectMode && (
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(notification._id)}
                      onChange={(e) => {
                        e.stopPropagation();

                        setSelectedIds((prev) =>
                          e.target.checked
                            ? [...prev, notification._id]
                            : prev.filter((id) => id !== notification._id),
                        );
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="
                      w-5 h-5
                      accent-purple-500
                      cursor-pointer
                      shrink-0
                    "
                    />
                  )}

                  {/* PROFILE PIC */}
                  <div className="relative shrink-0">
                    {notification.fromUser?.profilePic ? (
                      <img
                        src={notification.fromUser.profilePic}
                        alt={notification.fromUser.name}
                        className="
                        w-12 h-12
                        rounded-full
                        object-cover
                        border border-purple-400/30
                      "
                      />
                    ) : (
                      <div
                        className="
                        w-12 h-12
                        rounded-full
                        bg-gradient-to-br
                        from-blue-500 to-purple-600
                        text-white
                        flex items-center justify-center
                        text-lg font-bold
                        border border-purple-400/30
                      "
                      >
                        {notification.fromUser?.name?.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* SMALL ACTION ICON */}
                    <div
                      className={`
                      absolute -bottom-1 -right-1
                      w-7 h-7
                      rounded-full
                      flex items-center justify-center
                      border-2 border-[#070a18]
                      ${
                        notification.type === "like"
                          ? "bg-[#35132a] text-pink-400"
                          : notification.type === "comment"
                            ? "bg-[#172044] text-blue-400"
                            : "bg-[#28164d] text-white"
                      }
                    `}
                    >
                      {notification.type === "like" ? (
                        <FiHeart size={16} />
                      ) : notification.type === "comment" ? (
                        <FiMessageCircle size={16} />
                      ) : (
                        <FiUserPlus size={14} />
                      )}
                    </div>
                  </div>

                  {/* TEXT */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] leading-6 text-gray-300">
                      <span className="font-bold text-white">
                        {notification.fromUser.name}
                      </span>{" "}
                      {notification.type === "follow"
                        ? "Started following you"
                        : notification.type === "like"
                          ? "Liked your post"
                          : notification.type === "comment"
                            ? "Commented on your post"
                            : ""}
                    </p>

                    <p className="text-sm text-purple-200/50 mt-1">
                      {getTimeAgo(notification.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      </div>

      {/* ================= DELETE MODAL ================= */}
      {showDeleteConfirm && (
        <div
          className="
          fixed inset-0
          bg-black/60
          flex items-center justify-center
          z-50 px-4
        "
        >
          <div
            className="
            w-full max-w-sm
            bg-[#0d1124]
            rounded-2xl
            p-6
            shadow-xl
            border border-purple-500/30
          "
          >
            <h2 className="text-lg font-bold text-white">
              Delete notifications ?
            </h2>

            <p className="text-sm text-gray-400 mt-2">
              Selected notifications will be removed form your notifications.
            </p>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectmode(false);
                  setSelectedIds([]);
                }}
                className="
                px-4 py-2
                rounded-xl
                text-sm font-semibold
                text-gray-300
                bg-white/5
                hover:bg-white/10
                transition
                border border-white/10
              "
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  deleteSelectedNotificationsFromState(selectedIds);
                  setShowDeleteConfirm(false);
                  setSelectmode(false);
                  setSelectedIds([]);
                }}
                className="
                px-4 py-2
                rounded-xl
                text-sm font-semibold
                text-white
                bg-red-500
                hover:bg-red-600
                transition
                border border-red-400/30
              "
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Notification;
