import { Interface } from "ethers/lib/utils";
import contractDeployments from "@connext/nxtp-contracts/deployments.json";
import PriceOracleArtifact from "@connext/nxtp-contracts/artifacts/contracts/ConnextPriceOracle.sol/ConnextPriceOracle.json";
import { ConnextPriceOracle as TConnextPriceOracle } from "@connext/nxtp-contracts/typechain";

/**
 * Helper to allow easy mocking
 */
export const getContractDeployments: any = () => {
  return contractDeployments;
};

/**
 * A number[] list of all chain IDs on which a Connext Price Oracle Contracts
 * have been deployed.
 */
export const CHAINS_WITH_PRICE_ORACLES: number[] = ((): number[] => {
  const chainIdsForGasFee: number[] = [];
  const _contractDeployments = getContractDeployments();
  Object.keys(_contractDeployments).forEach((chainId) => {
    const record = _contractDeployments[chainId];
    const chainName = Object.keys(record)[0];
    if (chainName) {
      const priceOracleContract = record[chainName]?.contracts?.ConnextPriceOracle;
      if (priceOracleContract) {
        chainIdsForGasFee.push(parseInt(chainId));
      }
    }
  });
  return chainIdsForGasFee;
})();

/**
 * Returns the address of the Connext Price Oracle contract deployed on the
 * given chain ID; returns undefined if no such contract has been deployed.
 *
 * @param chainId - The chain you want the address on.
 *
 * @returns The deployed address or undefined if the contract has not yet been
 * deployed.
 */
export const getDeployedPriceOracleContract = (chainId: number): { address: string; abi: any } | undefined => {
  const _contractDeployments = getContractDeployments();
  const record = _contractDeployments[chainId.toString()] ?? {};
  const name = Object.keys(record)[0];
  if (!name) {
    return undefined;
  }
  const contract = record[name]?.contracts?.ConnextPriceOracle;
  return contract ? { address: contract.address, abi: contract.abi } : undefined;
};

/**
 * Convenience method for initializing an Interface object for the Connext
 * Price Oracle contract ABI.
 *
 * @returns An ethers Interface object initialized with the Connext Price
 * Oracle ABI.
 */
export const getPriceOracleInterface = () => new Interface(PriceOracleArtifact.abi) as TConnextPriceOracle["interface"];
