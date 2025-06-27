import { ethers } from 'ethers';
import { MorphoUserInstance } from '../pendle-api';
import { UserTempShare } from '../types';
import {
  getAllERC20Balances,
  getAllERC20BalancesMultiTokens,
  tryAggregateMulticall
} from '../multicall';
import { _1E18, Contracts } from '../consts';

/// [NOTE]: Skipping interest for now.

export async function resolveMorpho(
  syPerOneWLP: ethers.BigNumber,
  morphoAddress: string,
  morphoInfos: MorphoUserInstance[],
  blockNumber: number
): Promise<UserTempShare[]> {
  if (morphoInfos.length === 0) {
    return [];
  }

  const callDatas = morphoInfos.map((m) => ({
    target: morphoAddress,
    callData: Contracts.morphoBlueInterface.encodeFunctionData('position', [
      m.marketId,
      m.user
    ])
  }));

  const eqWlpBalance = (
    await tryAggregateMulticall(callDatas, blockNumber)
  ).map((b) => {
    if (!b) {
      return ethers.BigNumber.from(0);
    }
    const decoded = Contracts.morphoBlueInterface.decodeFunctionResult(
      'position',
      b
    );
    return ethers.BigNumber.from(decoded.collateral);
  });

  return eqWlpBalance.map((balance, i) => ({
    user: morphoInfos[i].user,
    share: balance.mul(syPerOneWLP).div(_1E18)
  }));
}
