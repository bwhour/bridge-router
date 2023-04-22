import { gql } from "graphql-request";

// Contains all subgraph queries used by router

export const getSenderTransactionsQuery = gql`
  query GetSenderTransactions($routerId: ID!, $sendingChainId: BigInt!, $status: TransactionStatus) {
    router(id: $routerId) {
      transactions(
        where: { status: $status, sendingChainId: $sendingChainId }
        orderBy: preparedBlockNumber
        orderDirection: desc
      ) {
        id
        status
        chainId
        user {
          id
        }
        router {
          id
        }
        initiator
        receivingChainTxManagerAddress
        sendingAssetId
        receivingAssetId
        sendingChainFallback
        receivingAddress
        callTo
        sendingChainId
        receivingChainId
        callDataHash
        transactionId
        amount
        expiry
        preparedBlockNumber
        encryptedCallData
        encodedBid
        bidSignature
        prepareCaller
        fulfillCaller
        cancelCaller
        prepareTransactionHash
        fulfillTransactionHash
        cancelTransactionHash
      }
    }
  }
`;

export const getReceiverTransactionsQuery = gql`
  query GetReceiverTransactions(
    $routerId: ID!
    $receivingChainId: BigInt!
    $status: TransactionStatus
    $expiry_lt: BigInt
  ) {
    router(id: $routerId) {
      transactions(
        where: { status: $status, receivingChainId: $receivingChainId, expiry_lt: $expiry_lt }
        orderBy: preparedBlockNumber
        orderDirection: desc
      ) {
        id
        status
        chainId
        user {
          id
        }
        router {
          id
        }
        initiator
        receivingChainTxManagerAddress
        sendingAssetId
        receivingAssetId
        sendingChainFallback
        receivingAddress
        callTo
        sendingChainId
        receivingChainId
        callDataHash
        transactionId
        amount
        expiry
        preparedBlockNumber
        encryptedCallData
        encodedBid
        bidSignature
        prepareCaller
        fulfillCaller
        cancelCaller
        prepareTransactionHash
        fulfillTransactionHash
        cancelTransactionHash
      }
    }
  }
`;

export const getTransactionByIdQuery = gql`
  query GetTransaction($transactionId: ID!) {
    transaction(id: $transactionId) {
      id
      status
      chainId
      user {
        id
      }
      router {
        id
      }
      initiator
      receivingChainTxManagerAddress
      sendingAssetId
      receivingAssetId
      sendingChainFallback
      receivingAddress
      callTo
      sendingChainId
      receivingChainId
      callDataHash
      transactionId
      amount
      expiry
      preparedBlockNumber
      encryptedCallData
      #
      encodedBid
      bidSignature
      relayerFee
      signature
      prepareCaller
      fulfillCaller
      cancelCaller
      prepareTransactionHash
      fulfillTransactionHash
      cancelTransactionHash
    }
  }
`;

export const getTransactionsByIdsQuery = gql`
  query GetTransactions($transactionIds: [Bytes!]) {
    transactions(where: { transactionId_in: $transactionIds }) {
      id
      status
      chainId
      user {
        id
      }
      router {
        id
      }
      initiator
      receivingChainTxManagerAddress
      sendingAssetId
      receivingAssetId
      sendingChainFallback
      receivingAddress
      callTo
      sendingChainId
      receivingChainId
      callDataHash
      transactionId
      amount
      expiry
      preparedBlockNumber
      relayerFee
      signature
      callData
      prepareCaller
      fulfillCaller
      cancelCaller
      prepareTransactionHash
      fulfillTransactionHash
      cancelTransactionHash
    }
  }
`;

export const getTransactionsByIdsWithRouterQuery = gql`
  query GetTransactionsWithRouter($transactionIds: [Bytes!], $routerId: String!) {
    transactions(where: { transactionId_in: $transactionIds, router: $routerId }) {
      id
      status
      chainId
      user {
        id
      }
      router {
        id
      }
      initiator
      receivingChainTxManagerAddress
      sendingAssetId
      receivingAssetId
      sendingChainFallback
      receivingAddress
      callTo
      sendingChainId
      receivingChainId
      callDataHash
      transactionId
      amount
      expiry
      preparedBlockNumber
      relayerFee
      signature
      callData
      prepareCaller
      fulfillCaller
      cancelCaller
      prepareTransactionHash
      fulfillTransactionHash
      cancelTransactionHash
    }
  }
`;

export const getAssetBalanceById = gql`
  query GetAssetBalance($assetBalanceId: ID!) {
    assetBalance(id: $assetBalanceId) {
      amount
    }
  }
`;

export const getRouterAssetBalancesQuery = gql`
  query GetAssetBalances($routerId: String!) {
    assetBalances(where: { router: $routerId }) {
      amount
      assetId
    }
  }
`;

export const getBlockNumber = gql`
  query GetBlockNumber {
    _meta {
      block {
        number
      }
    }
  }
`;
