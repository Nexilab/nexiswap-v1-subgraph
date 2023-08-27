/* eslint-disable prefer-const */
import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { Pair } from "../../../generated/templates/Pair/Pair";

export let BI_ZERO = BigInt.fromI32(0);
export let BI_ONE = BigInt.fromI32(1);
export let BD_ZERO = BigDecimal.fromString("0");
export let BD_1E18 = BigDecimal.fromString("1e18");

export let TRACKED_PAIRS: string[] = [
  "0x40472A05dC993205D3f05fd897A5004188581a30", // WNEXI/USDT
  "0xF430901954c170B303b6502FC4184293F9104a7A", // ORBITEX/WNEXI
];

export function getNexiPriceInUSD(): BigDecimal {
  // Bind WNEXI/BUSD contract to query the pair.
  let pairContract = Pair.bind(Address.fromString(TRACKED_PAIRS[0]));

  // Fail-safe call to get NEXI price as BUSD.
  let reserves = pairContract.try_getReserves();
  if (!reserves.reverted) {
    let reserve0 = reserves.value.value0.toBigDecimal().div(BD_1E18);
    let reserve1 = reserves.value.value1.toBigDecimal().div(BD_1E18);

    if (reserve0.notEqual(BD_ZERO)) {
      return reserve1.div(reserve0);
    }
  }

  return BD_ZERO;
}
