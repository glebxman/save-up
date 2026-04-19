import type { RpcMethod, RpcMethodMap } from "@finance-twa/shared-types";
import type { FastifyInstance } from "fastify";

export type JsonRpcId = string | number | null;

export interface JsonRpcRequest<M extends RpcMethod = RpcMethod> {
  jsonrpc: "2.0";
  id: JsonRpcId;
  method: M;
  params: RpcMethodMap[M]["params"];
}

export interface JsonRpcSuccess<M extends RpcMethod = RpcMethod> {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result: RpcMethodMap[M]["result"];
}

export interface JsonRpcErrorObject {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcFailure {
  jsonrpc: "2.0";
  id: JsonRpcId;
  error: JsonRpcErrorObject;
}

export type JsonRpcResponse<M extends RpcMethod = RpcMethod> = JsonRpcSuccess<M> | JsonRpcFailure;

export interface RpcContext {
  app: FastifyInstance;
}

export type RpcHandler<M extends RpcMethod> = (
  params: RpcMethodMap[M]["params"],
  context: RpcContext,
) => Promise<RpcMethodMap[M]["result"]>;
