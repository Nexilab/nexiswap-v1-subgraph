/* eslint-disable prefer-const */
import { Address, BigDecimal, log } from "@graphprotocol/graph-ts";
import { Bundle, Competition, Team, User } from "../../generated/schema";
import { Swap } from "../../generated/templates/Pair/Pair";
import { BD_1E18, BI_ONE, TRACKED_PAIRS } from "./utils";

/**
 * SWAP
 */

export function handleSwap(event: Swap): void {
  let competition = Competition.load("1");
  // Competition is not in progress, ignoring trade.
  if (competition.status.notEqual(BI_ONE)) {
    log.info("Competition is not in progress, ignoring trade; status: {}", [competition.status.toString()]);
    return;
  }

  // User is not registered for the competition, skipping.
  let user = User.load(event.transaction.from.toHex());
  if (user === null) {
    log.info("User is not registered, ignoring trade; user: {}", [event.transaction.from.toHex()]);
    return;
  }

  // We load other entities as the trade is doomed valid and competition is in progress.
  let bundle = Bundle.load("1");
  let team = Team.load(user.team);

  let nexiIN: BigDecimal;
  let nexiOUT: BigDecimal;

  if (event.address.equals(Address.fromString(TRACKED_PAIRS[0]))) {
    nexiIN = event.params.amount0In.toBigDecimal().div(BD_1E18);
    nexiOUT = event.params.amount0Out.toBigDecimal().div(BD_1E18);
  } else {
    nexiIN = event.params.amount1In.toBigDecimal().div(BD_1E18);
    nexiOUT = event.params.amount1Out.toBigDecimal().div(BD_1E18);
  }

  let volumeNEXI = nexiOUT.plus(nexiIN);
  let volumeUSD = volumeNEXI.times(bundle.nexiPrice);

  log.info("Volume: {} for {} NEXI, or {} USD", [
    event.transaction.from.toHex(),
    volumeNEXI.toString(),
    volumeUSD.toString(),
  ]);

  user.volumeUSD = user.volumeUSD.plus(volumeUSD);
  user.volumeNEXI = user.volumeNEXI.plus(volumeNEXI);
  user.txCount = user.txCount.plus(BI_ONE);
  user.save();

  // Team statistics.
  team.volumeUSD = team.volumeUSD.plus(volumeUSD);
  team.volumeNEXI = team.volumeNEXI.plus(volumeNEXI);
  team.txCount = team.txCount.plus(BI_ONE);
  team.save();

  // Competition statistics.
  competition.volumeUSD = competition.volumeUSD.plus(volumeUSD);
  competition.volumeNEXI = competition.volumeNEXI.plus(volumeNEXI);
  competition.txCount = competition.txCount.plus(BI_ONE);
  competition.save();
}
