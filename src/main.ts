import { POOL_INFO } from './configuration';
import { applyLpHolderShares, applyYtHolderShares } from './logic';
import { PendleAPI } from './pendle-api';
import { UserRecord } from './types';

async function fetchUserBalanceSnapshot(
  allYTUsers: string[],
  allLPUsers: string[],
  blockNumber: number
): Promise<UserRecord> {
  const result: UserRecord = {};
  await applyYtHolderShares(result, allYTUsers, blockNumber);
  for(const lp of POOL_INFO.LPs) {
    if (lp.deployedBlock <= blockNumber) {
      await applyLpHolderShares(result, lp.address, allLPUsers, blockNumber);
    }
  }
  return result;
}

async function fetchUserBalanceSnapshotBatch(
  blockNumbers: number[]
): Promise<UserRecord[]> {
  const allLiquidLockerTokens = POOL_INFO.liquidLockers.map(
    (l) => l.receiptToken
  );
  const allLPTokens = POOL_INFO.LPs.map((l) => l.address);

  const allYTUsers = await PendleAPI.query(POOL_INFO.YT);
  const allLPUsers = await PendleAPI.queryAllTokens([
    ...allLPTokens,
    ...allLiquidLockerTokens
  ]);

  return await Promise.all(
    blockNumbers.map((b) => fetchUserBalanceSnapshot(allYTUsers, allLPUsers, b))
  );
}

async function main() {
  const block = 19127272;
  const res = (await fetchUserBalanceSnapshotBatch([block]))[0];


  for(let user in res) {
    if (res[user].eq(0)) continue;
    console.log(user, res[user].toString());
  }
}


main().catch(console.error);