import { useUser } from "../../hooks/useUser";
import Navbar from "../../components/Navbar/Navbar";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

function SavePosts() {
  const { user, fetchUser } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
  }, []);
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />

      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">🔖 Saved Posts</h1>

        {user?.savedPosts?.length === 0 ? (
          <p className="text-gray-500">No saved posts yet.</p>
        ) : (
          <div>
            <p>{user?.savedPosts?.length} saved posts</p>

            <div className="grid grid-cols-3 gap-3 mt-6">
              {user?.savedPosts?.map((post) => (
                <div
                  key={post._id}
                  onClick={() => navigate("/", { state: { postId: post._id } })}
                  className="overflow-hidden rounded-xl"
                >
                  <img
                    src={post.image}
                    alt="saved post"
                    className="w-full aspect-square object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SavePosts;
