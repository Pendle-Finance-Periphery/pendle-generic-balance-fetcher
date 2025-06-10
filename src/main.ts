import { CHAIN, POOL_INFO } from './configuration';
import { applyLpHolderShares, applyYtHolderShares } from './logic';
import { LiquidLockerData, PendleAPI } from './pendle-api';
import { UserRecord } from './types';

type SnapshotResult = {
  resultYT: UserRecord;
  resultLP: UserRecord;
};

async function fetchUserBalanceSnapshot(
  allYTUsers: string[],
  allLPUsers: string[],
  allLLDatas: LiquidLockerData[][],
  blockNumber: number
): Promise<SnapshotResult> {
  const resultYT: UserRecord = {};
  const resultLP: UserRecord = {};
  await applyYtHolderShares(resultYT, allYTUsers, blockNumber);

  for (let i = 0; i < POOL_INFO.LPs.length; ++i) {
    const lp = POOL_INFO.LPs[i];
    const llData = allLLDatas[i];
    if (lp.deployedBlock <= blockNumber) {
      await applyLpHolderShares(
        resultLP,
        lp.address,
        allLPUsers,
        llData,
        blockNumber
      );
    }
  }

  return {
    resultYT,
    resultLP
  };
}

async function fetchUserBalanceSnapshotBatch(
  blockNumbers: number[]
): Promise<SnapshotResult[]> {
  const allLPTokens = POOL_INFO.LPs.map((l) => l.address);

  const allYTUsers = await PendleAPI.query(POOL_INFO.YT);
  const allLPUsers = await PendleAPI.queryAllTokens([...allLPTokens]);

  const allLLDatas: LiquidLockerData[][] = [];
  for (let market of POOL_INFO.LPs) {
    allLLDatas.push(await PendleAPI.queryLL(CHAIN, market.address));
  }

  return await Promise.all(
    blockNumbers.map((b) =>
      fetchUserBalanceSnapshot(allYTUsers, allLPUsers, allLLDatas, b)
    )
  );
}

async function main() {
  const block = 22672619;

  // const api

  // await PendleAPI.queryLL(CHAIN, POOL_INFO.LPs[0].address);

  const res = (await fetchUserBalanceSnapshotBatch([block]))[0];

  for (const user in res.resultYT) {
    if (res.resultYT[user].eq(0)) continue;
    console.log(user, res.resultYT[user].toString());
  }

  for (const user in res.resultLP) {
    if (res.resultLP[user].eq(0)) continue;
    console.log(user, res.resultLP[user].toString());
  }
}

main().catch(console.error);
