import { ethers } from 'ethers';
import * as constants from '../consts';

export async function getLpToSyRate(
  lpToken: string,
  ytToken: string,
  blockNumber: number
): Promise<ethers.BigNumber> {
  const market = new ethers.Contract(
    lpToken,
    constants.ABIs.pendleMarket,
    constants.PROVIDER
  );

  const yt = new ethers.Contract(
    ytToken,
    constants.ABIs.pendleYieldToken,
    constants.PROVIDER
  );

  const storage = await market.readState(lpToken, { blockTag: blockNumber });

  const ptToAssetRate = getExchangeRateFromLnImpliedRate(
    storage.lastLnImpliedRate,
    storage.expiry.toNumber() - (await getBlockTimestamp(blockNumber))
  );

  const ptToSyRate = ptToAssetRate
    .mul(constants._1E18)
    .div(await yt.callStatic.pyIndexCurrent({ blockTag: blockNumber }));

  const totalValueInSy = storage.totalSy.add(
    storage.totalPt.mul(ptToSyRate).div(constants._1E18)
  );

  return totalValueInSy.mul(constants._1E18).div(storage.totalLp);
}

function getExchangeRateFromLnImpliedRate(
  lnImpliedRate: ethers.BigNumber,
  timeToExpiry: number
): ethers.BigNumber {
  const normalizedRate =
    (weiToF(lnImpliedRate) * timeToExpiry) / constants.ONE_YEAR;
  return ethers.utils.parseUnits(Math.exp(normalizedRate).toString(), 18);
}

async function getBlockTimestamp(blockNumber: number): Promise<number> {
  const block = await constants.PROVIDER.getBlock(blockNumber);
  if (!block || !block.timestamp) {
    throw new Error(`Block ${blockNumber} not found or has no timestamp`);
  }
  return block.timestamp;
}

function weiToF(wei: ethers.BigNumber): number {
  return parseFloat(ethers.utils.formatUnits(wei, 18));
}
