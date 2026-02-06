import fs from 'fs';
import { LotService } from '../services/lot.service';
import { IRawPortfolioItem, IStoredPortfolioItem } from '../interfaces/portfolio.interface';

class MigrationScript {
  private lotService = new LotService();

  migrate(inputPath: string, outputPath: string): void {
    try {
      console.log('Starting migration from records to lots...');

      // Read and parse the old format file
      const data = fs.readFileSync(inputPath, 'utf-8');
      const rawItems: IRawPortfolioItem[] = JSON.parse(data);

      console.log(`Loaded ${rawItems.length} items from ${inputPath}`);

      // Process using LotService
      const processedItems = this.lotService.processRawData(rawItems);

      console.log(`Processed into ${processedItems.length} items with lots`);

      // Map to stored format
      const storedItems: IStoredPortfolioItem[] = processedItems.map(item => ({
        isin: item.isin,
        name: item.name,
        type: item.type,
        link: item.link,
        prevPrice: item.prevPrice,
        currPrice: item.currPrice,
        lots: item.lots,
      }));

      // Save the new format file
      fs.writeFileSync(outputPath, JSON.stringify(storedItems, null, 2));

      console.log(`Migration completed. Saved to ${outputPath}`);
    } catch (error) {
      console.error('Error during migration:', error);
      process.exit(1);
    }
  }
}

// Usage: ts-node src/scripts/migrate.ts <inputPath> <outputPath>
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('Usage: ts-node src/scripts/migrate.ts <inputPath> <outputPath>');
  process.exit(1);
}

const [inputPath, outputPath] = args;
const migrator = new MigrationScript();
migrator.migrate(inputPath, outputPath);
