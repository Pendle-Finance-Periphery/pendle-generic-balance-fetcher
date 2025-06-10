import axios from 'axios';

export type LiquidLockerData = {
  name: string;
  lpHolder: string;
  receiptToken: string;
  users: string[];
};

export class PendleAPI {
  static async queryAllTokens(tokens: string[]): Promise<string[]> {
    const allResults = await Promise.all(
      tokens.map((token) => this.query(token))
    );
    const allUniqueUsers = new Set<string>(allResults.flat());
    return Array.from(allUniqueUsers);
  }

  static async query(token: string): Promise<string[]> {
    const resp = await axios.get(
      `https://api-v2.pendle.finance/core/v1/statistics/get-distinct-user-from-token?token=${token.toLowerCase()}`
    );
    return resp.data.users;
  }

  static async queryLL(
    chainId: number,
    market: string
  ): Promise<LiquidLockerData[]> {
    const resp = await axios.get(
      `https://api-v2.pendle.finance/core/v1/statistics/liquid-locker-pools?chainId=${chainId}&lpAddress=${market.toLowerCase()}`
    );
    return resp.data.results;
  }

  static async queryMM() {}
}
