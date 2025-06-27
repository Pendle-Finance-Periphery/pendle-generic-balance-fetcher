import { CHAIN, POOL_INFO } from './configuration';
import { _1E18 } from './consts';
import { resolveMorpho } from './lib/morpho';
import {
  applyLpHolderShares,
  applyLpHolderValuesInSY,
  applyYtHolderShares
} from './logic';
import { tryAggregateMulticall } from './multicall';
import { FullMarketInfo, LiquidLockerData, PendleAPI } from './pendle-api';
import { UserRecord } from './types';

type SnapshotResult = {
  resultYT: UserRecord;
  resultLP: UserRecord;
};

async function fetchUserBalanceSnapshot(
  allYTUsers: string[],
  lpInfos: FullMarketInfo[],
  blockNumber: number
): Promise<SnapshotResult> {
  const resultYT: UserRecord = {};
  const resultLP: UserRecord = {};

  await Promise.all([
    applyYtHolderShares(resultYT, allYTUsers, blockNumber),
    ...lpInfos.map(async (lpInfo, i) => {
      const lp = POOL_INFO.LPs[i];
      if (lp.deployedBlock > blockNumber) return;
      await applyLpHolderShares(resultLP, lp.address, lpInfo, blockNumber);
    })
  ]);

  return {
    resultYT,
    resultLP
  };
}

async function fetchUserLpValueInSYSnapshot(
  lpInfos: FullMarketInfo[],
  blockNumber: number
): Promise<SnapshotResult> {
  const resultLP: UserRecord = {};
  for (let i = 0; i < POOL_INFO.LPs.length; ++i) {
    const lp = POOL_INFO.LPs[i];
    const llData = lpInfos[i].llDatas;
    if (lp.deployedBlock <= blockNumber) {
      await applyLpHolderValuesInSY(
        resultLP,
        lp.address,
        POOL_INFO.YT,
        lpInfos[i].lpHolders,
        llData,
        blockNumber
      );
    }
  }

  return {
    resultYT: {},
    resultLP
  };
}

async function fetchUserBalanceSnapshotBatch(
  blockNumbers: number[],
  fetchingLpValueInSY: boolean = false
): Promise<SnapshotResult[]> {
  const allYTUsers = await PendleAPI.queryToken(POOL_INFO.YT);
  const lpInfos = await Promise.all(
    POOL_INFO.LPs.map((lp) => PendleAPI.queryMarketInfo(CHAIN, lp.address))
  );
  return await Promise.all(
    blockNumbers.map((b) =>
      fetchingLpValueInSY
        ? fetchUserLpValueInSYSnapshot(lpInfos, b)
        : fetchUserBalanceSnapshot(allYTUsers, lpInfos, b)
    )
  );
}

async function main() {
  const block = 22795103;

  const res = (await fetchUserBalanceSnapshotBatch([block]))[0];

  for (const user in res.resultYT) {
    if (res.resultYT[user].eq(0)) continue;
    // console.log(user, res.resultYT[user].toString());
  }

  for (const user in res.resultLP) {
    if (res.resultLP[user].eq(0)) continue;
    console.log(user, res.resultLP[user].toString());
    return;
  }
}

main().catch(console.error);
