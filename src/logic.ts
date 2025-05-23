import { BigNumber, ethers } from 'ethers';
import { UserRecord, YTInterestData } from './types';
import {
  getAllERC20Balances,
  getAllMarketActiveBalances,
  getAllYTInterestData
} from './multicall';
import { POOL_INFO } from './configuration';
import * as constants from './consts';

function increaseUserAmount(
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

export async function applyYtHolderShares(
  result: UserRecord,
  allUsers: string[],
  blockNumber: number
): Promise<void> {
  const balances = (
    await getAllERC20Balances(POOL_INFO.YT, allUsers, blockNumber)
  ).map((v, i) => {
    return {
      user: allUsers[i],
      balance: v
    };
  });

  const allInterests = (
    await getAllYTInterestData(POOL_INFO.YT, allUsers, blockNumber)
  ).map((v, i) => {
    return {
      user: allUsers[i],
      userIndex: v.index,
      amount: v.accrue
    };
  });

  const YTIndex = allInterests
    .map((v) => v.userIndex)
    .reduce((a, b) => {
      return a.gt(b) ? a : b;
    });

  const YTBalances: UserRecord = {};

  for (const b of balances) {
    const impliedBalance = constants._1E18.mul(b.balance).div(YTIndex);
    const feeShare = impliedBalance.mul(3).div(100);
    const remaining = impliedBalance.sub(feeShare);
    increaseUserAmount(result, b.user, remaining);
    increaseUserAmount(result, constants.PENDLE_TREASURY, feeShare);
    YTBalances[b.user] = b.balance;
  }

  for (const i of allInterests) {
    if (i.user == POOL_INFO.YT) {
      continue;
    }
    if (i.userIndex.eq(0)) {
      continue;
    }

    const pendingInterest = YTBalances[i.user]
      .mul(YTIndex.sub(i.userIndex))
      .mul(constants._1E18)
      .div(YTIndex.mul(i.userIndex));

    const totalInterest = pendingInterest.add(i.amount);
    increaseUserAmount(result, i.user, totalInterest);
  }
}

export async function applyLpHolderShares(
  result: UserRecord,
  lpToken: string,
  allUsers: string[],
  blockNumber: number
): Promise<void> {
  const totalSy = (
    await getAllERC20Balances(POOL_INFO.SY, [lpToken], blockNumber)
  )[0];
  const allActiveBalances = await getAllMarketActiveBalances(
    lpToken,
    allUsers,
    blockNumber
  );
  const totalActiveSupply = allActiveBalances.reduce(
    (a, b) => a.add(b),
    ethers.BigNumber.from(0)
  );

  async function processLiquidLocker(
    liquidLocker: string,
    totalBoostedSy: BigNumber,
    performanceFeeBps: BigNumber
  ) {
    const userBoostedSy = totalBoostedSy.sub(
      totalBoostedSy.mul(performanceFeeBps).div(10_000)
    );

    const validLockers = POOL_INFO.liquidLockers.filter(
      (v) => v.address == liquidLocker && v.lpToken == lpToken
    );

    if (
      validLockers.length == 0 ||
      validLockers[0].deployedBlock > blockNumber
    ) {
      return;
    }

    const receiptToken = validLockers[0].receiptToken;
    const allReceiptTokenBalances = await getAllERC20Balances(
      receiptToken,
      allUsers,
      blockNumber
    );
    const totalLiquidLockerShares = allReceiptTokenBalances.reduce(
      (a, b) => a.add(b),
      ethers.BigNumber.from(0)
    );

    if (totalLiquidLockerShares.eq(0)) {
      return;
    }

    for (let i = 0; i < allUsers.length; ++i) {
      const user = allUsers[i];
      const receiptTokenBalance = allReceiptTokenBalances[i];
      const boostedSyBalance = userBoostedSy
        .mul(receiptTokenBalance)
        .div(totalLiquidLockerShares);
      increaseUserAmount(result, user, boostedSyBalance);
    }
  }

  for (let i = 0; i < allUsers.length; ++i) {
    const holder = allUsers[i];
    const boostedSyBalance = allActiveBalances[i]
      .mul(totalSy)
      .div(totalActiveSupply);

    if (isLiquidLocker(holder)) {
      const locker = POOL_INFO.liquidLockers.find(
        (v) => v.address == holder && v.lpToken == lpToken
      );
      const performanceFeeBps =
        locker?.performanceFeeBps ?? ethers.BigNumber.from(0);

      await processLiquidLocker(holder, boostedSyBalance, performanceFeeBps);
    } else {
      increaseUserAmount(result, holder, boostedSyBalance);
    }
  }
}

function isLiquidLocker(addr: string) {
  return POOL_INFO.liquidLockers.some((v) => addr == v.address);
}
