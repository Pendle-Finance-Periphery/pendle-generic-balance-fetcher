# Pendle generic balance fetcher


## Set up

1. Install required package by:

```
yarn install
```

2. Edit the configuration file (`./src/configuration.ts`) to fill in the pool's information. Do note that **all addresses in this file must be in lowercase**.

## Usage

In `./src/main.ts`, the main function to call is `fetchUserBalanceSnapshotBatch`, where its arguments are simply a list of block number to query users' balance from. Do note that a buffer of at least 15 minutes are recommended before you can query a balance from a mined block.

If you'd like to query for USD value of LP, `fetchingLpValueInSY` needs to be set to **True**. The balance will be returned in SY terms. Afterwards, you can convert it to USD value by multiplying the outcome with the current SY price.

