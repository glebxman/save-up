export enum ErrorCode {
  VALIDATION = "VALIDATION",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  LIMIT_REACHED = "LIMIT_REACHED",
  TOO_MANY_REQUESTS = "TOO_MANY_REQUESTS",
  INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS",
  INTERNAL = "INTERNAL",
}

const RPC_CODE_MAP: Record<ErrorCode, number> = {
  [ErrorCode.VALIDATION]: -32602,
  [ErrorCode.UNAUTHORIZED]: -32001,
  [ErrorCode.FORBIDDEN]: -32003,
  [ErrorCode.NOT_FOUND]: -32004,
  [ErrorCode.CONFLICT]: -32005,
  [ErrorCode.LIMIT_REACHED]: -32006,
  [ErrorCode.TOO_MANY_REQUESTS]: -32008,
  [ErrorCode.INSUFFICIENT_FUNDS]: -32007,
  [ErrorCode.INTERNAL]: -32000,
};

export class AppError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }

  get rpcCode(): number {
    return RPC_CODE_MAP[this.code];
  }
}
