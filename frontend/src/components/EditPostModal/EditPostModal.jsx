function EditPostModal({
  editingPost,
  caption,
  setCaption,
  onClose,
  onSave,
  isClosing,
}) {
  if (!editingPost) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/70 flex items-center
       justify-center p-4
       ${isClosing ? "modal-overlay-close" : "modal-overlay"}`}
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh]
        overflow-y-auto modal-content 
        ${isClosing ? "modal-overlay-close" : "modal-overlay"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 pb-4 border-b">
          <h2 className="text-xl font-bold">✏️ Edit Post</h2>
          <button
            className="text-2xl font-bold hover:text-red-500 transition"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-3">
            <img
              src={editingPost.user?.profilePic}
              alt="profile"
              className="h-10 w-10 rounded-full object-cover border shadow-lg "
            />

            <p className="text-lg font-semibold">{editingPost.user?.name}</p>
          </div>
          <img
            src={editingPost.image}
            alt="profile"
            className="w-full h-44 object-cover rounded-xl mt-4 mb-4 border shadow-lg"
          />

          <textarea
            value={caption}
            rows={4}
            onChange={(e) => {
              setCaption(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = e.target.scrollHeight + "px";
            }}
            placeholder="Write a caption..."
            className="w-full min-h-[120px] border border-gray-300 rounded-xl 
            px-4 py-3 bg-gray-50 resize-none outline-none focus:ring-2 
            focus:ring-blue-500 focus:border-blue-500 transition"
          />

          <p className="text-right text-sm text-gray-500 mt-2">
            {caption.length}/300
          </p>

          <div className="sticky bottom-0 bg-white pt-2 flex justify-end gap-3 mt-5 mb-3">
            <button
              className="px-5 py-2 rounded-lg bg-gray-200 hover:bg-gray-300
              cursor-pointer font-medium transition shadow-lg "
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="bg-blue-500 px-5 py-2 rounded-lg font-medium text-white
              cursor-pointer shadow-lg hover:bg-blue-600"
              onClick={onSave}
            >
              {" "}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default EditPostModal;
