import { runScheduledBackupsForAllSchools } from "../lib/server/school-backup";

async function main() {
  const results = await runScheduledBackupsForAllSchools();
  for (const result of results) {
    if (result.created) {
      console.log(`Backup created for ${result.schoolName}: ${result.filename}`);
    } else {
      console.log(`Backup not due for ${result.schoolName}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
