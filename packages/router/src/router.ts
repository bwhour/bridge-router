import { logger, Signer, Wallet } from "ethers";
import {
  ChainData,
  createMethodContext,
  createRequestContext,
  getChainData,
  Logger,
  RouterNxtpNatsMessagingService,
} from "@connext/nxtp-utils";
import { TransactionService } from "@connext/nxtp-txservice";
import { Static } from "@sinclair/typebox";

import { getConfig, NxtpRouterConfig, TSwapPool } from "./config";
import { ContractReader, subgraphContractReader } from "./adapters/subgraph";
import { contractWriter, ContractWriter } from "./adapters/contract";
import { createRouterCache, RouterCache } from "./adapters/cache";
import { bindContractReader } from "./bindings/contractReader";
import { bindMessaging } from "./bindings/messaging";
import { bindFastify } from "./bindings/fastify";
import { bindMetrics } from "./bindings/metrics";
import { Web3Signer } from "./adapters/web3signer";
import { bindPrices } from "./bindings/prices";

export type Context = {
  config: NxtpRouterConfig;
  wallet: Wallet | Web3Signer;
  isRouterContract: boolean;
  routerAddress: string;
  signerAddress: string;
  logger: Logger;
  messaging: RouterNxtpNatsMessagingService;
  txService: TransactionService;
  contractReader: ContractReader;
  contractWriter: ContractWriter;
  chainData: Map<string, ChainData>;
  cache: RouterCache;
  chainAssetSwapPoolMap: Map<number, string[]>;
};

const context: Context = {} as any;
export const getContext = (): Context => {
  if (!context || Object.keys(context).length === 0) {
    throw new Error("Context not created");
  }
  return context;
};

export const initMessaging = async (params: { signer: Signer; authUrl: string; natsUrl: string; logger: Logger }) => {
  const messaging = new RouterNxtpNatsMessagingService({
    signer: params.signer,
    authUrl: params.authUrl,
    natsUrl: params.natsUrl,
    logger: params.logger,
  });
  await messaging.connect();
  return messaging;
};

export const getSwapPoolMap = async (params: {
  swapPools: Static<typeof TSwapPool>[];
  isRouterContract: boolean;
  txService: TransactionService;
  routerAddress: string;
}) => {
  const { routerAddress, swapPools, isRouterContract, txService } = params;
  const chainAssetSwapPoolMap = new Map<number, string[]>();
  // sanity check if router contract
  await Promise.all(
    swapPools.map(async (pool) => {
      await Promise.all(
        pool.assets.map(async ({ chainId, assetId }) => {
          // setting up chainAssetSwapPoolMap
          if (!chainAssetSwapPoolMap.has(chainId)) {
            chainAssetSwapPoolMap.set(chainId, []);

            if (isRouterContract) {
              const code = await txService.getCode(chainId, routerAddress);
              if (code === "0x") {
                throw new Error(`Router Contract isn't deployed on ${chainId}`);
              }
            }
          }
          chainAssetSwapPoolMap.get(chainId)!.push(assetId);
        }),
      );
    }),
  );
  return chainAssetSwapPoolMap;
};

export const makeRouter = async () => {
  const requestContext = createRequestContext("makeRouter");
  const methodContext = createMethodContext(makeRouter.name);
  try {
    // set up external, config based services
    const chainData = await getChainData();
    if (!chainData) {
      throw new Error("Could not get chain data");
    }
    context.chainData = chainData;
    context.config = await getConfig();
    context.wallet = context.config.mnemonic
      ? Wallet.fromMnemonic(context.config.mnemonic)
      : new Web3Signer(context.config.web3SignerUrl!);
    context.signerAddress = await context.wallet.getAddress();
    context.isRouterContract = context.config.routerContractAddress ? true : false;
    context.routerAddress = context.config.routerContractAddress || context.signerAddress;
    context.logger = new Logger({
      level: context.config.logLevel,
      name: context.wallet.address,
    });
    context.logger.info("Connected Router", requestContext, methodContext, {
      signerAddress: context.signerAddress,
      isRouterContract: context.isRouterContract,
      routerAddress: context.routerAddress,
    });

    context.logger.info("Config generated", requestContext, methodContext, {
      config: Object.assign(context.config, context.config.mnemonic ? { mnemonic: "......." } : { mnemonic: "N/A" }),
    });
    context.messaging = await initMessaging({
      signer: context.wallet,
      authUrl: context.config.authUrl,
      natsUrl: context.config.natsUrl,
      logger: context.logger,
    });

    // TODO: txserviceconfig log level
    context.txService = new TransactionService(
      context.logger.child({ module: "TransactionService" }, context.config.logLevel),
      context.config.chainConfig as any,
      context.wallet,
    );

    context.cache = createRouterCache();

    // adapters
    context.contractReader = subgraphContractReader();
    context.contractWriter = contractWriter();

    context.chainAssetSwapPoolMap = await getSwapPoolMap({
      txService: context.txService,
      isRouterContract: context.isRouterContract,
      swapPools: context.config.swapPools,
      routerAddress: context.routerAddress,
    });

    // bindings
    if (!context.config.diagnosticMode) {
      await bindContractReader();
    } else {
      logger.warn("Running router in diagnostic mode");
    }
    if (!context.config.cleanUpMode) {
      await bindMessaging();
    } else {
      logger.warn("Running router in cleanup mode");
    }

    if (context.config.priceCacheMode) {
      await bindPrices();
    } else {
      logger.warn("Running router not in price cache mode");
    }
    await bindFastify();
    await bindMetrics();
    logger.info("Router ready!");
  } catch (e) {
    console.error("Error starting router :(", e);
    process.exit();
  }
};
