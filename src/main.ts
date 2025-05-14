import { POOL_INFO } from './configuration';
import { applyLpHolderShares, applyYtHolderShares } from './logic';
import { PendleAPI } from './pendle-api';
import { UserRecord } from './types';

type SnapshotResult = {
  resultYT: UserRecord;
  resultLP: UserRecord;
}

async function fetchUserBalanceSnapshot(
  allYTUsers: string[],
  allLPUsers: string[],
  blockNumber: number
): Promise<SnapshotResult> {
  const resultYT: UserRecord = {};
  const resultLP: UserRecord = {};
  await applyYtHolderShares(resultYT, allYTUsers, blockNumber);
  for (const lp of POOL_INFO.LPs) {
    if (lp.deployedBlock <= blockNumber) {
      await applyLpHolderShares(resultLP, lp.address, allLPUsers, blockNumber);
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
  const allLPUsers = await PendleAPI.queryAllTokens([
    ...allLPTokens,
  ]);

  return await Promise.all(
    blockNumbers.map((b) => fetchUserBalanceSnapshot(allYTUsers, allLPUsers, b))
  );
}

async function main() {
  const block = 4174049;
  const res = (await fetchUserBalanceSnapshotBatch([block]))[0];

  console.log('YT')
  for (const user in res.resultYT) {
    if (res.resultYT[user].eq(0)) continue;
    console.log(user, res.resultYT[user].toString());
  }

  console.log('LP')
  for (const user in res.resultLP) {
    if (res.resultLP[user].eq(0)) continue;
    console.log(user, res.resultLP[user].toString());
  }
}

main().catch(console.error);
