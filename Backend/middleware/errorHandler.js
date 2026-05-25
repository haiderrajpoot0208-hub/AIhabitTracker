export const notFound = (req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.originalUrl}`,
  });
};

export const errorHandler = (err, req, res, next) => {
  console.error(err);

  const isCors = /not allowed by CORS/i.test(err.message);
  const status = isCors
    ? 403
    : res.statusCode && res.statusCode !== 200
      ? res.statusCode
      : 500;

  const message =
    isCors && process.env.NODE_ENV === "production"
      ? "Origin not allowed. Add your frontend URL to CLIENT_URL on Render."
      : err.message || "Server error";

  res.status(status).json({ message });
};
