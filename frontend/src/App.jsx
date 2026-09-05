import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import PublicRoute from "./components/PublicRoute/PublicRoute";
import Toast from "./components/Toast/Toast";

const Login = lazy(() => import("./pages/Login/Login"));
const Register = lazy(() => import("./pages/Register/Register"));
const Home = lazy(() => import("./pages/Home/Home"));
const Profile = lazy(() => import("./pages/Profile/Profile"));
const CreatePost = lazy(() => import("./pages/CreatePost/CreatePost"));
const UserProfile = lazy(() => import("./pages/UserProfile/UserProfile"));
const Search = lazy(() => import("./pages/Search/Search"));
const Notification = lazy(() => import("./pages/Notification/Notification"));
const Chat = lazy(() => import("./pages/Chat/Chat"));
const Messages = lazy(() => import("./pages/Messages;/Messages"));
const SavePosts = lazy(() => import("./pages/SavedPosts/SavedPost"));

function App() {
  return (
    <>
      <Suspense fallback={<div className="min-h-screen bg-[#0f1117]" />}>
        <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        <Route path="/" element={<Home />} />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/create-post"
          element={
            <ProtectedRoute>
              <CreatePost />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile/:id"
          element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notification"
          element={
            <ProtectedRoute>
              <Notification />
            </ProtectedRoute>
          }
        />

        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          }
        />

        <Route
          path="/saved-posts"
          element={
            <ProtectedRoute>
              <SavePosts />
            </ProtectedRoute>
          }
        />

        <Route
          path="/chat/:id"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />

        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <Search />
            </ProtectedRoute>
          }
        />
        </Routes>
      </Suspense>
      <Toast />
    </>
  );
}

export default App;
