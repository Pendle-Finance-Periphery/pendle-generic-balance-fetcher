import { CHAINS, PoolConfiguration } from './types';

export const CHAIN = CHAINS.SONIC;

export const POOL_INFO: PoolConfiguration = {
  SY: '0xc4a9d8b486f388cc0e4168d2904277e8c8372fa3',
  YT: '0x18d2d54f42ba720851bae861b98a0f4b079e6027',
  LPs: [
    {
      address: '0x3f5ea53d1160177445b1898afbb16da111182418',
      deployedBlock: 18969534
    }
  ],
  liquidLockers: [
    {
      // penpie
      address: '0x6e799758cee75dae3d84e09d40dc416ecf713652',
      receiptToken: '0x2da4401616dc5668100decfaf579229233b4ec1c',
      lpToken: '0xf32e58f92e60f4b0a37a69b95d642a471365eae8',
      deployedBlock: 18983977
    },
    {
      // equilibira
      address: '0x64627901dadb46ed7f275fd4fc87d086cff1e6e3',
      receiptToken: '0x17ea39035ad2cb5d8e2e005349ff23bb52d1c8b7',
      lpToken: '0xf32e58f92e60f4b0a37a69b95d642a471365eae8',
      deployedBlock: 18976214
    },
    {
      // stakedao
      address: '0xd8fa8dc5adec503acc5e026a98f32ca5c1fa289a',
      receiptToken: '0xc6bb9d3d4c980b53c31f6ffb998bea7e74029954',
      lpToken: '0xf32e58f92e60f4b0a37a69b95d642a471365eae8',
      deployedBlock: 19027272
    }
  ]
};
