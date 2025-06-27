import axios from 'axios';
import { MMType } from './lib/mmType';

export type LiquidLockerData = {
  name: string;
  lpHolder: string;
  receiptToken: string;
  users: string[];
};

export type MorphoUserInstance = {
  user: string;
  marketId: string;
};

export type EulerUserInstance = {
  user: string;
  subAccount: string;
  asset: string;
};

export type SiloUserInstance = {
  user: string;
  asset: string;
};

export type MMMapType = {
  holder: string;
  type: MMType;
};

export type FullMarketInfo = {
  lpHolders: string[];
  llDatas: LiquidLockerData[];
  wlpInfo?: {
    wlp: string;
    wlpHolders: string[];
    euler: EulerUserInstance[];
    silo: SiloUserInstance[];

    morphoAddress: string;
    morpho: MorphoUserInstance[];
    remapMMHolder: Record<string, MMMapType>;
  };
};

export class PendleAPI {
  static async queryAllTokens(tokens: string[]): Promise<string[]> {
    const allResults = await Promise.all(
      tokens.map((token) => this.queryToken(token))
    );
    const allUniqueUsers = new Set<string>(allResults.flat());
    return Array.from(allUniqueUsers);
  }

  static async queryToken(token: string): Promise<string[]> {
    const resp = await axios.get(
      `https://api-v2.pendle.finance/core/v1/statistics/get-distinct-user-from-token?token=${token.toLowerCase()}`
    );
    return resp.data.users;
  }

  static async queryMarketInfo(
    chainId: number,
    market: string
  ): Promise<FullMarketInfo> {
    const resp = await axios.get(
      `https://api-v2.pendle.finance/core/v1/statistics/get-all-related-info-from-lp-and-wlp?chainId=${chainId}&marketAddress=${market}`
    );

    if (!resp.data.wlpDistinctUsersResponse) {
      return {
        lpHolders: resp.data.distinctUsers,
        llDatas: resp.data.liquidLockerPools
      };
    }

    const remapMMHolder: Record<string, MMMapType> = {};

    for (let i = 0; i < resp.data.wlpHolderMappings.length; ++i) {
      remapMMHolder[resp.data.wlpHolderMappings[i].asset.toLowerCase()] = {
        holder: resp.data.wlpHolderMappings[i].holder.toLowerCase(),
        type: resp.data.wlpHolderMappings[i].moneyMarket as MMType
      };
    }

    return {
      lpHolders: resp.data.distinctUsers,
      llDatas: resp.data.liquidLockerPools,
      wlpInfo: {
        wlp: resp.data.wlpDistinctUsersResponse.wlpAddress,
        wlpHolders: resp.data.wlpDistinctUsersResponse.wlpUsers,
        morpho: resp.data.wlpDistinctUsersResponse.morphoUsers,
        euler: resp.data.wlpDistinctUsersResponse.eulerUsers,
        morphoAddress: resp.data.wlpDistinctUsersResponse.morphoAddress,
        silo: resp.data.wlpDistinctUsersResponse.siloUsers,
        remapMMHolder
      }
    };
  }
}
