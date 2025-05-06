import { ethers } from 'ethers';
import * as config from './configuration';

import MulticallABI from '../abis/Multicall.json';
import PendleYieldTokenABI from '../abis/PendleYieldToken.json';
import PendleMarketABI from '../abis/PendleMarket.json';
import PendleYieldContractFactoryABI from '../abis/PendleYieldContractFactory.json';

const RPCS = {
  1: 'https://rpc.ankr.com/eth',
  42161: 'https://rpc.ankr.com/arbitrum',
  56: 'https://rpc.ankr.com/bsc',
  5000: 'https://rpc.ankr.com/mantle',
  8453: 'https://rpc.ankr.com/base',
  146: 'https://rpc.ankr.com/sonic_mainnet',
  80094: 'https://rpc.berachain.com'
};

const MULTICALLS = {
  1: '0xcA11bde05977b3631167028862bE2a173976CA11',
  42161: '0xcA11bde05977b3631167028862bE2a173976CA11',
  56: '0xcA11bde05977b3631167028862bE2a173976CA11',
  5000: '0xcA11bde05977b3631167028862bE2a173976CA11',
  8453: '0xcA11bde05977b3631167028862bE2a173976CA11',
  146: '0xcA11bde05977b3631167028862bE2a173976CA11',
  80094: '0xcA11bde05977b3631167028862bE2a173976CA11'
};

export const PENDLE_TREASURY = '0x8270400d528c34e1596ef367eedec99080a1b592';
export const MULTICALL_BATCH_SIZE = 1000;
export const _1E18 = ethers.BigNumber.from(10).pow(18);
export const PROVIDER = new ethers.providers.JsonRpcProvider(
  RPCS[config.CHAIN]
);
export const MULTICALL_ADDRESS = MULTICALLS[config.CHAIN];

export const ABIs = {
  multicall: MulticallABI,
  pendleYieldToken: PendleYieldTokenABI,
  pendleMarket: PendleMarketABI,
  pendleYieldContractFactory: PendleYieldContractFactoryABI
};

export const Contracts = {
  multicall: new ethers.Contract(MULTICALL_ADDRESS, ABIs.multicall, PROVIDER),
  yieldTokenInterface: new ethers.utils.Interface(ABIs.pendleYieldToken),
  marketInterface: new ethers.utils.Interface(ABIs.pendleMarket)
};
