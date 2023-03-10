import {
  buildPlaytimeUpdate,
  hltb,
  hltbIdField,
  hltbPlaytimeField,
  NameField,
  table,
} from "./utils";

import { readFile, writeFile } from "fs/promises";

interface Cache {
  missing: string[];
  noPlaytime: string[];
}

const cachePath = `${__dirname}/cache.json`;

const addHltbIdFromJson = async () => {
  const cache = JSON.parse(await readFile(cachePath, "utf-8")) as Cache;
  const missing = new Set(cache.missing);
  const noPlaytime = new Set(cache.noPlaytime);
  let dirtyCache = false;

  const writeCache = () =>
    writeFile(
      cachePath,
      JSON.stringify(
        { missing: [...missing], noPlaytime: [...noPlaytime] } as Cache,
        null,
        2
      )
    )
      .then(() => {
        dirtyCache = false;
        console.log("> updated cache");
      })
      .catch(() => console.error("> ‼️ failed to update cache!"));

  const records = await table
    .select({
      // maxRecords: 55,
      fields: ["Name", hltbIdField],
      filterByFormula: `AND({${hltbIdField}} != "", {${hltbPlaytimeField}} = "")`,
      // filterByFormula: `{${hltbIdField}} = "51772"`,
    })
    .all();

  console.log("got", records.length, "records\n");

  const updatePromises = [];
  let finishedChunks = 0;
  let updateChunk = [];

  for (const record of records) {
    const name = record.get(NameField) as string;
    const recordId = record.getId();

    console.log("Loading", name);
    if (missing.has(recordId) || noPlaytime.has(recordId)) {
      console.log("  skipping");
      continue;
    }

    try {
      const data = await hltb.detail(record.get(hltbIdField) as string);

      const playtime =
        data.gameplayMain ||
        data.gameplayMainExtra ||
        data.gameplayCompletionist ||
        null;

      if (playtime) {
        // console.log(`  storing ${data.gameplayMain}`);
        updateChunk.push(buildPlaytimeUpdate(recordId, playtime));
      } else {
        console.log(`  skipping, no main time data found (${playtime})`);
        noPlaytime.add(recordId);
        dirtyCache = true;
      }
    } catch (e) {
      const err = e as Error;
      if (!err.message.includes("404")) {
        console.log(`About to exit! Updated ~${finishedChunks * 10} games`);
        await writeCache();

        throw err;
      }
      console.log("404");
      missing.add(recordId);
      dirtyCache = true;
    }

    if (updateChunk.length === 10) {
      updatePromises.push(
        table.update(updateChunk).then(() => {
          console.log(`> updated chunk ${++finishedChunks}`);
        })
      );
      if (dirtyCache) {
        void writeCache();
      }
      updateChunk = [];
    }
  }

  if (updateChunk.length > 0) {
    updatePromises.push(
      table.update(updateChunk).then(() => {
        console.log("> updated final chunk!");
        finishedChunks += 1;
      })
    );
  }
  if (dirtyCache) {
    await writeCache();
  }

  await Promise.all(updatePromises);
  console.log(`Done! Updated ~${finishedChunks * 10} games`);
};

addHltbIdFromJson()
  .then()
  .catch((err) => {
    console.log(err);
  });
