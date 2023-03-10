import Airtable from "airtable";
import { HowLongToBeatService } from "howlongtobeat";

export const table = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
})
  .base("appLZQMgewaSP7Gg3")
  .table("Games");

export const hltb = new HowLongToBeatService();

export const hltbIdField = "HLTB ID";
export const steamAppIdField = "Steam App ID";
export const NameField = "Name";
export const hltbPlaytimeField = "Approx. Hours to Finish";

const chunkSize = 10;
export const chunks = <T>(arr: T[]) => {
  const res = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    res.push(arr.slice(i, i + chunkSize));
  }
  return res;
};

export const buildUpdate = (recordId: string, hltbId: string) => ({
  id: recordId,
  fields: { [hltbIdField]: hltbId },
});
export const buildPlaytimeUpdate = (
  recordId: string,
  playtimeMinutes: number
) => ({
  id: recordId,
  fields: { [hltbPlaytimeField]: playtimeMinutes },
});
