import { createContext, useState, useEffect, useCallback, useRef } from "react";
import {
  getUserProfile,
  editProfile as editProfileService,
} from "../services/userService";
import logger from "../utils/logger";

export const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userInitializing, setUserInitializing] = useState(() =>
    Boolean(localStorage.getItem("token")),
  );
  const [userInitializationError, setUserInitializationError] = useState(null);
  const userRequestRef = useRef(null);

  const fetchUser = useCallback(async () => {
    if (userRequestRef.current) {
      return userRequestRef.current;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setUserInitializing(false);
      setUserInitializationError(null);
      return;
    }

    setUserInitializing(true);
    setUserInitializationError(null);

    const request = getUserProfile()
      .then((response) => {
        if (localStorage.getItem("token") === token) {
          setUser(response.data.user);
          setUserInitializationError(null);
        }

        return response;
      })
      .catch((error) => {
        logger.error("user.fetch.failed", error);

        if (localStorage.getItem("token") === token) {
          setUserInitializationError("Unable to load your profile.");
        }

        throw error;
      })
      .finally(() => {
        if (localStorage.getItem("token") === token) {
          setUserInitializing(false);
        }

        if (userRequestRef.current === request) {
          userRequestRef.current = null;
        }
      });

    userRequestRef.current = request;

    return request;
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("token")) return;

    fetchUser().catch(() => {});
  }, [fetchUser]);

  async function editProfile(formData) {
    try {
      await editProfileService(formData);
      await fetchUser();
    } catch (error) {
      logger.error("user.edit_profile.failed", error);
      throw error;
    }
  }
  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        editProfile,
        fetchUser,
        userInitializing,
        userInitializationError,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
