// middleware/errorHandler.js

export const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // ───── DynamoDB Errors ─────

  // Table not found
  if (err.name === "ResourceNotFoundException") {
    statusCode = 404;
    message = "Requested DynamoDB resource not found";
  }

  // Conditional write failure
  if (err.name === "ConditionalCheckFailedException") {
    statusCode = 409;
    message = "Condition check failed";
  }

  // Validation error from AWS SDK
  if (err.name === "ValidationException") {
    statusCode = 400;
    message = "Invalid request parameters";
  }

  // Access permission issue
  if (err.name === "AccessDeniedException") {
    statusCode = 403;
    message = "Access denied to DynamoDB resource";
  }

  // ───── Dev Logging ─────

  if (process.env.NODE_ENV !== "production") {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}`, err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};


export const notFound = (req, res, next) => {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
};