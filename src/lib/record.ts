import { ethers } from 'ethers';
import { UserRecord, UserTempShare } from '../types';

export function increaseUserAmount(
  result: UserRecord,
  user: string,
  amount: ethers.BigNumberish
) {
  if (result[user]) {
    result[user] = result[user].add(amount);
  } else {
    result[user] = ethers.BigNumber.from(amount);
  }
}

export function increaseUserAmounts(
  result: UserRecord,
  datas: UserTempShare[]
) {
  for (const data of datas) {
    increaseUserAmount(result, data.user, data.share);
  }
}
