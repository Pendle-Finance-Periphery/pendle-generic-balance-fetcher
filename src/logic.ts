import { ethers } from 'ethers';
import { UserRecord } from './types';
import {
  getAllERC20Balances,
  getAllMarketActiveBalances,
  getAllYTInterestData,
  getYTGeneralData
} from './multicall';
import { POOL_INFO } from './configuration';
import * as constants from './consts';
import { LiquidLockerData } from './pendle-api';
import { getLpToSyRate } from './libs/lp-price';

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
  const generalData = await getYTGeneralData(POOL_INFO.YT, blockNumber);
  if (generalData.isExpired) {
    increaseUserAmount(
      result,
      constants.PENDLE_TREASURY,
      generalData.syReserve
    );
    return;
  }

  const balances = (
    await getAllERC20Balances(POOL_INFO.YT, allUsers, blockNumber, false)
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

  const factoryContract = new ethers.Contract(
    generalData.factory,
    constants.ABIs.pendleYieldContractFactory,
    constants.PROVIDER
  );

  const feeRate = await factoryContract.rewardFeeRate({
    blockTag: blockNumber
  });

  for (const b of balances) {
    const impliedBalance = constants._1E18.mul(b.balance).div(YTIndex);
    const feeShare = impliedBalance.mul(feeRate).div(constants._1E18);
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
  llDatas: LiquidLockerData[],
  blockNumber: number
): Promise<void> {
  const totalSy = (
    await getAllERC20Balances(POOL_INFO.SY, [lpToken], blockNumber, false)
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

  for (let i = 0; i < allUsers.length; ++i) {
    const holder = allUsers[i];
    const llIndex = llDatas.findIndex(
      (data) => data.lpHolder.toLowerCase() === holder.toLowerCase()
    );

    const boostedSyBalance = allActiveBalances[i]
      .mul(totalSy)
      .div(totalActiveSupply);

    if (llIndex === -1) {
      increaseUserAmount(result, holder, boostedSyBalance);
    } else {
      const llData = llDatas[llIndex];
      const users = llData.users;
      const receiptToken = llData.receiptToken;

      const balances = await getAllERC20Balances(
        receiptToken,
        users,
        blockNumber,
        true
      );

      if (!balances) {
        continue;
      }

      const totalReceiptBalance = balances.reduce(
        (a, b) => a.add(b),
        ethers.BigNumber.from(0)
      );

      for (let j = 0; j < users.length; ++j) {
        const user = users[j];
        const receiptBalance = balances[j];

        if (receiptBalance.isZero()) {
          continue;
        }

        const userShare = receiptBalance
          .mul(boostedSyBalance)
          .div(totalReceiptBalance);

        increaseUserAmount(result, user, userShare);
      }
    }
  }
}

export async function applyLpHolderValuesInSY(
  result: UserRecord,
  lpToken: string,
  ytToken: string,
  allUsers: string[],
  llDatas: LiquidLockerData[],
  blockNumber: number
): Promise<void> {
  const balances = await getAllERC20Balances(
    lpToken,
    allUsers,
    blockNumber,
    false
  );

  const price = await getLpToSyRate(lpToken, ytToken, blockNumber);

  for (let i = 0; i < allUsers.length; ++i) {
    const holder = allUsers[i];
    const llIndex = llDatas.findIndex(
      (data) => data.lpHolder.toLowerCase() === holder.toLowerCase()
    );

    if (llIndex === -1) {
      increaseUserAmount(
        result,
        holder,
        balances[i].mul(price).div(constants._1E18)
      );
    } else {
      const llData = llDatas[llIndex];
      const users = llData.users;
      const receiptToken = llData.receiptToken;

      const receiptBalances = await getAllERC20Balances(
        receiptToken,
        users,
        blockNumber,
        true
      );

      if (!receiptBalances) {
        continue;
      }

      const totalReceiptBalance = receiptBalances.reduce(
        (a, b) => a.add(b),
        ethers.BigNumber.from(0)
      );

      for (let j = 0; j < users.length; ++j) {
        const user = users[j];
        const receiptBalance = receiptBalances[j];

        if (receiptBalance.isZero()) {
          continue;
        }

        const userShare = receiptBalance
          .mul(balances[i])
          .mul(price)
          .div(totalReceiptBalance)
          .div(constants._1E18);

        increaseUserAmount(result, user, userShare);
      }
    }
  }
}
