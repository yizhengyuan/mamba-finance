export class PayloadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayloadValidationError";
  }
}
