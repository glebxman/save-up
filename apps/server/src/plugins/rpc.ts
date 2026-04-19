import fp from "fastify-plugin";

import { dispatchRpc } from "../rpc/router.js";
import type { JsonRpcRequest } from "../rpc/types.js";

export const rpcPlugin = fp(async (app) => {
  app.post<{ Body: JsonRpcRequest }>("/rpc", async (request, reply) => {
    const payload = await dispatchRpc(request.body, { app });

    if ("error" in payload) {
      reply.code(400);
    }

    return payload;
  });
});
