import { createContext, useState, useEffect, useCallback, useRef } from "react";
import {
  getUserProfile,
  editProfile as editProfileService,
} from "../services/userService";

export const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const userRequestRef = useRef(null);

  const fetchUser = useCallback(async () => {
    if (userRequestRef.current) {
      return userRequestRef.current;
    }

    const token = localStorage.getItem("token");

    if (!token) return;

    const request = getUserProfile()
      .then((response) => {
        if (localStorage.getItem("token") === token) {
          setUser(response.data.user);
        }

        return response;
      })
      .catch((error) => {
      logger.error("user.fetch.failed", error);
        throw error;
      })
      .finally(() => {
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
    }
  }
  return (
    <UserContext.Provider value={{ user, setUser, editProfile, fetchUser }}>
      {children}
    </UserContext.Provider>
  );
}
import logger from "../utils/logger";
