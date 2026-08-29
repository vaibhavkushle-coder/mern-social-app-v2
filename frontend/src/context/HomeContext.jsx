import { createContext, useState } from "react";
import { getAllPosts } from "../services/postService";
import { getSuggestedUsers } from "../services/userService";

export const HomeContext = createContext();

export function HomeProvider({ children }) {
  const [posts, setPosts] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);

  const [postsLoaded, setPostsLoaded] = useState(false);
  const [suggestedUsersLoaded, setSuggestedUsersLoaded] = useState(false);

  async function fetchPosts() {
    try {
      const response = await getAllPosts();

      setPosts(response.data.posts);
      setPostsLoaded(true);
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async function fetchSuggestedUsers() {
    try {
      const response = await getSuggestedUsers();

      setSuggestedUsers(response.data.suggestedUsers);
      setSuggestedUsersLoaded(true);
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  return (
    <HomeContext.Provider
      value={{
        posts,
        setPosts,
        postsLoaded,
        fetchPosts,

        suggestedUsers,
        setSuggestedUsers,
        suggestedUsersLoaded,
        fetchSuggestedUsers,
      }}
    >
      {children}
    </HomeContext.Provider>
  );
}
