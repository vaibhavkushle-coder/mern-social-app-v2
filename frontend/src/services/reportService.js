import api from "./api";

async function reportPost(postId) {
  return await api.post(`/report/${postId}`, {});
}

export { reportPost };
