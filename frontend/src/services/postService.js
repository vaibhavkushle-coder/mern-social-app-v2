import api from "./api";

async function getAllPosts() {
  return await api.get("/post/all");
}

async function createPost(formData) {
  return await api.post("/post/create", formData);
}

async function likePost(postId) {
  return await api.post(`/post/like/${postId}`, {});
}

async function unlikePost(postId) {
  return await api.post(`/post/unlike/${postId}`, {});
}

async function commentPost(postId, comment) {
  return await api.post(`/post/comment/${postId}`, {
    text: comment,
  });
}

async function deletePost(postId) {
  return await api.delete(`/post/${postId}`);
}

async function deleteComment(postId, commentId) {
  return await api.delete(`/post/${postId}/comment/${commentId}`);
}

async function editComment(postId, commentId, text) {
  return await api.put(`/post/${postId}/comment/${commentId}`, {
    text: text,
  });
}

async function getPostLikes(postId) {
  return await api.get(`/post/${postId}/likes`);
}

async function editPost(postId, caption) {
  return await api.put(`/post/edit/${postId}`, {
    caption: caption,
  });
}

async function getMyPosts() {
  return await api.get("/post/my-posts");
}

async function getPostById(postId) {
  return await api.get(`/post/${postId}`);
}

export {
  getAllPosts,
  createPost,
  likePost,
  unlikePost,
  commentPost,
  deletePost,
  deleteComment,
  editComment,
  getPostLikes,
  editPost,
  getMyPosts,
  getPostById,
};
