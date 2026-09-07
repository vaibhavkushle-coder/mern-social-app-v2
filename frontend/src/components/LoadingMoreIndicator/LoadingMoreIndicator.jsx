function LoadingMoreIndicator({ label = "Loading more...", overlay = false }) {
  return (
    <div
      className={`${
        overlay ? "sticky top-2 z-20 h-0" : "py-3"
      } flex items-center justify-center gap-2 text-xs text-purple-200/70`}
      role="status"
      aria-live="polite"
    >
      <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-purple-400/30 border-t-purple-400" />
      <span className={overlay ? "rounded-full bg-[#0d1124]/95 px-3 py-1.5 shadow-lg" : ""}>
        {label}
      </span>
    </div>
  );
}

export default LoadingMoreIndicator;
