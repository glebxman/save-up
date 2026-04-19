import type { RpcMethod, RpcMethodMap } from "@finance-twa/shared-types";

import { mockRpcRequest } from "./mock";

const RPC_ENDPOINT = import.meta.env.VITE_API_URL ?? "/rpc";
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === "true";

let requestId = 0;

interface RpcSuccess<T> {
  jsonrpc: "2.0";
  id: number;
  result: T;
}

interface RpcFailure {
  jsonrpc: "2.0";
  id: number;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

type RpcResponse<T> = RpcSuccess<T> | RpcFailure;

export async function rpcRequest<Method extends RpcMethod>(
  method: Method,
  params: RpcMethodMap[Method]["params"],
): Promise<RpcMethodMap[Method]["result"]> {
  if (USE_MOCK_API) {
    return mockRpcRequest(method, params);
  }

  requestId += 1;

  let response: Response;

  try {
    response = await fetch(RPC_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: requestId,
        method,
        params,
      }),
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        `Cannot reach backend at ${RPC_ENDPOINT}. Start npm run dev for the real API or npm run dev:mock for offline UI testing.`,
      );
    }

    throw error;
  }

  const payload = (await response.json()) as RpcResponse<RpcMethodMap[Method]["result"]>;

  if (!response.ok && !("error" in payload)) {
    throw new Error(`RPC request failed with HTTP ${response.status}`);
  }

  if ("error" in payload) {
    throw new Error(payload.error.message);
  }

  return payload.result;
}
