import { useUser } from "../../hooks/useUser";
import Navbar from "../../components/Navbar/Navbar";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { FiBookmark } from "react-icons/fi";

function SavePosts() {
  const {
    user,
    fetchUser,
    userInitializing,
    userInitializationError,
  } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const savedPosts = user?.savedPosts || [];

  return (
    <div
      className="h-screen overflow-y-auto bg-black pb-24 text-white"
      style={{
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(139, 92, 246, 0.5) transparent",
      }}
    >
      <Navbar />

      <main className="mx-auto w-full max-w-2xl px-4 pb-8 pt-5 sm:px-5">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-400">
              <FiBookmark size={18} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                Saved Posts
              </h1>
              <p className="text-xs text-gray-500">
                Posts you want to revisit
              </p>
            </div>
          </div>

          {user && (
            <p className="shrink-0 text-xs text-gray-400">
              {savedPosts.length} {savedPosts.length === 1 ? "Post" : "Posts"}
            </p>
          )}
        </div>

        <div className="mb-5 h-px bg-gradient-to-r from-purple-500 via-purple-500/30 to-transparent" />

        {!user && userInitializing ? (
          <div
            className="flex flex-col items-center justify-center gap-3 py-20"
            role="status"
            aria-live="polite"
          >
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500/25 border-t-purple-500" />
            <p className="text-sm font-medium text-gray-400">
              Loading saved posts...
            </p>
          </div>
        ) : !user ? (
          <div className="rounded-xl border border-purple-500/15 bg-[#080b1b] px-5 py-12 text-center">
            <FiBookmark
              size={32}
              className="mx-auto mb-3 text-purple-400/50"
            />
            <h2 className="text-sm font-semibold text-gray-300">
              Unable to load saved posts
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              {userInitializationError || "Please try again."}
            </p>
            <button
              type="button"
              onClick={() => fetchUser().catch(() => {})}
              className="mt-4 rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-xs font-semibold text-purple-200 transition-colors hover:bg-purple-500/20"
            >
              Retry
            </button>
          </div>
        ) : savedPosts.length === 0 ? (
          <div className="rounded-xl border border-purple-500/15 bg-[#080b1b] px-5 py-12 text-center">
            <FiBookmark
              size={34}
              className="mx-auto mb-3 text-purple-400/50"
            />
            <h2 className="text-sm font-semibold text-gray-300">
              No saved posts yet.
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Posts you save will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedPosts.map((post) => (
              <article
                key={post._id}
                onClick={() => navigate("/", { state: { postId: post._id } })}
                className="group relative flex cursor-pointer gap-3 rounded-xl border border-purple-500/20 bg-[#080b1b] p-2.5 shadow-[0_0_18px_rgba(124,58,237,0.05)] transition-all duration-300 hover:border-purple-500/50 hover:bg-[#0b0e20] hover:shadow-[0_0_22px_rgba(124,58,237,0.12)] sm:p-3"
              >
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-purple-500/20 bg-black sm:h-28 sm:w-28">
                  <img
                    src={post.image}
                    alt={post.caption || "Saved post"}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center pr-1">
                  <h2 className="line-clamp-2 text-sm font-bold text-white sm:text-base">
                    {post.caption || "Saved post"}
                  </h2>
                  {post.createdAt && (
                    <p className="mt-2 text-xs text-gray-500">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <FiBookmark
                  size={15}
                  className="absolute right-3 top-3 text-purple-400/70"
                  aria-hidden="true"
                />
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default SavePosts;
