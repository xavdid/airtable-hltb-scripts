import hltbRaw from "./hltb.json";
import steamDbRaw from "./steamdb.filtered.json";

import { chunks, hltbIdField, steamAppIdField, table } from "./utils";

const SteamDB = steamDbRaw as unknown as {
  [sid: string]: {
    name: string;
    igdb_slug: string;
    hltb_id: string;
  };
};

const HLTB = Object.fromEntries(
  hltbRaw.games.map(({ steam_id, hltb_id, steam_name }) => [
    steam_id.toString(),
    { hltb_id, steam_name },
  ])
);

// const SteamDB = steamDb[0].

const addHltbIdFromJson = async () => {
  const records = await table
    .select({
      // maxRecords: 3,
      fields: ["Name", steamAppIdField],
      filterByFormula: `AND({${steamAppIdField}} != "", {${hltbIdField}} = "")`,
    })
    .all();

  const updates = chunks(
    records
      .map((record) => {
        // console.log(
        //   record.get("Name"),
        //   SteamDB[
        //     (record.get("Steam App ID") as string) || ""
        //   ]?.hltb_id?.toString(),
        //   record.get(steamAppIdField)
        // );
        return {
          id: record.getId(),
          fields: {
            [hltbIdField]:
              SteamDB[
                (record.get("Steam App ID") as string) || ""
              ]?.hltb_id?.toString(),
          },
        };
      })
      .filter((r) => r.fields[hltbIdField])
  );

  console.log("got", updates.length, "chunks");
  // console.log(JSON.stringify(updates[0], null, 2));

  for (const chunk of updates) {
    console.log("updating chunk starting with", chunk[0].id);
    await table.update(chunk);
    console.log("  updated!");
  }
};

addHltbIdFromJson()
  .then()
  .catch((err) => {
    console.log(err);
  });
