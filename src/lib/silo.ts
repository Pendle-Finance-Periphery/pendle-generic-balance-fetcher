import { ethers } from 'ethers';
import { SiloUserInstance } from '../pendle-api';
import { UserTempShare } from '../types';
import {
  getAllERC20Balances,
  getAllERC20BalancesMultiTokens
} from '../multicall';
import { _1E18 } from '../consts';

const SILO_DECIMALS_OFFSET = 1000;

export async function resolveSilo(
  syPerOneLP: ethers.BigNumber,
  siloInfos: SiloUserInstance[],
  blockNumber: number
): Promise<UserTempShare[]> {
  if (siloInfos.length === 0) {
    return [];
  }

  const balances = await getAllERC20BalancesMultiTokens(
    siloInfos.map((s) => s.asset),
    siloInfos.map((s) => s.user),
    blockNumber
  );

  const res: UserTempShare[] = [];
  for (let i = 0; i < siloInfos.length; ++i) {
    res.push({
      user: siloInfos[i].user,
      share: balances[i].mul(syPerOneLP).div(_1E18).div(SILO_DECIMALS_OFFSET)
    });
  }
  return res;
}
