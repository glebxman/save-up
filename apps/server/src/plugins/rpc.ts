import fp from "fastify-plugin";

import { dispatchRpc } from "../rpc/router.js";
import type { JsonRpcRequest } from "../rpc/types.js";

export const rpcPlugin = fp(async (app) => {
  app.post<{ Body: JsonRpcRequest }>("/rpc", async (request, reply) => {
    const reqId = String(request.id);
    const log = request.log.child({ rpcMethod: request.body?.method, reqId });

    log.debug({ params: redactParams(request.body?.params) }, "rpc call");

    const payload = await dispatchRpc(request.body, { app, reqId, log });

    if ("error" in payload) {
      log.warn({ rpcError: payload.error }, "rpc error");
      reply.code(400);
    }

    return payload;
  });
});

function redactParams(params: unknown): unknown {
  if (!params || typeof params !== "object") return params;
  const copy = { ...(params as Record<string, unknown>) };
  if ("initData" in copy) copy["initData"] = "[redacted]";
  if ("base64Audio" in copy) copy["base64Audio"] = "[redacted]";
  if ("base64Data" in copy) copy["base64Data"] = "[redacted]";
  if ("base64Photo" in copy) copy["base64Photo"] = "[redacted]";
  if ("pin" in copy) copy["pin"] = "[redacted]";
  return copy;
}
