function PageHeader({ icon, title, subtitle }) {
  return (
    <div className="text-center mb-8">
      {/* Icon */}
      <div className="flex justify-center mb-4">
        <div
          className="
            w-14 h-14
            rounded-2xl
            flex items-center justify-center
            bg-gradient-to-br from-purple-600 to-blue-600
            text-white
            shadow-lg shadow-purple-900/30
            border border-purple-400/20
          "
        >
          {icon}
        </div>
      </div>

      {/* Title */}
      <h1
        className="
          text-2xl sm:text-3xl
          font-bold
          text-white
          tracking-tight
        "
      >
        {title}
      </h1>

      {/* Subtitle */}
      <p
        className="
          text-sm
          text-gray-400
          mt-2
          max-w-sm
          mx-auto
          leading-relaxed
        "
      >
        {subtitle}
      </p>
    </div>
  );
}

export default PageHeader;
