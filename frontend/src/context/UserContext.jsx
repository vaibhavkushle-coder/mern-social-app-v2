import { createContext, useState, useEffect } from "react";
import {
  getUserProfile,
  editProfile as editProfileService,
} from "../services/userService";

export const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser();
  }, []);

  async function fetchUser() {
    try {
      const response = await getUserProfile();
      setUser(response.data.user);
    } catch (error) {
      console.log(error);
    }
  }

  async function editProfile(formData) {
    try {
      await editProfileService(formData);
      await fetchUser();
    } catch (error) {
      console.log(error);
    }
  }
  return (
    <UserContext.Provider value={{ user, setUser, editProfile, fetchUser }}>
      {children}
    </UserContext.Provider>
  );
}
