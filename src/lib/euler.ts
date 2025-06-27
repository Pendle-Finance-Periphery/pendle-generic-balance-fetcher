import { ethers } from 'ethers';
import { EulerUserInstance } from '../pendle-api';
import { UserTempShare } from '../types';
import {
  getAllERC20Balances,
  getAllERC20BalancesMultiTokens
} from '../multicall';
import { _1E18 } from '../consts';

/// [NOTE]: Skipping interest for now.

export async function resolveEuler(
  syPerOneWLP: ethers.BigNumber,
  eulerInfos: EulerUserInstance[],
  blockNumber: number
): Promise<UserTempShare[]> {
  if (eulerInfos.length === 0) {
    return [];
  }

  const balances = await getAllERC20BalancesMultiTokens(
    eulerInfos.map((e) => e.asset),
    eulerInfos.map((e) => e.user),
    blockNumber
  );

  const res: UserTempShare[] = [];
  for (let i = 0; i < eulerInfos.length; ++i) {
    res.push({
      user: eulerInfos[i].user,
      share: balances[i].mul(syPerOneWLP).div(_1E18)
    });
  }
  return res;
}
