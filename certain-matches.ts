import {
  buildUpdate,
  chunks,
  hltb,
  hltbIdField,
  NameField,
  table,
} from "./utils";

const main = async () => {
  const records = await table
    .select({
      // maxRecords: 20,
      fields: [NameField],
      filterByFormula: `{${hltbIdField}} = ""`,
    })
    .all();

  console.log("got", records.length, "records");

  const updates = [];

  for (const record of records) {
    const name = record.get(NameField) as string;
    console.log("searching for", name);

    const hltbEntries = await hltb.search(name);

    if (hltbEntries.length > 0 && hltbEntries[0].similarity === 1) {
      console.log("  matched!");
      updates.push(buildUpdate(record.getId(), hltbEntries[0].id));
    } else if (hltbEntries.length > 0) {
      console.log(
        "  no definitive match",
        name,
        "found",
        hltbEntries[0].name,
        `(scored ${hltbEntries[0].similarity})`
      );
    } else {
      console.log("  unable to match");
    }
  }

  console.log();
  for (const chunk of chunks(updates)) {
    console.log("updating chunk starting with", chunk[0].id);
    await table.update(chunk);
    console.log("  updated!");
  }
};

main()
  .then()
  .catch((err) => {
    console.log(err);
  });
