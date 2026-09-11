# MERN Social Media App

A full-stack MERN social media platform where users can create profiles, share image posts, follow other users, and interact through likes and comments. Built with React, Express, MongoDB, and Socket.IO, it also includes real-time notifications and private messaging with delivery/read receipts, typing indicators, and online presence.

The application uses JWT authentication with session revocation, MongoDB transactions for race-safe updates, and Cloudinary for secure image storage and validation.

## Features

### Authentication & Account

- User registration and login with JWT authentication
- Secure logout with server-side session/token revocation
- Change password with automatic re-authentication and forced logout of other sessions
- Rate-limited login/registration with live attempt-count feedback

### Profile

- View and edit own profile (name, bio, profile picture)
- View other users' profiles
- Paginated, infinite-scrolling posts on profile pages
- Followers/following list modals with in-modal search
- Remove follower

### Social / Follow

- Follow / unfollow users
- Suggested users to follow (friend-of-friend based, with fallback)
- Live user search by name

### Posts

- Create posts with image upload (Cloudinary) and caption
- Edit and delete own posts
- Infinite-scrolling home feed
- Direct-link to and auto-scroll to a specific shared post
- Report a post
- Copy shareable post link

### Likes & Comments

- Like/unlike posts with animated interaction
- View list of users who liked a post
- Add, edit, and delete comments

### Saved Posts

- Save/unsave posts
- Dedicated saved posts page

### Notifications

- Real-time notifications for follows, likes, and comments (Socket.IO)
- Live unread notification badge
- Infinite-scrolling notification history
- Mark-all-as-read
- Multi-select delete notifications
- Auto-cleanup of notifications for deleted posts

### Messaging / Chat

- Real-time one-on-one direct messaging (Socket.IO)
- Share posts directly via chat
- Conversation list with unread counts, sorted by recent activity
- Message delivery and read receipts (sent/delivered/seen)
- Typing indicators
- Online/offline presence with last-seen timestamps
- Optimistic message sending with failure/retry state
- Reply to specific messages (including swipe-to-reply)
- Edit sent messages
- Delete message for me / delete for everyone (within 1 hour)
- Multi-select bulk message delete
- Delete entire conversations
- Emoji picker
- Inline shared-post previews in chat

### Search & Performance

- Cursor-based infinite scroll/pagination across feed, profile, messages, and notifications

### Security & UX Safeguards

- Client- and server-side image type/size validation with instant feedback
- Rate-limiting feedback on repeated actions
- Automatic session invalidation across devices on password change

## Tech Stack

### Frontend

- React 19
- Vite
- Tailwind CSS
- React Router
- Axios
- Socket.IO Client

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- Socket.IO

### Authentication & Security

- JWT Authentication
- bcryptjs
- Express Rate Limit
- CORS
- Server-side input validation

### File & Image Handling

- Multer
- Cloudinary
- streamifier

## Features

### Authentication & Account

- User registration and login with JWT authentication
- Secure logout with server-side session/token revocation
- Change password with automatic re-authentication
- Rate-limited login and registration with attempt-count feedback

### Profile

- View and edit own profile
- Profile picture upload
- View other users' profiles
- Followers/following lists
- Remove follower
- Paginated profile posts

### Social

- Follow / unfollow users
- Suggested users to follow
- Search users by name

### Posts

- Create posts with image and caption
- Edit and delete own posts
- Cloudinary image storage
- Infinite-scrolling home feed
- Shareable post links
- Report posts
- Save / unsave posts

### Likes & Comments

- Like / unlike posts
- View users who liked a post
- Add, edit, and delete comments

### Notifications

- Real-time notifications for follows, likes, and comments
- Unread notification count
- Notification history with pagination
- Mark notifications as read
- Multi-select notification deletion
- Automatic cleanup of stale post notifications

### Real-Time Messaging

- One-to-one real-time messaging
- Message delivery and read receipts
- Typing indicators
- Online / offline presence
- Last-seen timestamps
- Optimistic message sending
- Reply to messages
- Edit sent messages
- Delete messages for me / everyone
- Bulk message deletion
- Delete conversations
- Emoji picker
- Share posts directly in chat

### Performance & Security

- Cursor-based pagination
- Server-side input validation
- Image MIME and file-signature validation
- Rate limiting for sensitive actions
- JWT session revocation
- MongoDB transactions for race-safe updates
