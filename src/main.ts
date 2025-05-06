import { BigNumber } from 'ethers';
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
  const allLiquidLockerTokens = POOL_INFO.liquidLockers.map(
    (l) => l.receiptToken
  );
  const allLPTokens = POOL_INFO.LPs.map((l) => l.address);

  let allYTUsers = await PendleAPI.query(POOL_INFO.YT);
  let allLPUsers = await PendleAPI.queryAllTokens([
    ...allLPTokens,
    ...allLiquidLockerTokens
  ]);

  return await Promise.all(
    blockNumbers.map((b) => fetchUserBalanceSnapshot(allYTUsers, allLPUsers, b))
  );
}

async function main() {
  const userShareMap: Record<string, BigNumber> = {};
  const startBlock = 23968001;
  for (let block = startBlock; block < startBlock + 1; block++) {
    console.log(`Processing block ${block}`);
    const res = (await fetchUserBalanceSnapshotBatch([block]))[0];
    for (let user in res.resultYT) {
      if (res.resultYT[user].eq(0)) continue;
      userShareMap[user] = (userShareMap[user] ?? BigNumber.from(0)).add(res.resultYT[user]);
    }

    for (let user in res.resultLP) {
      if (res.resultLP[user].eq(0)) continue;
      userShareMap[user] = (userShareMap[user] ?? BigNumber.from(0)).add(res.resultLP[user]);
    }
  }

  const total = Object.values(userShareMap).reduce((a, b) => a.add(b), BigNumber.from(0));

  const fs = require('fs');
  const csvContent = Object.entries(userShareMap)
    .map(([user, amount]) => `${user},${amount.toString()}`)
    .join('\n');
  fs.writeFileSync('user_shares.csv', 'user,point\n' + csvContent);
}

main().catch(console.error);
