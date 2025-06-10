import { BigNumber, utils } from 'ethers';
import * as constants from './consts';
import { YTInterestData } from './types';

export async function aggregateMulticall(
  callDatas: { target: string; callData: string }[],
  blockNumber: number
) {
  const multicall = constants.Contracts.multicall;
  const result = [];
  for (
    let start = 0;
    start < callDatas.length;
    start += constants.MULTICALL_BATCH_SIZE
  ) {
    const resp = (
      await multicall.callStatic.aggregate(
        callDatas
          .slice(start, start + constants.MULTICALL_BATCH_SIZE)
          .map((c) => [c.target, c.callData]),
        {
          blockTag: blockNumber
        }
      )
    ).returnData;
    result.push(...resp);
  }
  return result;
}

export async function getAllERC20Balances(
  token: string,
  addresses: string[],
  blockNumber: number,
  checkRequired: false
): Promise<BigNumber[]>;

export async function getAllERC20Balances(
  token: string,
  addresses: string[],
  blockNumber: number,
  checkRequired: boolean
): Promise<BigNumber[] | null>;

export async function getAllERC20Balances(
  token: string,
  addresses: string[],
  blockNumber: number,
  checkRequired: boolean
): Promise<BigNumber[] | null> {
  if (checkRequired) {
    const code = await constants.PROVIDER.getCode(token, blockNumber);
    if (code == '0x') {
      return null;
    }
  }

  const callDatas = addresses.map((address) => ({
    target: token,
    callData: constants.Contracts.marketInterface.encodeFunctionData(
      'balanceOf',
      [address]
    )
  }));
  const balances = await aggregateMulticall(callDatas, blockNumber);
  return balances.map((b) =>
    BigNumber.from(utils.defaultAbiCoder.decode(['uint256'], b)[0])
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
  const balances = await aggregateMulticall(callDatas, blockNumber);
  return balances.map((b) =>
    BigNumber.from(utils.defaultAbiCoder.decode(['uint256'], b)[0])
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
  const interests = await aggregateMulticall(callDatas, blockNumber);
  return interests.map((b) => {
    const rawData = utils.defaultAbiCoder.decode(['uint128', 'uint128'], b);
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

  const result = await aggregateMulticall(callDatas, blockNumber);
  const isExpired = utils.defaultAbiCoder.decode(['bool'], result[0])[0];
  const syReserve = BigNumber.from(
    utils.defaultAbiCoder.decode(['uint256'], result[1])[0]
  );
  const factory = utils.defaultAbiCoder.decode(['address'], result[2])[0];

  return {
    isExpired,
    syReserve,
    factory
  };
}
