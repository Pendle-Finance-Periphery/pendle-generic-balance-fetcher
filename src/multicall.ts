import { BigNumber, utils } from 'ethers';
import * as constants from './consts';
import { YTInterestData } from './types';

export async function tryAggregateMulticall(
  callDatas: { target: string; callData: string }[],
  blockNumber: number
): Promise<(string | null)[]> {
  const multicall = constants.Contracts.multicall;
  const result: (string | null)[] = [];
  for (
    let start = 0;
    start < callDatas.length;
    start += constants.MULTICALL_BATCH_SIZE
  ) {
    const resp = await multicall.callStatic.tryAggregate(
      false,
      callDatas
        .slice(start, start + constants.MULTICALL_BATCH_SIZE)
        .map((c) => [c.target, c.callData]),
      {
        blockTag: blockNumber
      }
    );

    for (let r of resp) {
      if (r.success === false) {
        result.push(null);
      } else {
        result.push(r.returnData as string);
      }
    }
  }
  return result;
}

export async function getAllERC20BalancesMultiTokens(
  tokens: string[],
  addresses: string[],
  blockNumber: number
): Promise<BigNumber[]> {
  const callDatas = tokens.map((token, index) => ({
    target: token,
    callData: constants.Contracts.marketInterface.encodeFunctionData(
      'balanceOf',
      [addresses[index]]
    )
  }));
  const balances = await tryAggregateMulticall(callDatas, blockNumber);
  return balances.map((b) =>
    b
      ? BigNumber.from(utils.defaultAbiCoder.decode(['uint256'], b)[0])
      : BigNumber.from(0)
  );
}

export async function getAllERC20Balances(
  token: string,
  addresses: string[],
  blockNumber: number
): Promise<BigNumber[]> {
  const callDatas = addresses.map((address) => ({
    target: token,
    callData: constants.Contracts.marketInterface.encodeFunctionData(
      'balanceOf',
      [address]
    )
  }));
  const balances = await tryAggregateMulticall(callDatas, blockNumber);
  return balances.map((b) =>
    b
      ? BigNumber.from(utils.defaultAbiCoder.decode(['uint256'], b)[0])
      : BigNumber.from(0)
  );
}

export async function getAllMarketActiveBalances(
  market: string,
  addresses: string[],
  blockNumber: number
): Promise<BigNumber[]> {
  const callDatas = addresses.map((address) => ({
    target: market,
    callData: constants.Contracts.marketInterface.encodeFunctionData(
      'activeBalance',
      [address]
    )
  }));
  const balances = await tryAggregateMulticall(callDatas, blockNumber);
  return balances.map((b) =>
    BigNumber.from(utils.defaultAbiCoder.decode(['uint256'], b!)[0])
  );
}

export async function getAllYTInterestData(
  yt: string,
  addresses: string[],
  blockNumber: number
): Promise<YTInterestData[]> {
  const callDatas = addresses.map((address) => ({
    target: yt,
    callData: constants.Contracts.yieldTokenInterface.encodeFunctionData(
      'userInterest',
      [address]
    )
  }));
  const interests = await tryAggregateMulticall(callDatas, blockNumber);
  return interests.map((b) => {
    const rawData = utils.defaultAbiCoder.decode(['uint128', 'uint128'], b!);
    return {
      index: BigNumber.from(rawData[0]),
      accrue: BigNumber.from(rawData[1])
    };
  });
}

export async function getYTGeneralData(
  ytAddr: string,
  blockNumber: number
): Promise<{ isExpired: boolean; syReserve: BigNumber; factory: string }> {
  const callDatas = [
    {
      target: ytAddr,
      callData: constants.Contracts.yieldTokenInterface.encodeFunctionData(
        'isExpired',
        []
      )
    },
    {
      target: ytAddr,
      callData: constants.Contracts.yieldTokenInterface.encodeFunctionData(
        'syReserve',
        []
      )
    },
    {
      target: ytAddr,
      callData: constants.Contracts.yieldTokenInterface.encodeFunctionData(
        'factory',
        []
      )
    }
  ];

  const result = await tryAggregateMulticall(callDatas, blockNumber);
  const isExpired = utils.defaultAbiCoder.decode(['bool'], result[0]!)[0];
  const syReserve = BigNumber.from(
    utils.defaultAbiCoder.decode(['uint256'], result[1]!)[0]
  );
  const factory = utils.defaultAbiCoder.decode(['address'], result[2]!)[0];

  return {
    isExpired,
    syReserve,
    factory
  };
}
