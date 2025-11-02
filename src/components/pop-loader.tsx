const PopLoader = () => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <img
          src="/logos/popchain_logo.png"
          alt="logo"
          className="w-12 h-12 animate-bounce"
        />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
};

export default PopLoader;
