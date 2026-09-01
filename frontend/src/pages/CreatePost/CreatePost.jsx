import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPost } from "../../services/postService";
import Navbar from "../../components/Navbar/Navbar";
import { ImagePlus, FileImage } from "lucide-react";
import { useToast } from "../../hooks/useToast";
import { FiArrowLeft } from "react-icons/fi";
import { useHome } from "../../hooks/useHome";

function CreatePost() {
  const [caption, setCaption] = useState("");
  const [image, setImage] = useState(null);
  const [showImage, setShowImage] = useState(null);
  const [creatingPost, setCreatingPost] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();
  const captionRef = useRef(null);
  const fileInputRef = useRef(null);
  const { fetchPosts } = useHome();

  async function handleSubmit(e) {
    e.preventDefault();

    if (creatingPost) return;

    const formData = new FormData();

    formData.append("caption", caption);
    formData.append("image", image);

    try {
      setCreatingPost(true);
      await createPost(formData);
      await fetchPosts();

      setCaption("");
      setImage(null);
      setShowImage(null);

      showToast("Post Created Successfully 📷", "success");

      navigate("/");
    } catch (error) {
      console.log(error);
      showToast("Failed to create post 📷", "error");
    } finally {
      setCreatingPost(false);
    }
  }
  return (
    <div className="min-h-screen bg-black text-white px-3 sm:px-5 pb-24">
      <Navbar />

      <div className="w-full max-w-xl mx-auto pt-6 sm:pt-8">
        {/* ================= HEADER ================= */}
        <div className="flex items-center justify-between mb-7">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="
            w-10 h-10
            rounded-xl
            flex items-center justify-center
            bg-[#080b1b]
            border border-purple-500/30
            text-gray-200
            hover:border-purple-400
            hover:bg-purple-500/10
            transition
          "
          >
            <FiArrowLeft />
          </button>

          <h1 className="text-xl sm:text-2xl font-bold">Create Post</h1>

          <div
            className="
            w-10 h-10
            rounded-xl
            flex items-center justify-center
            
            border border-purple-500/40
            text-purple-300
          "
          >
            <ImagePlus size={20} />
          </div>
        </div>

        {/* ================= MAIN CARD ================= */}
        <div
          className="
          w-full
          bg-[#0b1020]
          rounded-2xl
          border border-purple-500
          shadow-[0_0_30px_rgba(124,58,237,0.10)]
          p-4 sm:p-6
        "
        >
          {/* ================= IMAGE PREVIEW ================= */}
          {showImage && (
            <div className="mb-6 relative">
              <div
                className="
                w-full
                h-56 sm:h-64
                rounded-2xl
                overflow-hidden
                border border-purple-500/30
                bg-[#030511]
                p-1
              "
              >
                {image ? (
                  <div className="relative w-full h-full">
                    <img
                      src={URL.createObjectURL(image)}
                      alt="preview"
                      className="
                      w-full h-full
                      object-cover
                      rounded-xl
                    "
                    />

                    {/* Remove Image */}
                    <button
                      type="button"
                      onClick={() => {
                        setImage(null);
                        setShowImage(null);

                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }

                        captionRef.current?.focus();
                      }}
                      className="
                      absolute top-2 right-2
                      w-8 h-8
                      rounded-full
                      bg-black/70
                      border border-white/20
                      text-white text-xl
                      flex items-center justify-center
                      hover:bg-red-500/80
                      transition
                    "
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center">
                    <FileImage
                      size={45}
                      strokeWidth={1.5}
                      className="text-purple-400 mb-3"
                    />

                    <h3 className="font-semibold">Upload your photo</h3>

                    <p className="text-xs text-gray-500 mt-1">
                      Your image preview will appear here
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* ================= CHOOSE IMAGE ================= */}
            <div className="mb-6">
              <label className="block font-semibold mb-2 text-gray-200">
                Choose Image
              </label>

              <input
                ref={fileInputRef}
                id="image"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  setImage(e.target.files[0]);
                  setShowImage(e.target.files[0]);
                  captionRef.current?.focus();
                }}
              />

              <label
                htmlFor="image"
                className="
                flex justify-center items-center
                gap-3
                cursor-pointer
                w-full
                border border-dashed
                border-purple-500/50
                rounded-xl
                py-5
                bg-[#050817]
                hover:border-purple-400
                hover:bg-purple-500/5
                transition
              "
              >
                <div
                  className="
                  w-10 h-10
                  rounded-full
                  flex items-center justify-center
                  bg-purple-500/10
                  border border-purple-500/30
                "
                >
                  <ImagePlus size={21} className="text-purple-400" />
                </div>

                <div>
                  <p className="font-semibold text-gray-200">
                    {image ? "Change Image" : "Upload Image"}
                  </p>

                  <p className="text-xs text-gray-500 mt-1">PNG, JPG, JPEG</p>
                </div>
              </label>
            </div>

            {/* ================= CAPTION ================= */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="font-semibold text-gray-200">Caption</label>

                <span className="text-xs text-purple-400">
                  {caption.length}/300
                </span>
              </div>

              <textarea
                ref={captionRef}
                maxLength={300}
                rows={4}
                placeholder="Write something amazing..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="
                w-full
                bg-[#050817]
                border border-purple-500/35
                rounded-xl
                p-4
                text-sm
                text-white
                placeholder:text-gray-600
                outline-none
                resize-none
                focus:border-purple-500
                focus:ring-1
                focus:ring-purple-500
                transition
              "
              />
            </div>

            {/* ================= LOCATION ================= */}
            <div className="mb-6">
              <label className="block font-semibold mb-2 text-gray-200">
                Location
              </label>
            </div>

            {/* ================= BUTTONS ================= */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="
    flex-1
    py-3
    rounded-xl
    border border-purple-500/30
    bg-[#080b1b]
    text-gray-300
    font-semibold
    shadow-[0_0_15px_rgba(124,58,237,0.08)]
    hover:border-purple-400/60
    hover:text-white
    hover:bg-purple-500/10
    transition-all duration-300
    active:scale-95
  "
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!caption.trim() || !showImage || creatingPost}
                className="
    flex-1
    py-3
    rounded-xl
    bg-purple-600
    border border-purple-400/40
    text-white
    font-semibold
    shadow-[0_0_20px_rgba(139,92,246,0.35)]
    hover:bg-purple-500
    hover:shadow-[0_0_28px_rgba(139,92,246,0.5)]
    transition-all duration-300
    active:scale-95
    disabled:opacity-40
    disabled:cursor-not-allowed
  "
              >
                {creatingPost ? "⌛ Creating..." : "Create Post"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreatePost;
