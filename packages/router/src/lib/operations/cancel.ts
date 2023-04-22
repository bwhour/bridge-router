import {
  ajv,
  createLoggingContext,
  getNtpTimeSeconds,
  InvariantTransactionData,
  InvariantTransactionDataSchema,
  RequestContext,
} from "@connext/nxtp-utils";
import { providers, constants, BigNumber, utils } from "ethers";

import { getContext } from "../../router";
import { ParamsInvalid, ReceiverTxExists } from "../errors";
import { CancelInput, CancelInputSchema } from "../entities";
import { TransactionStatus } from "../../adapters/subgraph/runtime/graphqlsdk";
import { SenderTxTooNew } from "../errors/cancel";
import { signRouterCancelTransactionPayload } from "../helpers";

export const SENDER_PREPARE_BUFFER_TIME = 60 * 13; // 13 mins (780s)
// bsc has 3s block time, is often given 250 lag blocks

const { AddressZero } = constants;
export const cancel = async (
  invariantData: InvariantTransactionData,
  input: CancelInput,
  _requestContext: RequestContext<string>,
): Promise<providers.TransactionReceipt | undefined> => {
  const { requestContext, methodContext } = createLoggingContext(cancel.name, _requestContext);

  const {
    logger,
    contractWriter,
    contractReader,
    txService,
    isRouterContract,
    config,
    wallet,
    routerAddress,
    chainData,
  } = getContext();
  logger.info("Method start", requestContext, methodContext, { invariantData, input });

  // Validate InvariantData schema
  const validateInvariantData = ajv.compile(InvariantTransactionDataSchema);
  const validInvariantData = validateInvariantData(invariantData);
  if (!validInvariantData) {
    const error = validateInvariantData.errors?.map((err: any) => `${err.instancePath} - ${err.message}`).join(",");
    throw new ParamsInvalid({
      methodContext,
      invariantData,
      paramsError: error,
      requestContext,
    });
  }

  // Validate Prepare Input schema
  const validateInput = ajv.compile(CancelInputSchema);
  const validInput = validateInput(input);
  if (!validInput) {
    const error = validateInput.errors?.map((err: any) => `${err.instancePath} - ${err.message}`).join(",");
    throw new ParamsInvalid({
      input,
      paramsError: error,
      requestContext,
      methodContext,
    });
  }

  const { side, preparedTransactionHash, ...variant } = input;

  let routerRelayerFeeAsset = AddressZero;
  let routerRelayerFee = BigNumber.from("0");

  let cancelChain: number;
  if (side === "sender") {
    cancelChain = invariantData.sendingChainId;
    const existing = await contractReader.getTransactionForChain(
      invariantData.transactionId,
      invariantData.user,
      invariantData.receivingChainId,
    );
    const currentTime = await getNtpTimeSeconds();
    if (existing && existing.status !== TransactionStatus.Cancelled && currentTime < existing?.txData.expiry) {
      throw new ReceiverTxExists(invariantData.transactionId, invariantData.receivingChainId, {
        requestContext,
        methodContext,
        existing,
        currentTime,
      });
    }

    // prepare at 1000, 1000 > 2000 - 750
    // https://developer.offchainlabs.com/docs/time_in_arbitrum#ethereum-block-numbers-within-arbitrum
    const receipt = await txService.getTransactionReceipt(invariantData.sendingChainId, preparedTransactionHash);
    const preparedBlock = await txService.getBlock(invariantData.sendingChainId, receipt.blockNumber);

    if (!preparedBlock || currentTime < preparedBlock.timestamp + SENDER_PREPARE_BUFFER_TIME) {
      throw new SenderTxTooNew(
        invariantData.transactionId,
        invariantData.sendingChainId,
        preparedBlock?.timestamp ?? 0,
        currentTime,
        {
          requestContext,
          methodContext,
          preparedBlock: {
            exists: !!preparedBlock,
            timestamp: preparedBlock?.timestamp,
            blockNumber: receipt.blockNumber,
          },
          currentTime,
        },
      );
    }
  } else {
    cancelChain = invariantData.receivingChainId;
  }

  let receipt: providers.TransactionReceipt;

  if (isRouterContract) {
    routerRelayerFeeAsset = utils.getAddress(config.chainConfig[cancelChain].routerContractRelayerAsset || AddressZero);
    const relayerFeeAssetDecimal = await txService.getDecimalsForAsset(cancelChain, routerRelayerFeeAsset);
    routerRelayerFee = await txService.calculateGasFee(
      cancelChain,
      routerRelayerFeeAsset,
      relayerFeeAssetDecimal,
      "cancel",
      isRouterContract,
      chainData,
      requestContext,
    );

    const signature = await signRouterCancelTransactionPayload(
      { ...invariantData, ...variant },
      "0x",
      "0x",
      routerRelayerFeeAsset,
      routerRelayerFee.toString(),
      cancelChain,
      wallet,
    );

    receipt = await contractWriter.cancelRouterContract(
      cancelChain,
      {
        txData: {
          ...invariantData,
          preparedBlockNumber: variant.preparedBlockNumber,
          amount: variant.amount,
          expiry: variant.expiry,
        },
        signature: "0x",
      },
      routerAddress,
      signature,
      routerRelayerFeeAsset,
      routerRelayerFee.toString(),
      true,
      requestContext,
    );
  } else {
    // Send to tx service
    logger.info("Sending cancel tx", requestContext, methodContext, { side });

    receipt = await contractWriter.cancelTransactionManager(
      cancelChain,
      {
        txData: { ...invariantData, ...variant },
        signature: "0x",
      },
      requestContext,
    );
  }
  logger.info("Method complete", requestContext, methodContext, { transactionHash: receipt.transactionHash });
  return receipt;
};
