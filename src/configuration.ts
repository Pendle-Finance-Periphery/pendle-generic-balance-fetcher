import { ethers } from 'ethers';
import { CHAINS, PoolConfiguration } from './types';

export const CHAIN = CHAINS.ETHEREUM;

export const POOL_INFO: PoolConfiguration = {
  SY: '0xac0047886a985071476a1186be89222659970d65',
  YT: '0xfb35fd0095dd1096b1ca49ad44d8c5812a201677',
  LPs: [
    {
      address: '0xf32e58f92e60f4b0a37a69b95d642a471365eae8',
      deployedBlock: 18969534
    }
  ],
  liquidLockers: [
    {
      // penpie
      address: '0x6e799758cee75dae3d84e09d40dc416ecf713652',
      receiptToken: '0x2da4401616dc5668100decfaf579229233b4ec1c',
      lpToken: '0xf32e58f92e60f4b0a37a69b95d642a471365eae8',
      deployedBlock: 18983977,
      performanceFeeBps: ethers.BigNumber.from(0)
    },
    {
      // equilibira
      address: '0x64627901dadb46ed7f275fd4fc87d086cff1e6e3',
      receiptToken: '0x17ea39035ad2cb5d8e2e005349ff23bb52d1c8b7',
      lpToken: '0xf32e58f92e60f4b0a37a69b95d642a471365eae8',
      deployedBlock: 18976214,
      performanceFeeBps: ethers.BigNumber.from(0)
    },
    {
      // stakedao
      address: '0xd8fa8dc5adec503acc5e026a98f32ca5c1fa289a',
      receiptToken: '0xc6bb9d3d4c980b53c31f6ffb998bea7e74029954',
      lpToken: '0xf32e58f92e60f4b0a37a69b95d642a471365eae8',
      deployedBlock: 19027272,
      performanceFeeBps: ethers.BigNumber.from(1500)
    }
  ]
};
