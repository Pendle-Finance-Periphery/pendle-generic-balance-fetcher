import { ethers } from 'ethers';
import * as config from './configuration';

import MulticallABI from '../abis/Multicall.json';
import PendleYieldTokenABI from '../abis/PendleYieldToken.json';
import PendleMarketABI from '../abis/PendleMarket.json';

export const MULTICALL_ADDRESS = '0xeefba1e63905ef1d7acba5a8513c70307c1ce441';
export const PENDLE_TREASURY = '0xc328dfcd2c8450e2487a91daa9b75629075b7a43';
export const MULTICALL_BATCH_SIZE = 1000;
export const RPCS = {
  1: 'https://rpc.ankr.com/eth',
  42161: 'https://rpc.ankr.com/arbitrum'
};
export const _1E18 = ethers.BigNumber.from(10).pow(18);
export const PROVIDER = new ethers.providers.JsonRpcProvider(
  RPCS[config.CHAIN]
);

export const ABIs = {
  multicall: MulticallABI,
  pendleYieldToken: PendleYieldTokenABI,
  pendleMarket: PendleMarketABI
};

export const Contracts = {
  multicall: new ethers.Contract(MULTICALL_ADDRESS, ABIs.multicall, PROVIDER),
  yieldTokenInterface: new ethers.utils.Interface(ABIs.pendleYieldToken),
  marketInterface: new ethers.utils.Interface(ABIs.pendleMarket)
};
