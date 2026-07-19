export class AppError extends Error {
  constructor(message, status = 400, code = "BAD_REQUEST") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function notFound(message) {
  return new AppError(message, 404, "NOT_FOUND");
}
