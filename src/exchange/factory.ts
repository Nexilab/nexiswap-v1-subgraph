/* eslint-disable prefer-const */
import { log, BigInt } from "@graphprotocol/graph-ts";
import { NexiSwapFactory, Pair, Token, Bundle } from "../../generated/schema";
import { Pair as PairTemplate } from "../../generated/templates";
import { PairCreated } from "../../generated/Factory/Factory";
import {
  FACTORY_ADDRESS,
  ZERO_BD,
  ZERO_BI,
  fetchTokenSymbol,
  fetchTokenName,
  fetchTokenDecimals,
  fetchTokenTotalSupply,
} from "./utils";

let WHITELIST: string[] = [
  "0xdF397Aeee4950Aafb7DaD6345747337B510B4951", // VLAND
  "0x9032ba5aa0d59888E582E8aa5893b53b07DEceC1", // AIGAME
  "0x1F1FdCf76847E8e9C00048a33dFf1246912a7Fc2", // CONTIGO
  "0x30199Be78D0A2A885b3E03f7D5B08DE2ad251648", // CASHUSD
  "0xEA52c1F8Ef64c3BfCc043e01081618b5A7159bD1", // ELEGANCE
  "0x883277f7D623612034db92A2dC16A8BEC20a8FB5", // NFTPRO
  "0xEC3ceC066E5b2331fCD0Eb7eE5A9B17F617A6efb", // WNEXI
  "0x613d19fd91A62513e16Ecc1c0A4bFb16480bd2Bb", // ORBITEX
  "0x69F6c3e18028012Fbad46A9e940889daF6b4241D", // USDT
  "0x47fbc1D04511bfB1C3d64DA950c88815D02114F4", // POWER
  "0x040a129440e4d98fABaD86C8A5D291693636c850", // SUSTAIN
];

export function handlePairCreated(event: PairCreated): void {
  let factory = NexiSwapFactory.load(FACTORY_ADDRESS);
  if (factory === null) {
    factory = new NexiSwapFactory(FACTORY_ADDRESS);
    factory.pairCount = 0;
    factory.totalVolumeNEXI = ZERO_BD;
    factory.totalLiquidityNEXI = ZERO_BD;
    factory.totalVolumeUSD = ZERO_BD;
    factory.untrackedVolumeUSD = ZERO_BD;
    factory.totalLiquidityUSD = ZERO_BD;
    factory.txCount = ZERO_BI;

    // create new bundle
    let bundle = new Bundle("1");
    bundle.nexiPrice = ZERO_BD;
    bundle.save();
  }
  factory.pairCount = factory.pairCount + 1;
  factory.save();

  // create the tokens
  let token0 = Token.load(event.params.token0.toHexString());
  let token1 = Token.load(event.params.token1.toHexString());
  if (WHITELIST.includes(event.params.token0.toHexString()) && WHITELIST.includes(event.params.token1.toHexString())) {
    // fetch info if null
    if (token0 === null) {
      token0 = new Token(event.params.token0.toHexString());
      log.info("Token 0 is {}", [event.params.token0.toHexString()])
      token0.symbol = fetchTokenSymbol(event.params.token0);
      token0.name = fetchTokenName(event.params.token0);
      token0.totalSupply = fetchTokenTotalSupply(event.params.token0);
      let decimals = fetchTokenDecimals(event.params.token0);
      // bail if we couldn't figure out the decimals
      if (decimals === null) {
        log.debug("mybug the decimal on token 0 was null", []);
        return;
      }

      token0.decimals = decimals;
      token0.derivedNEXI = ZERO_BD;
      token0.tradeVolume = ZERO_BD;
      token0.tradeVolumeUSD = ZERO_BD;
      token0.untrackedVolumeUSD = ZERO_BD;
      token0.totalLiquidity = ZERO_BD;
      // token0.allPairs = []
      token0.txCount = ZERO_BI;
    }

    // fetch info if null
    if (token1 === null) {
      token1 = new Token(event.params.token1.toHexString());
      log.info("Token 1 is {}", [event.params.token1.toHexString()])
      token1.symbol = fetchTokenSymbol(event.params.token1);
      token1.name = fetchTokenName(event.params.token1);
      token1.totalSupply = fetchTokenTotalSupply(event.params.token1);
      let decimals = fetchTokenDecimals(event.params.token1);

      // bail if we couldn't figure out the decimals
      if (decimals === null) {
        return;
      }
      token1.decimals = decimals;

      token1.derivedNEXI = ZERO_BD;
      token1.tradeVolume = ZERO_BD;
      token1.tradeVolumeUSD = ZERO_BD;
      token1.untrackedVolumeUSD = ZERO_BD;
      token1.totalLiquidity = ZERO_BD;
      // token1.allPairs = []
      token1.txCount = ZERO_BI;
    }

    let pair = new Pair(event.params.pair.toHexString()) as Pair;
    pair.token0 = token0.id;
    pair.token1 = token1.id;
    pair.createdAtTimestamp = event.block.timestamp;
    pair.createdAtBlockNumber = event.block.number;
    pair.txCount = ZERO_BI;
    pair.reserve0 = ZERO_BD;
    pair.reserve1 = ZERO_BD;
    pair.trackedReserveNEXI = ZERO_BD;
    pair.reserveNEXI = ZERO_BD;
    pair.reserveUSD = ZERO_BD;
    pair.totalSupply = ZERO_BD;
    pair.volumeToken0 = ZERO_BD;
    pair.volumeToken1 = ZERO_BD;
    pair.volumeUSD = ZERO_BD;
    pair.untrackedVolumeUSD = ZERO_BD;
    pair.token0Price = ZERO_BD;
    pair.token1Price = ZERO_BD;

    // create the tracked contract based on the template
    PairTemplate.create(event.params.pair);

    // save updated values
    token0.save();
    token1.save();
    pair.save();
    factory.save();
  }
}
