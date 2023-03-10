import { buildUpdate, hltb, hltbIdField, NameField, table } from "./utils";

import inquirer from "inquirer";

const MANUAL = "MANUAL";

const main = async () => {
  const records = await table
    .select({
      // maxRecords: 5,
      fields: [NameField],
      filterByFormula: `{${hltbIdField}} = ""`,
    })
    .all();

  console.log("got", records.length, "records");

  const updatePromises = [];
  let updateChunk = [];

  for (const record of records) {
    const name = record.get(NameField) as string;
    console.log("\nsearching for", name);

    const hltbEntries = await hltb.search(name);

    if (hltbEntries.length > 0 && hltbEntries[0].similarity === 1) {
      console.log("  matched!");
      updateChunk.push(buildUpdate(record.getId(), hltbEntries[0].id));
    } else if (hltbEntries.length > 0) {
      const { hltbId, manualId } = await inquirer.prompt([
        {
          name: "hltbId",
          message: "Is it one of these games?",
          type: "list",
          choices: [
            ...hltbEntries.map((e) => ({ name: e.name, value: e.id })),
            { name: "Manual", value: MANUAL },
            { name: "None", value: "" },
          ],
        },
        {
          name: "manualId",
          message: "Enter the HLTB ID",
          when: ({ hltbId }) => hltbId === MANUAL,
        },
      ]);

      const id = manualId || hltbId;
      console.log("got", id);
      if (id) {
        updateChunk.push(buildUpdate(record.getId(), id));
      }
    } else {
      // console.log("  no matches at all");
      const { hltbId } = await inquirer.prompt([
        {
          name: "ask",
          message: "Does this game have data in HLTB?",
          type: "confirm",
          default: false,
        },
        {
          name: "hltbId",
          message: "Enter the HLTB ID",
          when: ({ ask }) => ask,
        },
      ]);
      if (hltbId) {
        updateChunk.push(buildUpdate(record.getId(), hltbId));
      }
    }

    if (updateChunk.length === 10) {
      updatePromises.push(
        table.update(updateChunk).then(() => {
          console.log("updated chunk!");
        })
      );
      updateChunk = [];
    }
  }

  if (updateChunk.length > 0) {
    updatePromises.push(
      table.update(updateChunk).then(() => {
        console.log("updated chunk!");
      })
    );
  }

  await Promise.all(updatePromises);
  console.log("done!");
  // for (const chunk of chunks(updates)) {
  //   console.log("updating chunk starting with", chunk[0].id);
  //   await table.update(chunk);
  //   console.log("  updated!");
  // }
};

main()
  .then()
  .catch((err) => {
    console.log(err);
  });
