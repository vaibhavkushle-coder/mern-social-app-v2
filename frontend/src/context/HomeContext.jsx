import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { getAllPosts } from "../services/postService";
import { getSuggestedUsers } from "../services/userService";
import { useUser } from "../hooks/useUser";

export const HomeContext = createContext();

export function HomeProvider({ children }) {
  const [posts, setPosts] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);

  const [postsLoaded, setPostsLoaded] = useState(false);
  const [suggestedUsersLoaded, setSuggestedUsersLoaded] = useState(false);
  const postsRequestRef = useRef(null);
  const suggestedUsersRequestRef = useRef(null);
  const currentUserIdRef = useRef(null);

  const { user } = useUser();
  const currentUserId = user?._id?.toString() || null;

  currentUserIdRef.current = currentUserId;

  const fetchPosts = useCallback(async () => {
    const requestUserId = currentUserIdRef.current;

    if (!requestUserId) return;

    if (postsRequestRef.current?.userId === requestUserId) {
      return postsRequestRef.current.promise;
    }

    const request = getAllPosts()
      .then((response) => {
        if (currentUserIdRef.current === requestUserId) {
          setPosts(response.data.posts);
          setPostsLoaded(true);
        }

        return response;
      })
      .catch((error) => {
        console.log(error);
        throw error;
      })
      .finally(() => {
        if (postsRequestRef.current?.promise === request) {
          postsRequestRef.current = null;
        }
      });

    postsRequestRef.current = { userId: requestUserId, promise: request };

    return request;
  }, []);

  const fetchSuggestedUsers = useCallback(async () => {
    const requestUserId = currentUserIdRef.current;

    if (!requestUserId) return;

    if (suggestedUsersRequestRef.current?.userId === requestUserId) {
      return suggestedUsersRequestRef.current.promise;
    }

    const request = getSuggestedUsers()
      .then((response) => {
        if (currentUserIdRef.current === requestUserId) {
          setSuggestedUsers(response.data.suggestedUsers);
          setSuggestedUsersLoaded(true);
        }

        return response;
      })
      .catch((error) => {
        console.log(error);
        throw error;
      })
      .finally(() => {
        if (suggestedUsersRequestRef.current?.promise === request) {
          suggestedUsersRequestRef.current = null;
        }
      });

    suggestedUsersRequestRef.current = {
      userId: requestUserId,
      promise: request,
    };

    return request;
  }, []);

  useEffect(() => {
    setPosts([]);
    setSuggestedUsers([]);
    setPostsLoaded(false);
    setSuggestedUsersLoaded(false);

    if (!currentUserId) return;

    fetchPosts().catch(() => {});
    fetchSuggestedUsers().catch(() => {});
  }, [currentUserId, fetchPosts, fetchSuggestedUsers]);

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
