import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import { zipSync, type Zippable } from 'fflate';

import { listCategories } from '@/db/categoriesRepo';
import { db } from '@/db/client';
import { listEntries, listReceipts } from '@/db/entriesRepo';
import type { AppSettings } from '@/db/settingsRepo';
import { listTrips, mileageTotals } from '@/db/tripsRepo';
import { entriesCsv, mileageCsv, totalsCsv } from '@/domain/csv';
import { metersToMiles } from '@/domain/mileage';
import { buildReport } from '@/domain/report';
import { currencyOf, type Region } from '@/domain/types';
import { receiptsDir } from '@/files/receipts';

import { bundleFileName, exportFileName, receiptZipNames, reportHtml, type ExportKind } from './exportDocs';
import type { ReportPeriod } from './period';
import { monthlySeries, periodMileageEstimate, ratesLabel } from './series';

export class ExportCancelled extends Error {}
export class NothingToExport extends Error {}

/** Below this we don't even try (PDF + photos can be several MB). */
const MIN_FREE_BYTES = 25 * 1024 * 1024;

export interface ExportFile {
  file: File;
  mimeType: string;
  uti: string;
}

const MIME: Record<'csv' | 'pdf' | 'zip', { mimeType: string; uti: string }> = {
  csv: { mimeType: 'text/csv', uti: 'public.comma-separated-values-text' },
  pdf: { mimeType: 'application/pdf', uti: 'com.adobe.pdf' },
  zip: { mimeType: 'application/zip', uti: 'public.zip-archive' },
};

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

/**
 * Writes the chosen files into <cache>/export/ and returns the one file to share (a ZIP when several were chosen,
 * because the share sheet takes a single file). Throws ExportCancelled / NothingToExport / any I/O error.
 */
export async function buildExport(opts: {
  period: ReportPeriod;
  kinds: ExportKind[];
  includePersonal: boolean;
  region: Region;
  settings: AppSettings;
  isCancelled: () => boolean;
}): Promise<ExportFile> {
  const { period, kinds, includePersonal, region, settings } = opts;
  const step = async () => {
    await tick();
    if (opts.isCancelled()) throw new ExportCancelled();
  };
  if (Paths.availableDiskSpace > 0 && Paths.availableDiskSpace < MIN_FREE_BYTES) throw new Error('no_space');

  const dir = new Directory(Paths.cache, 'export');
  if (dir.exists) dir.delete();
  dir.create({ intermediates: true });

  const currency = currencyOf(region);
  const all = listEntries(db, { period });
  const entries = includePersonal ? all : all.filter((e) => e.scope === 'work');
  const cats = new Map(listCategories(db, { includeHidden: true }).map((c) => [c.id, c]));
  const catOf = (id: string | null) => (id ? cats.get(id) : undefined);
  const trips = listTrips(db, period).filter(
    (t) => (t.status === 'done' || t.status === 'interrupted') && (includePersonal || t.scope === 'work'),
  );
  const written: { file: File; ext: 'csv' | 'pdf' | 'zip' }[] = [];

  const writeText = async (kind: ExportKind, text: string) => {
    const f = new File(dir, exportFileName(kind, period.fileStem));
    f.create({ overwrite: true });
    await f.write(text);
    written.push({ file: f, ext: 'csv' });
  };

  if (kinds.includes('entriesCsv')) {
    await writeText(
      'entriesCsv',
      entriesCsv(
        entries.map((e) => ({
          id: e.id,
          occurredAt: e.occurredAt,
          type: e.type,
          amountMinor: e.amountMinor,
          currency: e.currency,
          categoryName: catOf(e.categoryId)?.name ?? null,
          taxLine: catOf(e.categoryId)?.taxLine ?? null,
          scope: e.scope,
          note: e.note,
          receiptCount: e.receiptCount,
        })),
      ),
    );
    await step();
  }

  const report = buildReport(all, [...cats.values()], period, { includePersonal });

  if (kinds.includes('totalsCsv')) {
    await writeText(
      'totalsCsv',
      totalsCsv(
        report.byCategory.map((c) => ({ type: c.type, name: c.name, taxLine: catOf(c.categoryId)?.taxLine ?? '', totalMinor: c.totalMinor })),
        currency,
        period.csvLabel,
      ),
    );
    await step();
  }

  if (kinds.includes('mileageCsv')) {
    await writeText(
      'mileageCsv',
      mileageCsv(
        trips.map((t) => ({
          startedAt: t.startedAt,
          miles: metersToMiles(t.distanceM),
          scope: t.scope,
          purpose: t.purpose,
          source: t.source,
          odoStart: t.odoStart,
          odoEnd: t.odoEnd,
        })),
      ),
    );
    await step();
  }

  if (kinds.includes('pdf')) {
    const workMiles = mileageTotals(db, period).work;
    const before = period.start > period.year.start ? mileageTotals(db, { start: period.year.start, end: period.start }).work : 0;
    const tiers = settings.mileageRates[region];
    const html = reportHtml({
      periodLabel: period.label,
      currency,
      report,
      months: monthlySeries(all, period, { includePersonal }),
      includePersonal,
      mileage:
        workMiles > 0
          ? {
              workMiles,
              estimateMinor: periodMileageEstimate(before, workMiles, tiers),
              ratesNote: `at ${region === 'UK' ? 'HMRC rates' : 'IRS rate'} (${ratesLabel(tiers, currency)}${region === 'US' ? '/mi' : ''})`,
            }
          : null,
      trips: trips.map((t) => ({ startedAt: t.startedAt, miles: metersToMiles(t.distanceM), scope: t.scope, purpose: t.purpose, source: t.source })),
      entries: [...entries]
        .sort((a, b) => a.occurredAt - b.occurredAt)
        .map((e) => ({ ...e, categoryName: catOf(e.categoryId)?.name ?? null })),
      generatedAt: Date.now(),
    });
    const { uri } = await Print.printToFileAsync({ html });
    const tmp = new File(uri);
    const f = new File(dir, exportFileName('pdf', period.fileStem));
    await tmp.move(f, { overwrite: true });
    written.push({ file: f, ext: 'pdf' });
    await step();
  }

  if (kinds.includes('receiptsZip')) {
    const items = entries
      .filter((e) => e.receiptCount > 0)
      .flatMap((e) =>
        listReceipts(db, e.id).map((r) => ({
          filePath: r.filePath,
          occurredAt: e.occurredAt,
          amountMinor: e.amountMinor,
          categoryName: catOf(e.categoryId)?.name ?? null,
        })),
      );
    const files: Zippable = {};
    const rdir = receiptsDir();
    for (const { filePath, zipName } of receiptZipNames(items)) {
      const src = new File(rdir, filePath);
      if (!src.exists) continue;
      files[zipName] = [src.bytesSync(), { level: 0 }];
      await step();
    }
    if (Object.keys(files).length > 0) {
      const f = new File(dir, exportFileName('receiptsZip', period.fileStem));
      f.create({ overwrite: true });
      await f.write(zipSync(files));
      written.push({ file: f, ext: 'zip' });
    }
  }

  if (written.length === 0) throw new NothingToExport();
  if (written.length === 1) return { file: written[0].file, ...MIME[written[0].ext] };

  const bundle: Zippable = {};
  for (const w of written) bundle[w.file.name] = [w.file.bytesSync(), { level: w.ext === 'csv' ? 6 : 0 }];
  const out = new File(dir, bundleFileName(period.fileStem));
  out.create({ overwrite: true });
  await out.write(zipSync(bundle));
  return { file: out, ...MIME.zip };
}
