import { ethers } from 'ethers';
import { UserRecord, UserTempShare } from './types';
import {
  getAllERC20Balances,
  getAllMarketActiveBalances,
  getAllYTInterestData,
  getYTGeneralData
} from './multicall';
import { POOL_INFO } from './configuration';
import * as constants from './consts';
import { FullMarketInfo, LiquidLockerData } from './pendle-api';
import { getLpToSyRate } from './libs/lp-price';
import { increaseUserAmount, increaseUserAmounts } from './lib/record';
import { resolveLiquidLocker } from './lib/liquid-locker';
import { getMMType, MMType } from './lib/mmType';
import { resolveEuler } from './lib/euler';
import { resolveSilo } from './lib/silo';
import { resolveMorpho } from './lib/morpho';

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

  const [balancesRaw, allInterestsRaw] = await Promise.all([
    getAllERC20Balances(POOL_INFO.YT, allUsers, blockNumber),
    getAllYTInterestData(POOL_INFO.YT, allUsers, blockNumber)
  ]);

  const balances = balancesRaw.map((v, i) => {
    return {
      user: allUsers[i],
      balance: v
    };
  });

  const allInterests = allInterestsRaw.map((v, i) => {
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
  lpInfo: FullMarketInfo,
  blockNumber: number
): Promise<void> {
  const totalSy = (
    await getAllERC20Balances(POOL_INFO.SY, [lpToken], blockNumber)
  )[0];

  const allActiveBalances = await getAllMarketActiveBalances(
    lpToken,
    lpInfo.lpHolders,
    blockNumber
  );
  const totalActiveSupply = allActiveBalances.reduce(
    (a, b) => a.add(b),
    ethers.BigNumber.from(0)
  );

  for (let i = 0; i < lpInfo.lpHolders.length; ++i) {
    const holder = lpInfo.lpHolders[i];
    const boostedSyBalance = allActiveBalances[i]
      .mul(totalSy)
      .div(totalActiveSupply);

    if (
      lpInfo.wlpInfo &&
      holder.toLowerCase() === lpInfo.wlpInfo.wlp.toLowerCase()
    ) {
      await applyWlpHolderShares(result, lpInfo, blockNumber, boostedSyBalance);
      continue;
    }

    const llIndex = lpInfo.llDatas.findIndex(
      (data) => data.lpHolder.toLowerCase() === holder.toLowerCase()
    );

    if (llIndex === -1) {
      increaseUserAmount(result, holder, boostedSyBalance);
    } else {
      increaseUserAmounts(
        result,
        await resolveLiquidLocker(
          boostedSyBalance,
          lpInfo.llDatas[llIndex],
          blockNumber
        )
      );
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
  const balances = await getAllERC20Balances(lpToken, allUsers, blockNumber);

  const price = await getLpToSyRate(lpToken, ytToken, blockNumber);

  await Promise.all(
    allUsers.map(async (holder, i) => {
      holder = allUsers[i];
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
          blockNumber
        );

        if (!receiptBalances) {
          return;
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
    })
  );
}

async function applyWlpHolderShares(
  result: UserRecord,
  lpInfo: FullMarketInfo,
  blockNumber: number,
  boostedSyBalance: ethers.BigNumber
): Promise<void> {
  if (!lpInfo.wlpInfo) {
    return;
  }

  const balances = await getAllERC20Balances(
    lpInfo.wlpInfo.wlp,
    lpInfo.wlpInfo.wlpHolders,
    blockNumber
  );
  const totalSupply = balances.reduce(
    (a, b) => a.add(b),
    ethers.BigNumber.from(0)
  );

  const syPerOneWLP = boostedSyBalance.mul(constants._1E18).div(totalSupply);

  let totalMMShares = new Map<MMType, ethers.BigNumber>();

  for (let i = 0; i < lpInfo.wlpInfo.wlpHolders.length; ++i) {
    const holder = lpInfo.wlpInfo.wlpHolders[i];
    const wlpBalance = balances[i];
    const userShare = wlpBalance.mul(syPerOneWLP).div(constants._1E18);

    let mmType = getMMType(lpInfo, holder);
    if (mmType) {
      totalMMShares.set(
        mmType,
        (totalMMShares.get(mmType) || ethers.BigNumber.from(0)).add(userShare)
      );
      continue;
    }
    increaseUserAmount(result, holder, userShare);
  }

  const [eulerShares, siloShares, morphoShares] = await Promise.all([
    resolveEuler(syPerOneWLP, lpInfo.wlpInfo.euler, blockNumber),
    resolveSilo(syPerOneWLP, lpInfo.wlpInfo.silo, blockNumber),
    resolveMorpho(
      syPerOneWLP,
      lpInfo.wlpInfo.morphoAddress,
      lpInfo.wlpInfo.morpho,
      blockNumber
    )
  ]);

  softCheck(
    eulerShares,
    totalMMShares.get('EULER') || ethers.BigNumber.from(0)
  );
  softCheck(siloShares, totalMMShares.get('SILO') || ethers.BigNumber.from(0));
  softCheck(
    morphoShares,
    totalMMShares.get('MORPHO') || ethers.BigNumber.from(0)
  );
  increaseUserAmounts(result, eulerShares);
  increaseUserAmounts(result, siloShares);
  increaseUserAmounts(result, morphoShares);
}

function softCheck(shares: UserTempShare[], upperbound: ethers.BigNumber) {
  const total = shares.reduce(
    (a, b) => a.add(b.share),
    ethers.BigNumber.from(0)
  );
  if (total.gt(upperbound)) {
    throw new Error(
      `Total shares ${total.toString()} exceeds upper bound ${upperbound.toString()}`
    );
  }
}
