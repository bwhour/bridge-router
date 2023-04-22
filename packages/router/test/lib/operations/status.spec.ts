import { expect, createLoggingContext, mkBytes32, StatusResponse, mkAddress } from "@connext/nxtp-utils";

import { getStatus } from "../../../src/lib/operations/status";

import { ctxMock } from "../../globalTestHook";

const { requestContext } = createLoggingContext("TEST", undefined, mkBytes32("0xabc"));

describe("Status Operation", () => {
  it("should work", () => {
    const ctxMockAssets = ctxMock.config.swapPools[0].assets;
    const res = getStatus(requestContext);
    const resSwapPools = res.swapPools;

    ctxMockAssets.forEach(({ assetId, chainId }) => {
      expect(resSwapPools[chainId].includes(assetId)).to.be.true;
    });
  });
});
