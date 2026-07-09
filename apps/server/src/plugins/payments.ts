import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type { FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

import { env } from "../config/env.js";
import {
  activateSubscriptionPayment,
  cancelPaymeTransaction,
  findPaymeTransaction,
  findPendingPaymeTransactionByUser,
  findUserById,
  getPaymeTransactionsForPeriod,
  getSubscriptionPlan,
  getSubscriptionPlanByAmount,
  isSubscriptionPlanId,
  savePendingPaymeTransaction,
} from "../services/subscription/index.js";
import type { PaymeTransaction } from "../services/subscription/payments.js";

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

const PAYME_TIMEOUT_MS = 12 * 60 * 60 * 1000;
const PAYME_DEFAULT_LOGIN = "Paycom";
const CLICK_CALLBACK_PATHS = ["/rpc/click/callback", "/api/click/callback", "/click/callback"] as const;
const PAYME_CALLBACK_PATHS = ["/rpc/payme/callback", "/api/payme/callback", "/payme/callback"] as const;

type PaymeRpcId = number | string | null;
type PaymeLocalizedMessage = { ru: string; uz: string; en: string };
type PaymeMessage = string | PaymeLocalizedMessage;
type PaymeErrorDef = { code: number; message: PaymeMessage };

const PAYME_ERRORS = {
  INVALID_HTTP_METHOD: { code: -32300, message: "Request method is not POST." },
  PARSE_ERROR: { code: -32700, message: "Parse error." },
  INVALID_AMOUNT: { code: -31001, message: "Invalid amount." },
  USER_NOT_FOUND: {
    code: -31050,
    message: {
      ru: "Неверный ID пользователя",
      uz: "Foydalanuvchi ID noto'g'ri",
      en: "Invalid user ID",
    },
  },
  CANT_PAY: {
    code: -31051,
    message: {
      ru: "Подписка недоступна для оплаты",
      uz: "Obunani to'lash imkonsiz",
      en: "Subscription is not available for payment",
    },
  },
  CANT_PERFORM: { code: -31008, message: "Could not perform this operation." },
  TRANSACTION_NOT_FOUND: { code: -31003, message: "Transaction not found." },
  AUTH_ERROR: { code: -32504, message: "Insufficient privilege to perform this method." },
  METHOD_NOT_FOUND: { code: -32601, message: "Method not found." },
  INVALID_REQUEST: { code: -32600, message: "Invalid Request." },
  INTERNAL_ERROR: { code: -32400, message: "Internal System Error." },
} satisfies Record<string, PaymeErrorDef>;

interface PasswordStore {
  get(): string;
  set(next: string): void;
}

function findProjectRoot(): string {
  let current = process.cwd();
  for (let depth = 0; depth < 6; depth += 1) {
    if (fs.existsSync(path.join(current, "pnpm-workspace.yaml"))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return process.cwd();
}

function createPasswordStore(initialPassword: string): PasswordStore {
  const filePath = path.resolve(findProjectRoot(), "data", "payme-password.json");
  const legacyFilePath = path.resolve(process.cwd(), "data", "payme-password.json");
  const readPaths = Array.from(new Set([filePath, legacyFilePath]));

  function readPersisted(): string | null {
    let latest: { password: string; timestamp: number } | null = null;

    for (const candidate of readPaths) {
      try {
        const raw = fs.readFileSync(candidate, "utf-8");
        const data = JSON.parse(raw) as { password?: string; updatedAt?: string };
        if (typeof data.password === "string" && data.password.trim()) {
          const updatedAt = typeof data.updatedAt === "string" ? Date.parse(data.updatedAt) : NaN;
          const timestamp = Number.isFinite(updatedAt) ? updatedAt : fs.statSync(candidate).mtimeMs;
          if (!latest || timestamp > latest.timestamp) {
            latest = { password: data.password.trim(), timestamp };
          }
        }
      } catch {
        // Try the next known storage path, then fall back to env.
      }
    }

    return latest?.password ?? null;
  }

  let current = readPersisted() ?? initialPassword;

  return {
    get() {
      current = readPersisted() ?? current;
      return current;
    },
    set(next: string) {
      const password = next.trim();
      if (!password) return;
      current = password;

      for (const candidate of readPaths) {
        try {
          fs.mkdirSync(path.dirname(candidate), { recursive: true });
          fs.writeFileSync(
            candidate,
            JSON.stringify({ password, updatedAt: new Date().toISOString() }, null, 2),
            { mode: 0o600 },
          );
        } catch (error) {
          console.error("Failed to persist Payme password:", error);
        }
      }
    },
  };
}

function rpcError(id: PaymeRpcId, err: PaymeErrorDef, data?: unknown) {
  const error: { code: number; message: PaymeMessage; data?: unknown } = {
    code: err.code,
    message: err.message,
  };
  if (data !== undefined) error.data = data;
  return { jsonrpc: "2.0", id, result: null, error };
}

function rpcResult(id: PaymeRpcId, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function extractRpcId(body: unknown): PaymeRpcId {
  if (body && typeof body === "object" && "id" in body) {
    return (body as { id?: PaymeRpcId }).id ?? null;
  }
  return null;
}

function extractBasicCredentials(authHeader: string): { login: string; password: string } | null {
  if (!authHeader.startsWith("Basic ")) return null;
  try {
    const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex < 0) return null;
    const login = decoded.slice(0, separatorIndex);
    const password = decoded.slice(separatorIndex + 1);
    if (!login || !password) return null;
    return { login, password };
  } catch {
    return null;
  }
}

function isAuthorizedPaymeRequest(credentials: { login: string; password: string }, passwords: string[]): boolean {
  const expectedLogin = (env.PAYME_LOGIN || env.PAYME_MERCHANT_USER_ID).trim();
  const loginAllowed =
    expectedLogin.length > 0
      ? credentials.login === expectedLogin || credentials.login === PAYME_DEFAULT_LOGIN
      : credentials.login.length > 0 || credentials.login === PAYME_DEFAULT_LOGIN;
  return loginAllowed && passwords.some((password) => password && timingSafeStringEqual(credentials.password, password));
}

function isExpired(tx: PaymeTransaction) {
  return tx.state === 1 && Date.now() - tx.create_time > PAYME_TIMEOUT_MS;
}

function getAccountUserId(account: unknown): { userId: string; accountField: string } | null {
  if (!account || typeof account !== "object") return null;
  const record = account as Record<string, unknown>;
  const accountField =
    ["user_id", "user-id", "userId", "UserID"].find((key) => record[key] !== undefined) ??
    Object.keys(record)[0] ??
    "user_id";
  const userId = String(record[accountField] ?? "").trim();
  return userId ? { userId, accountField } : null;
}

function buildPaymeDetail(planId: string, amountTiyin: number) {
  const plan = isSubscriptionPlanId(planId) ? getSubscriptionPlan(planId) : null;
  const months = plan?.months ?? 1;

  return {
    receipt_type: 0,
    items: [
      {
        title: `Save Up subscription ${months} month${months === 1 ? "" : "s"}`,
        price: amountTiyin,
        count: 1,
        code: "04901001007000000",
        vat_percent: 0,
        package_code: "1342834",
      },
    ],
  };
}

async function validatePaymeAccountAndAmount(
  rpcId: PaymeRpcId,
  send: (payload: unknown) => void,
  account: unknown,
  amountTiyin: number,
) {
  const accountData = getAccountUserId(account);
  const accountField = accountData?.accountField ?? "user_id";
  if (!accountData) {
    send(rpcError(rpcId, PAYME_ERRORS.USER_NOT_FOUND, accountField));
    return null;
  }

  const user = await findUserById(accountData.userId);
  if (!user) {
    send(rpcError(rpcId, PAYME_ERRORS.USER_NOT_FOUND, accountField));
    return null;
  }

  if (!Number.isInteger(amountTiyin) || amountTiyin <= 0 || amountTiyin % 100 !== 0) {
    send(rpcError(rpcId, PAYME_ERRORS.INVALID_AMOUNT));
    return null;
  }

  const amountUzs = amountTiyin / 100;
  const plan = getSubscriptionPlanByAmount(amountUzs);
  if (!plan) {
    send(rpcError(rpcId, PAYME_ERRORS.INVALID_AMOUNT));
    return null;
  }

  return { user, plan, amountUzs, accountField };
}

function clickResponse(payload: Record<string, unknown>) {
  return payload;
}

function verifyClickSignature(body: Record<string, unknown>): boolean {
  // Fail closed if the secret isn't configured — otherwise the signed string's secret
  // component is empty, Click's signing formula is public, and any caller can compute
  // a matching signature and forge a valid "payment complete" callback.
  if (!env.CLICK_SECRET_KEY) return false;

  const clickTransId = String(body["click_trans_id"] ?? "");
  const serviceId = String(body["service_id"] ?? "");
  const merchantTransId = String(body["merchant_trans_id"] ?? "");
  const merchantPrepareId = String(body["merchant_prepare_id"] ?? "");
  const amount = String(body["amount"] ?? "");
  const action = String(body["action"] ?? "");
  const signTime = String(body["sign_time"] ?? "");
  const signString = String(body["sign_string"] ?? "").toLowerCase();
  const actionNum = Number(action);

  const signSource =
    actionNum === 0
      ? `${clickTransId}${serviceId}${env.CLICK_SECRET_KEY}${merchantTransId}${amount}${action}${signTime}`
      : `${clickTransId}${serviceId}${env.CLICK_SECRET_KEY}${merchantTransId}${merchantPrepareId}${amount}${action}${signTime}`;

  const expected = crypto.createHash("md5").update(signSource).digest("hex").toLowerCase();
  return timingSafeStringEqual(expected, signString);
}

export const paymentsPlugin = fp(async (app) => {
  const paymePasswordStore = createPasswordStore(env.PAYME_TEST_KEY || env.PAYME_SECRET_KEY);

  app.addContentTypeParser(
    "application/x-www-form-urlencoded",
    { parseAs: "string" },
    (_request, body, done) => {
      try {
        done(null, Object.fromEntries(new URLSearchParams(String(body))));
      } catch (error) {
        done(error as Error);
      }
    },
  );

  const handleClickCallback = async (request: FastifyRequest<{ Body: Record<string, unknown> }>) => {
    const body = request.body ?? {};

    try {
      if (!verifyClickSignature(body)) {
        return clickResponse({ error: -1, error_note: "Invalid sign" });
      }

      if (env.CLICK_SERVICE_ID && String(body["service_id"] ?? "") !== env.CLICK_SERVICE_ID) {
        return clickResponse({ error: -6, error_note: "Invalid service_id" });
      }

      const userId = String(body["merchant_trans_id"] ?? "").trim();
      const user = userId ? await findUserById(userId) : null;
      if (!user) {
        return clickResponse({ error: -5, error_note: "User not found" });
      }

      const amount = Number(body["amount"]);
      const plan = getSubscriptionPlanByAmount(amount);
      if (!plan) {
        return clickResponse({ error: -2, error_note: "Incorrect parameter amount" });
      }

      if (Number(body["error"]) < 0) {
        return clickResponse({ error: -9, error_note: "Transaction cancelled" });
      }

      const clickTransId = String(body["click_trans_id"] ?? "");
      const action = Number(body["action"]);

      if (action === 0) {
        return clickResponse({
          click_trans_id: clickTransId,
          merchant_trans_id: user.id,
          merchant_prepare_id: user.id,
          error: 0,
          error_note: "Success",
        });
      }

      if (action === 1) {
        await activateSubscriptionPayment({
          userId: user.id,
          provider: "click",
          planId: plan.id,
          amount,
          providerTransactionId: clickTransId,
          providerPrepareId: String(body["merchant_prepare_id"] ?? user.id),
        });

        return clickResponse({
          click_trans_id: clickTransId,
          merchant_trans_id: user.id,
          merchant_confirm_id: user.id,
          error: 0,
          error_note: "Success",
        });
      }

      return clickResponse({ error: -3, error_note: "Unknown action" });
    } catch (error) {
      request.log.error({ err: error }, "Click callback error");
      return clickResponse({ error: -8, error_note: "Internal error" });
    }
  };

  const handlePaymeCallback = async (request: FastifyRequest, reply: FastifyReply) => {
    const send = (payload: unknown) => {
      request.log.info({ paymeResponse: payload }, "Payme RPC response");
      reply.header("content-type", "application/json; charset=UTF-8").send(JSON.stringify(payload));
    };

    const body = request.body as any;
    const rpcId = extractRpcId(body);

    try {
      if (request.method !== "POST") {
        send(rpcError(rpcId, PAYME_ERRORS.INVALID_HTTP_METHOD));
        return;
      }

      const requestMethod =
        body && typeof body === "object" && "method" in body ? String((body as { method?: unknown }).method ?? "") : "";
      const acceptedPasswords = [paymePasswordStore.get()];
      const credentials = extractBasicCredentials(String(request.headers.authorization ?? ""));
      if (!credentials || !isAuthorizedPaymeRequest(credentials, acceptedPasswords)) {
        request.log.warn(
          {
            receivedLogin: credentials?.login,
            expectedLogin: (env.PAYME_LOGIN || env.PAYME_MERCHANT_USER_ID).trim(),
            acceptedPasswordCount: acceptedPasswords.filter(Boolean).length,
            hasAuthHeader: !!request.headers.authorization,
          },
          "Payme authentication failed"
        );
        send(rpcError(rpcId, PAYME_ERRORS.AUTH_ERROR));
        return;
      }

      if (!body || typeof body !== "object" || typeof body.method !== "string" || !body.params) {
        send(rpcError(rpcId, PAYME_ERRORS.INVALID_REQUEST));
        return;
      }

      const { method, params } = body;

      switch (method) {
        case "ChangePassword": {
          const nextPassword = String(params.password || "").trim();
          if (!nextPassword) {
            send(rpcError(rpcId, PAYME_ERRORS.INVALID_REQUEST));
            return;
          }
          paymePasswordStore.set(nextPassword);
          send(rpcResult(rpcId, { success: true }));
          return;
        }

        case "CheckPerformTransaction": {
          const amountTiyin = Number(params.amount);
          if (!Number.isInteger(amountTiyin) || amountTiyin <= 0) {
            send(rpcError(rpcId, PAYME_ERRORS.INVALID_AMOUNT));
            return;
          }

          const validation = await validatePaymeAccountAndAmount(rpcId, send, params.account, amountTiyin);
          if (!validation) return;

          const pending = await findPendingPaymeTransactionByUser(validation.user.id);
          if (pending) {
            if (isExpired(pending)) {
              await cancelPaymeTransaction(pending.id, 4);
            } else {
              send(rpcError(rpcId, PAYME_ERRORS.CANT_PAY, validation.accountField));
              return;
            }
          }

          send(rpcResult(rpcId, { allow: true, detail: buildPaymeDetail(validation.plan.id, amountTiyin) }));
          return;
        }

        case "CreateTransaction": {
          const txId = String(params.id || "");
          const amountTiyin = Number(params.amount);
          const time = Number(params.time);

          if (!Number.isInteger(amountTiyin) || amountTiyin <= 0) {
            send(rpcError(rpcId, PAYME_ERRORS.INVALID_AMOUNT));
            return;
          }

          const validation = await validatePaymeAccountAndAmount(rpcId, send, params.account, amountTiyin);
          if (!validation) return;

          const existing = await findPaymeTransaction(txId);
          if (existing) {
            if (isExpired(existing)) {
              await cancelPaymeTransaction(existing.id, 4);
              send(rpcError(rpcId, PAYME_ERRORS.CANT_PERFORM));
              return;
            }

            send(
              rpcResult(rpcId, {
                create_time: existing.create_time,
                transaction: existing.id,
                state: existing.state,
              }),
            );
            return;
          }

          const pending = await findPendingPaymeTransactionByUser(validation.user.id);
          if (pending && pending.id !== txId) {
            if (isExpired(pending)) {
              await cancelPaymeTransaction(pending.id, 4);
            } else {
              send(rpcError(rpcId, PAYME_ERRORS.CANT_PAY, validation.accountField));
              return;
            }
          }

          const tx = await savePendingPaymeTransaction({
            txId,
            userId: validation.user.id,
            planId: validation.plan.id,
            amount: validation.amountUzs,
            createTime: time,
          });

          send(
            rpcResult(rpcId, {
              create_time: tx.create_time,
              transaction: tx.id,
              state: tx.state,
            }),
          );
          return;
        }

        case "PerformTransaction": {
          const txId = String(params.id || "");
          const tx = await findPaymeTransaction(txId);

          if (!tx) {
            send(rpcError(rpcId, PAYME_ERRORS.TRANSACTION_NOT_FOUND));
            return;
          }

          if (tx.state === 2) {
            send(rpcResult(rpcId, { transaction: tx.id, perform_time: tx.perform_time, state: tx.state }));
            return;
          }

          if (tx.state !== 1) {
            send(rpcError(rpcId, PAYME_ERRORS.CANT_PERFORM));
            return;
          }

          if (isExpired(tx)) {
            await cancelPaymeTransaction(tx.id, 4);
            send(rpcError(rpcId, PAYME_ERRORS.CANT_PERFORM));
            return;
          }

          const performTime = Date.now();
          await activateSubscriptionPayment({
            userId: tx.userId,
            provider: "payme",
            planId: tx.planId,
            amount: tx.amount,
            providerTransactionId: tx.id,
            paymeState: 2,
            paymeCreateTime: tx.create_time,
            paymePerformTime: performTime,
          });

          send(rpcResult(rpcId, { transaction: tx.id, perform_time: performTime, state: 2 }));
          return;
        }

        case "CancelTransaction": {
          const txId = String(params.id || "");
          const reason = Number(params.reason) || 0;
          const tx = await cancelPaymeTransaction(txId, reason);

          if (!tx) {
            send(rpcError(rpcId, PAYME_ERRORS.TRANSACTION_NOT_FOUND));
            return;
          }

          send(
            rpcResult(rpcId, {
              transaction: tx.id,
              cancel_time: tx.cancel_time,
              state: tx.state,
            }),
          );
          return;
        }

        case "CheckTransaction": {
          const txId = String(params.id || "");
          const tx = await findPaymeTransaction(txId);

          if (!tx) {
            send(rpcError(rpcId, PAYME_ERRORS.TRANSACTION_NOT_FOUND));
            return;
          }

          send(
            rpcResult(rpcId, {
              create_time: tx.create_time,
              perform_time: tx.perform_time,
              cancel_time: tx.cancel_time,
              transaction: tx.id,
              state: tx.state,
              reason: tx.reason,
              detail: buildPaymeDetail(tx.planId, tx.amount * 100),
            }),
          );
          return;
        }

        case "GetStatement": {
          const from = Number(params.from);
          const to = Number(params.to);
          const transactions = await getPaymeTransactionsForPeriod(from, to);

          send(
            rpcResult(rpcId, {
              transactions: transactions.map((tx) => ({
                id: tx.id,
                time: tx.create_time,
                amount: tx.amount * 100,
                account: { user_id: tx.userId },
                create_time: tx.create_time,
                perform_time: tx.perform_time,
                cancel_time: tx.cancel_time,
                transaction: tx.id,
                state: tx.state,
                reason: tx.reason,
              })),
            }),
          );
          return;
        }

        default:
          send(rpcError(rpcId, PAYME_ERRORS.METHOD_NOT_FOUND, method));
      }
    } catch (error) {
      request.log.error({ err: error }, "Payme callback error");
      send(rpcError(rpcId, PAYME_ERRORS.INTERNAL_ERROR));
    }
  };

  for (const callbackPath of CLICK_CALLBACK_PATHS) {
    app.post<{ Body: Record<string, unknown> }>(callbackPath, handleClickCallback);
  }

  for (const callbackPath of PAYME_CALLBACK_PATHS) {
    app.all(callbackPath, handlePaymeCallback);
  }
});
