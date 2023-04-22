import { RequestContext, StatusResponse } from "@connext/nxtp-utils";

import { getContext } from "../../router";
import { handlingTracker, activeTransactionsTracker } from "../../bindings/contractReader";
// @ts-ignore
import { version } from "../../../package.json";

export const getStatus = (_requestContext: RequestContext<string>): StatusResponse => {
  const { isRouterContract, signerAddress, routerAddress, chainAssetSwapPoolMap } = getContext();

  const routerVersion = version;
  const trackerLength = handlingTracker.size;
  const activeTransactionsLength = activeTransactionsTracker.length;

  const supportedChains: number[] = Array.from(chainAssetSwapPoolMap.keys());

  const swapPools: Record<number, string[]> = {};
  [...chainAssetSwapPoolMap.entries()].forEach(([key, vals]) => {
    swapPools[key] = vals;
  });

  const _status: StatusResponse = {
    isRouterContract,
    routerVersion,
    routerAddress,
    signerAddress,
    trackerLength,
    activeTransactionsLength,
    swapPools,
    supportedChains,
  };

  return _status;
};
