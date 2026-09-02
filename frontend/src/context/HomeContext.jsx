import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { getAllPosts } from "../services/postService";
import { getSuggestedUsers } from "../services/userService";
import { useUser } from "../hooks/useUser";

export const HomeContext = createContext();
const FEED_TTL = 60_000;
const SUGGESTIONS_TTL = 300_000;

function mergeById(current, incoming, prepend = false) {
  const incomingIds = new Set(incoming.map((item) => item._id));
  const existing = current.filter((item) => !incomingIds.has(item._id));
  return prepend ? [...incoming, ...existing] : [...existing, ...incoming];
}

export function HomeProvider({ children }) {
  const [posts, setPosts] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [suggestedUsersLoaded, setSuggestedUsersLoaded] = useState(false);
  const [feedMeta, setFeedMeta] = useState({ nextCursor: null, hasMore: true, refreshing: false, loadingMore: false });
  const postsRequestRef = useRef(null);
  const suggestionsRequestRef = useRef(null);
  const fetchedAtRef = useRef(0);
  const suggestionsFetchedAtRef = useRef(0);
  const versionRef = useRef(0);
  const { user } = useUser();
  const userId = user?._id?.toString() || null;

  useEffect(() => {
    versionRef.current += 1;
    setPosts([]);
    setSuggestedUsers([]);
    setPostsLoaded(false);
    setSuggestedUsersLoaded(false);
    setFeedMeta({ nextCursor: null, hasMore: true, refreshing: false, loadingMore: false });
    fetchedAtRef.current = 0;
    suggestionsFetchedAtRef.current = 0;
    postsRequestRef.current = null;
    suggestionsRequestRef.current = null;
  }, [userId]);

  const fetchPosts = useCallback(async ({ force = false } = {}) => {
    if (!userId) return;
    if (!force && postsLoaded && Date.now() - fetchedAtRef.current < FEED_TTL) return;
    if (postsRequestRef.current) return postsRequestRef.current;
    const version = versionRef.current;
    setFeedMeta((meta) => ({ ...meta, refreshing: postsLoaded }));
    const request = getAllPosts().then((response) => {
      if (versionRef.current === version) {
        setPosts((current) => mergeById(current, response.data.posts || [], true));
        setFeedMeta({ nextCursor: response.data.nextCursor, hasMore: response.data.hasMore, refreshing: false, loadingMore: false });
        setPostsLoaded(true);
        fetchedAtRef.current = Date.now();
      }
      return response;
    }).finally(() => {
      if (postsRequestRef.current === request) postsRequestRef.current = null;
      setFeedMeta((meta) => ({ ...meta, refreshing: false }));
    });
    postsRequestRef.current = request;
    return request;
  }, [userId, postsLoaded]);

  const loadMorePosts = useCallback(async () => {
    if (!userId || !feedMeta.hasMore || !feedMeta.nextCursor || postsRequestRef.current) return;
    const version = versionRef.current;
    setFeedMeta((meta) => ({ ...meta, loadingMore: true }));
    const request = getAllPosts(feedMeta.nextCursor).then((response) => {
      if (versionRef.current === version) {
        setPosts((current) => mergeById(current, response.data.posts || []));
        setFeedMeta((meta) => ({ ...meta, nextCursor: response.data.nextCursor, hasMore: response.data.hasMore, loadingMore: false }));
      }
      return response;
    }).finally(() => {
      if (postsRequestRef.current === request) postsRequestRef.current = null;
      setFeedMeta((meta) => ({ ...meta, loadingMore: false }));
    });
    postsRequestRef.current = request;
    return request;
  }, [userId, feedMeta.hasMore, feedMeta.nextCursor]);

  const fetchSuggestedUsers = useCallback(async ({ force = false } = {}) => {
    if (!userId) return;
    if (!force && suggestedUsersLoaded && Date.now() - suggestionsFetchedAtRef.current < SUGGESTIONS_TTL) return;
    if (suggestionsRequestRef.current) return suggestionsRequestRef.current;
    const version = versionRef.current;
    const request = getSuggestedUsers().then((response) => {
      if (versionRef.current === version) {
        setSuggestedUsers(response.data.suggestedUsers || []);
        setSuggestedUsersLoaded(true);
        suggestionsFetchedAtRef.current = Date.now();
      }
      return response;
    }).finally(() => {
      if (suggestionsRequestRef.current === request) suggestionsRequestRef.current = null;
    });
    suggestionsRequestRef.current = request;
    return request;
  }, [userId, suggestedUsersLoaded]);

  const upsertPost = useCallback((post, options = {}) => {
    setPosts((current) => mergeById(current, [post], options.prepend));
  }, []);

  return <HomeContext.Provider value={{
    posts, setPosts, postsLoaded, fetchPosts, loadMorePosts, feedMeta, upsertPost,
    suggestedUsers, setSuggestedUsers, suggestedUsersLoaded, fetchSuggestedUsers,
  }}>{children}</HomeContext.Provider>;
}
