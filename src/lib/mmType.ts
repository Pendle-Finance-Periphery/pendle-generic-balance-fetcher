import { FullMarketInfo } from '../pendle-api';

let mmInfoInitialized = false;
const mmToTypeMap: Map<string, MMType> = new Map();

export type MMType = 'SILO' | 'MORPHO' | 'EULER';

export function getMMType(lpInfo: FullMarketInfo, addr: string): MMType | null {
  if (!lpInfo.wlpInfo) {
    return null;
  }

  if (!mmInfoInitialized) {
    initMMAddresses(lpInfo);
  }

  addr = addr.toLowerCase();
  return mmToTypeMap.get(addr) || null;
}

function initMMAddresses(lpInfo: FullMarketInfo): void {
  mmInfoInitialized = true;

  if (!lpInfo.wlpInfo) {
    return;
  }

  for (const euler of lpInfo.wlpInfo.euler) {
    mmToTypeMap.set(euler.asset.toLowerCase(), 'EULER');
  }
  for (const silo of lpInfo.wlpInfo.silo) {
    mmToTypeMap.set(silo.asset.toLowerCase(), 'SILO');
  }
  if (lpInfo.wlpInfo.morphoAddress) {
    mmToTypeMap.set(lpInfo.wlpInfo.morphoAddress.toLowerCase(), 'MORPHO');
  }

  for (let elem in lpInfo.wlpInfo.remapMMHolder) {
    mmToTypeMap.set(
      elem.toLowerCase(),
      lpInfo.wlpInfo.remapMMHolder[elem].type
    );
  }
}
