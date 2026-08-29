import api from "./api";

async function getUserProfile() {
  return await api.get("/user/profile");
}

async function editProfile(formData) {
  return await api.put("/user/edit", formData);
}

async function getProfileById(userId) {
  return await api.get(`/user/profile/${userId}`);
}

async function followUser(userId) {
  return await api.post(`/user/follow/${userId}`, {});
}

async function unfollowUser(userId) {
  return await api.post(`/user/unfollow/${userId}`, {});
}

async function searchUsers(query) {
  return await api.get(`/user/search?q=${query}`);
}

async function savePost(postId) {
  return await api.post(`/user/save/${postId}`, {});
}

async function unsavePost(postId) {
  return await api.delete(`/user/unsave/${postId}`);
}

async function getSuggestedUsers() {
  return await api.get("/user/suggested");
}

async function removeFollower(userId) {
  return await api.delete(`/user/removeFollower/${userId}`);
}

export {
  getUserProfile,
  editProfile,
  getProfileById,
  followUser,
  unfollowUser,
  searchUsers,
  savePost,
  unsavePost,
  getSuggestedUsers,
  removeFollower,
};
