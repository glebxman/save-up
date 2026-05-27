import type { RpcMethod, RpcMethodMap } from "@finance-twa/shared-types";

export type MockHandler<M extends RpcMethod> = (
  params: RpcMethodMap[M]["params"],
) => RpcMethodMap[M]["result"] | Promise<RpcMethodMap[M]["result"]>;

export type MockHandlerMap = {
  [Method in RpcMethod]: MockHandler<Method>;
};
