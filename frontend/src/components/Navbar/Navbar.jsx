import { NavLink } from "react-router-dom";

import { useNotification } from "../../hooks/useNotification";
import { useUser } from "../../hooks/useUser";
import { useConversation } from "../../hooks/useConversation";

import {
  FiHome,
  FiPlusSquare,
  FiUser,
  FiSearch,
  FiBell,
  FiMessageCircle,
} from "react-icons/fi";

function Navbar() {
  const { user } = useUser();
  const { notifications } = useNotification();
  const { conversations } = useConversation();

  const messageUnreadCount = conversations.reduce(
    (total, conversation) => total + (conversation.unreadCount || 0),
    0,
  );

  const unreadNotificationCount = notifications.filter(
    (notification) => !notification.isRead,
  ).length;

  function getNavClass({ isActive }) {
    return `
    relative flex items-center justify-center
    w-11 h-11 rounded-xl
    transition-all duration-200
    ${
      isActive
        ? "bg-gradient-to-br from-blue-500/15 to-purple-500/20 text-purple-400 shadow-sm shadow-purple-500/10"
        : "text-gray-500 hover:bg-white/5 hover:text-gray-200"
    }
  `;
  }

  function Badge({ count, red = false }) {
    if (!count) return null;

    return (
      <span
        className={`
        absolute -top-1 -right-1
        min-w-4.5 h-4.5 px-1
        rounded-full
        border-2 border-[#080d1c]
        flex items-center justify-center
        text-[9px] font-bold text-white
        ${red ? "bg-red-500" : "bg-purple-500"}
      `}
      >
        {count > 99 ? "99+" : count}
      </span>
    );
  }

  return (
    <>
      {/* ==============================
        DESKTOP / LAPTOP
    =============================== */}
      <aside
        className="
        hidden md:flex
        fixed left-3 top-1/2 -translate-y-1/2
        w-16
        py-3
        bg-[#0b1022]
        border border-white/10
        rounded-2xl
        shadow-xl shadow-black/30
        z-50
        flex-col
        items-center
      "
      >
        {/* Home */}
        <NavLink to="/" title="Home" className={getNavClass}>
          <FiHome size={22} />
        </NavLink>

        {/* Search */}
        <NavLink to="/search" title="Search" className={getNavClass}>
          <FiSearch size={22} />
        </NavLink>

        {/* Create */}
        <NavLink to="/create-post" title="Create Post" className={getNavClass}>
          <FiPlusSquare size={22} />
        </NavLink>

        {/* Messages */}
        <NavLink to="/messages" title="Messages" className={getNavClass}>
          <div className="relative">
            <FiMessageCircle size={22} />

            <Badge count={messageUnreadCount} />
          </div>
        </NavLink>

        {/* Notifications */}
        <NavLink
          to="/notification"
          title="Notifications"
          className={getNavClass}
        >
          <div className="relative">
            <FiBell size={22} />

            <Badge count={unreadNotificationCount} red />
          </div>
        </NavLink>

        {/* Profile */}
        <NavLink to="/profile" title="Profile" className={getNavClass}>
          {({ isActive }) =>
            user?.profilePic ? (
              <img
                src={user.profilePic}
                alt="profile"
                className={`
                w-7 h-7
                rounded-full
                object-cover
                ${
                  isActive
                    ? "ring-2 ring-purple-500 ring-offset-1 ring-offset-[#0b1022]"
                    : "border border-white/10"
                }
              `}
              />
            ) : (
              <FiUser size={22} />
            )
          }
        </NavLink>
      </aside>

      {/* ==============================
        MOBILE
    =============================== */}
      <nav
        className="
    md:hidden
    fixed bottom-3 left-3 right-3
    h-[62px]
    bg-[#080d1c]
    border-3 border-purple-500/50
    rounded-2xl
    shadow-[0_0_35px_rgba(124,58,237,0.18)]
    z-50
  "
      >
        <div
          className="
      h-full
      flex items-center justify-around
      px-2
    "
        >
          {/* Home */}
          <NavLink to="/" title="Home" className={getNavClass}>
            <FiHome size={21} />
          </NavLink>

          {/* Search */}
          <NavLink to="/search" title="Search" className={getNavClass}>
            <FiSearch size={21} />
          </NavLink>

          {/* Create */}
          <NavLink
            to="/create-post"
            title="Create Post"
            className={getNavClass}
          >
            <FiPlusSquare size={22} />
          </NavLink>

          {/* Messages */}
          <NavLink to="/messages" title="Messages" className={getNavClass}>
            <div className="relative">
              <FiMessageCircle size={21} />
              <Badge count={messageUnreadCount} />
            </div>
          </NavLink>

          {/* Notifications */}
          <NavLink
            to="/notification"
            title="Notifications"
            className={getNavClass}
          >
            <div className="relative">
              <FiBell size={21} />
              <Badge count={unreadNotificationCount} red />
            </div>
          </NavLink>

          {/* Profile */}
          <NavLink to="/profile" title="Profile" className={getNavClass}>
            {({ isActive }) =>
              user?.profilePic ? (
                <img
                  src={user.profilePic}
                  alt="profile"
                  className={`
              w-7 h-7
              rounded-full
              object-cover
              ${
                isActive
                  ? "ring-2 ring-purple-500 ring-offset-1 ring-offset-[#080d1c]"
                  : "border border-white/10"
              }
            `}
                />
              ) : (
                <FiUser size={21} />
              )
            }
          </NavLink>
        </div>
      </nav>
    </>
  );
}

export default Navbar;
