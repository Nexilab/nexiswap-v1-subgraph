/* eslint-disable prefer-const */
import { BigDecimal, Address } from "@graphprotocol/graph-ts/index";
import { Pair, Token, Bundle } from "../../generated/schema";
import { ZERO_BD, factoryContract, ADDRESS_ZERO, ONE_BD } from "./utils";

const WNEXI_ADDRESS = "0xEC3ceC066E5b2331fCD0Eb7eE5A9B17F617A6efb";
const WNEXI_CASHUSD_PAIR = "0x08f216038a4fFbA1f35E0FA4E8453E5F5e0B7570"; // created block 589414
// const DAI_WNEXI_PAIR = "0xf3010261b58b2874639ca2e860e9005e3be5de0b"; // created block 481116
const WNEXI_USDT_PAIR = ""; // created block 648115

export function getNexiPriceInUSD(): BigDecimal {
  // fetch nexi prices for each stablecoin
  let usdtPair = Pair.load(WNEXI_USDT_PAIR); // usdt is token1
  let cashUsdPair = Pair.load(WNEXI_CASHUSD_PAIR); // cashusd is token1
  // let daiPair = Pair.load(DAI_WNEXI_PAIR); // dai is token0

  // all 2 have been created
 if (cashUsdPair !== null && usdtPair !== null) {
    let totalLiquidityNEXI = cashUsdPair.reserve0.plus(usdtPair.reserve0);
    let cashUsdWeight = cashUsdPair.reserve0.div(totalLiquidityNEXI);
    let usdtWeight = usdtPair.reserve0.div(totalLiquidityNEXI);
    return cashUsdPair.token0Price.times(cashUsdWeight).plus(usdtPair.token1Price.times(usdtWeight));
    // usdt is the only pair so far
  } else if (cashUsdPair !== null) {
    return cashUsdPair.token1Price;
  } else if (usdtPair !== null) {
    return usdtPair.token1Price;
  } else {
    return ZERO_BD;
  }
}

// token where amounts should contribute to tracked volume and liquidity
let WHITELIST: string[] = [
  "0xEC3ceC066E5b2331fCD0Eb7eE5A9B17F617A6efb", // WNEXI
  "0x40Aa6A2463fBAabEA6DB995aaB604C2393cbc37D", // CASHUSD
  "0x69F6c3e18028012Fbad46A9e940889daF6b4241D", // USDT
  "0x613d19fd91A62513e16Ecc1c0A4bFb16480bd2Bb", // ORBITEX
];

// minimum liquidity for price to get tracked
let MINIMUM_LIQUIDITY_THRESHOLD_NEXI = BigDecimal.fromString("5");

/**
 * Search through graph to find derived NEXI per token.
 * @todo update to be derived NEXI (add stablecoin estimates)
 **/
export function findNexiPerToken(token: Token): BigDecimal {
  if (token.id == WNEXI_ADDRESS) {
    return ONE_BD;
  }
  // loop through whitelist and check if paired with any
  for (let i = 0; i < WHITELIST.length; ++i) {
    let pairAddress = factoryContract.getPair(Address.fromString(token.id), Address.fromString(WHITELIST[i]));
    if (pairAddress.toHexString() != ADDRESS_ZERO) {
      let pair = Pair.load(pairAddress.toHexString());
      if (pair.token0 == token.id && pair.reserveNEXI.gt(MINIMUM_LIQUIDITY_THRESHOLD_NEXI)) {
        let token1 = Token.load(pair.token1);
        return pair.token1Price.times(token1.derivedNEXI as BigDecimal); // return token1 per our token * NEXI per token 1
      }
      if (pair.token1 == token.id && pair.reserveNEXI.gt(MINIMUM_LIQUIDITY_THRESHOLD_NEXI)) {
        let token0 = Token.load(pair.token0);
        return pair.token0Price.times(token0.derivedNEXI as BigDecimal); // return token0 per our token * NEXI per token 0
      }
    }
  }
  return ZERO_BD; // nothing was found return 0
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD.
 * If both are, return average of two amounts
 * If neither is, return 0
 */
export function getTrackedVolumeUSD(
  bundle: Bundle,
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token
): BigDecimal {
  let price0 = token0.derivedNEXI.times(bundle.nexiPrice);
  let price1 = token1.derivedNEXI.times(bundle.nexiPrice);

  // both are whitelist tokens, take average of both amounts
  if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).plus(tokenAmount1.times(price1)).div(BigDecimal.fromString("2"));
  }

  // take full value of the whitelisted token amount
  if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0);
  }

  // take full value of the whitelisted token amount
  if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount1.times(price1);
  }

  // neither token is on white list, tracked volume is 0
  return ZERO_BD;
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD * 2.
 * If both are, return sum of two amounts
 * If neither is, return 0
 */
export function getTrackedLiquidityUSD(
  bundle: Bundle,
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token
): BigDecimal {
  let price0 = token0.derivedNEXI.times(bundle.nexiPrice);
  let price1 = token1.derivedNEXI.times(bundle.nexiPrice);

  // both are whitelist tokens, take average of both amounts
  if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).plus(tokenAmount1.times(price1));
  }

  // take double value of the whitelisted token amount
  if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).times(BigDecimal.fromString("2"));
  }

  // take double value of the whitelisted token amount
  if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount1.times(price1).times(BigDecimal.fromString("2"));
  }

  // neither token is on white list, tracked volume is 0
  return ZERO_BD;
}
