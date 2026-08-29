function getTimeAgo(createdAt) {
    const createdTime = new Date(createdAt);
    const currentTime = new Date();

    const diff = currentTime - createdTime;

    const totalMinutes = Math.floor(diff / (1000 * 60));
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);

    if (totalMinutes < 1) {
      return "Just now";
    }

    if (totalMinutes < 60) {
      return `${totalMinutes} min ago`;
    }

    if (totalHours < 24) {
      return `${totalHours} hr ago`;
    }

    return `${totalDays} day ago`;
  }

  export default getTimeAgo;