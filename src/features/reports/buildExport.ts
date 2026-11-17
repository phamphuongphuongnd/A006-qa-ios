import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import { zipSync, type Zippable } from 'fflate';

import { listCategories } from '@/db/categoriesRepo';
import { db } from '@/db/client';
import { listEntries, listReceipts, type EntryListItem } from '@/db/entriesRepo';
import type { CategoryRow } from '@/db/schema';
import type { AppSettings } from '@/db/settingsRepo';
import { businessTripMiles } from '@/db/tripsRepo';
import { entriesCsv, mileageCsv, totalsCsv, tripSourceLabel } from '@/domain/csv';
import { metersToMiles } from '@/domain/mileage';
import { hmrcLabel } from '@/domain/mtd';
import { buildReport, MILEAGE_ID, MILEAGE_TAX_LINE, mtdOf, type Report } from '@/domain/report';
import { currencyOf, type Period, type Region } from '@/domain/types';
import { businessUse } from '@/domain/vehicleCosts';
import { receiptsDir } from '@/files/receipts';

import { bundleFileName, exportFileName, isProKind, receiptZipNames, reportHtml, type ExportKind } from './exportDocs';
import {
  DEFAULT_FREEAGENT_VEHICLE,
  freeAgentExpensesCsv,
  freeAgentMileageCsv,
  mtdRecords,
  mtdRecordsCsv,
  mtdSummaryCsv,
  mtdSummaryRows,
  mtdWorkbook,
  vehicleNote,
  type FreeAgentVehicle,
  type MtdMileage,
} from './mtdFiles';
import { rangeText, type ReportPeriod } from './period';
import { finishedTrips, tripSummary } from './queries';
import { mileageWindow, monthlySeries, rangeMileageEstimate, ratesLabel } from './series';
import { xlsxBytes } from './xlsx';

export class ExportCancelled extends Error {}
export class NothingToExport extends Error {}
/** QA-100 SPE-6: printing never returned on a big period — give up after this long and say so. */
export class PdfTooBig extends Error {}
const PDF_TIMEOUT_MS = 120_000;

/** Below this we don't even try (PDF + photos can be several MB). */
const MIN_FREE_BYTES = 25 * 1024 * 1024;

export interface ExportFile {
  file: File;
  mimeType: string;
  uti: string;
}

type Ext = 'csv' | 'pdf' | 'zip' | 'xlsx';
const MIME: Record<Ext, { mimeType: string; uti: string }> = {
  csv: { mimeType: 'text/csv', uti: 'public.comma-separated-values-text' },
  pdf: { mimeType: 'application/pdf', uti: 'com.adobe.pdf' },
  zip: { mimeType: 'application/zip', uti: 'public.zip-archive' },
  xlsx: { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', uti: 'org.openxmlformats.spreadsheetml.sheet' },
};

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

/** Everything the period's files are built from, read once. */
function loadData(period: ReportPeriod, region: Region, settings: AppSettings) {
  const currency = currencyOf(region);
  const cats = new Map(listCategories(db, { includeHidden: true }).map((c) => [c.id, c]));
  const rates = settings.mileageRates[region];
  const method = settings.vehicleCostMethod;
  const workTrips = businessTripMiles(db, mileageWindow(Math.min(period.start, period.cumulativeStart), period.end, region));
  const mileageFor = (p: Period): MtdMileage => {
    const s = tripSummary(db, p);
    return {
      minor: rangeMileageEstimate(workTrips, p.start, p.end, rates, region),
      miles: s.workMiles,
      ratesText: ratesLabel(rates, currency, p.start, p.end),
    };
  };
  const useOf = (p: Period) => {
    const s = tripSummary(db, p);
    const bu = businessUse(s.workMiles, s.workMiles + s.personalMiles + s.unsortedMiles);
    return bu ? { percent: bu.percent, workMiles: s.workMiles, totalMiles: s.workMiles + s.personalMiles + s.unsortedMiles } : null;
  };
  const reportFor = (entries: EntryListItem[], p: Period, mileage: MtdMileage, includePersonal = false): Report =>
    buildReport(entries, [...cats.values()], p, {
      includePersonal,
      vehicle: { method, mileageMinor: mileage.minor, workMiles: mileage.miles, region },
    });
  return { currency, cats, method, rates, mileageFor, useOf, reportFor };
}

const mtdInput = (e: EntryListItem) => ({
  id: e.id,
  occurredAt: e.occurredAt,
  type: e.type,
  amountMinor: e.amountMinor,
  note: e.note,
  merchant: e.ocrMerchant ?? null,
  categoryId: e.categoryId,
  scope: e.scope,
  receiptCount: e.receiptCount,
});
const mtdCats = (cats: Map<string, CategoryRow>) =>
  [...cats.values()].map((c) => ({ id: c.id, name: c.name, taxLine: c.taxLine, key: c.key, mtdCategory: c.mtdCategory, vehicleRunningCost: c.vehicleRunningCost }));

/**
 * Writes the chosen files into <cache>/export/ and returns the one file to share (a ZIP when several were made,
 * because the share sheet takes a single file). Pro files are skipped without `pro` (the panel never offers them).
 * MTD files are Work only and leave out entries with no category (the panel asks first). Throws ExportCancelled /
 * NothingToExport / any I/O error.
 */
export async function buildExport(opts: {
  period: ReportPeriod;
  kinds: ExportKind[];
  includePersonal: boolean;
  region: Region;
  settings: AppSettings;
  pro: boolean;
  /** FreeAgent claimant name (must match the FreeAgent user exactly) and the van's engine. */
  freeagent?: { claimant: string; vehicle: FreeAgentVehicle | null };
  isCancelled: () => boolean;
}): Promise<ExportFile> {
  const { period, includePersonal, region, settings } = opts;
  const kinds = opts.kinds.filter((k) => opts.pro || !isProKind(k));
  const step = async () => {
    await tick();
    if (opts.isCancelled()) throw new ExportCancelled();
  };
  if (Paths.availableDiskSpace > 0 && Paths.availableDiskSpace < MIN_FREE_BYTES) throw new Error('no_space');

  const dir = new Directory(Paths.cache, 'export');
  if (dir.exists) dir.delete();
  dir.create({ intermediates: true });

  const data = loadData(period, region, settings);
  const { currency, cats, method } = data;
  const all = listEntries(db, { period, oldestFirst: true });
  const entries = includePersonal ? all : all.filter((e) => e.scope === 'work');
  const catOf = (id: string | null) => (id ? cats.get(id) : undefined);
  const trips = finishedTrips(db, period).filter((t) => includePersonal || t.scope === 'work');
  const written: { file: File; ext: Ext }[] = [];

  const writeFile = async (kind: ExportKind, content: string | Uint8Array, ext: Ext, part?: string) => {
    const f = new File(dir, exportFileName(kind, period.fileStem, part));
    f.create({ overwrite: true });
    await f.write(content);
    written.push({ file: f, ext });
  };
  const writeParts = async (kind: ExportKind, name: string, docs: string[]) => {
    for (let i = 0; i < docs.length; i++) await writeFile(kind, docs[i], 'csv', docs.length > 1 ? `${name}-${i + 1}` : name);
  };

  if (kinds.includes('entriesCsv')) {
    await writeFile(
      'entriesCsv',
      entriesCsv(
        entries.map((e) => {
          const c = catOf(e.categoryId);
          const m = c && region === 'UK' ? mtdOf(c, e.type) : null;
          return {
            id: e.id,
            occurredAt: e.occurredAt,
            type: e.type,
            amountMinor: e.amountMinor,
            currency: e.currency,
            categoryName: c?.name ?? null,
            taxLine: c?.taxLine ?? null,
            mtdCategory: m ? hmrcLabel(m) : null,
            scope: e.scope,
            note: e.note,
            receiptCount: e.receiptCount,
            source: e.source,
            autoSorted: e.ruleId !== null,
          };
        }),
      ),
      'csv',
    );
    await step();
  }

  if (kinds.includes('mileageCsv')) {
    await writeFile(
      'mileageCsv',
      mileageCsv(
        trips.map((t) => ({
          startedAt: t.startedAt,
          endedAt: t.endedAt,
          miles: metersToMiles(t.distanceM),
          scope: t.scope,
          purpose: t.purpose,
          source: t.source,
          startedBy: t.startedBy,
          edited: t.edited,
          originalMiles: t.originalDistanceM !== null ? metersToMiles(t.originalDistanceM) : null,
          odoStart: t.odoStart,
          odoEnd: t.odoEnd,
          fromLabel: t.fromLabel,
          toLabel: t.toLabel,
          roundTrip: t.roundTrip,
        })),
      ),
      'csv',
    );
    await step();
  }

  const periodMileage = data.mileageFor(period);
  const report = data.reportFor(all, period, periodMileage, includePersonal);
  const bu = method === 'actual' ? data.useOf(period) : null;
  const note = vehicleNote(method, { mileage: periodMileage, coveredMinor: report.coveredMinor, businessUse: bu }, currency);

  if (kinds.includes('pdf')) {
    const running = new Set([...cats.values()].filter((c) => c.vehicleRunningCost).map((c) => c.id));
    const html = reportHtml({
      periodLabel: period.exportLabel,
      currency,
      report,
      months: monthlySeries(
        report.coveredMinor > 0 ? all.filter((e) => !(e.type === 'expense' && e.categoryId && running.has(e.categoryId))) : all,
        period,
        { includePersonal },
      ),
      includePersonal,
      mileage:
        report.mileageClaimMinor > 0
          ? {
              workMiles: periodMileage.miles,
              estimateMinor: periodMileage.minor,
              ratesNote: `at ${region === 'UK' ? 'HMRC rates' : 'IRS rate'} (${periodMileage.ratesText}${region === 'US' ? '/mi' : ''})`,
            }
          : null,
      businessUse: bu,
      vehicleNote: note,
      mtdRows: region === 'UK' ? mtdSummaryRows(report) : null,
      trips: trips.map((t) => ({
        startedAt: t.startedAt,
        miles: metersToMiles(t.distanceM),
        scope: t.scope,
        purpose: t.purpose,
        source: tripSourceLabel(t),
        edited: t.edited,
      })),
      entries: entries.map((e) => ({ ...e, categoryName: catOf(e.categoryId)?.name ?? null })),
      generatedAt: Date.now(),
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const { uri } = await Promise.race([
      Print.printToFileAsync({ html }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new PdfTooBig()), PDF_TIMEOUT_MS);
      }),
    ]).finally(() => clearTimeout(timer));
    const tmp = new File(uri);
    const f = new File(dir, exportFileName('pdf', period.fileStem));
    await tmp.move(f, { overwrite: true });
    written.push({ file: f, ext: 'pdf' });
    await step();
  }

  if (kinds.includes('totalsCsv')) {
    await writeFile(
      'totalsCsv',
      totalsCsv(
        // One row per category with its tax line (the mileage allowance on "Car, van and travel expenses" / "Line 9").
        report.byCategory.map((c) => ({
          type: c.type,
          name: c.name,
          taxLine: c.categoryId === MILEAGE_ID ? MILEAGE_TAX_LINE[region] : (catOf(c.categoryId)?.taxLine ?? ''),
          totalMinor: c.totalMinor,
        })),
        currency,
        period.csvLabel,
      ),
      'csv',
    );
    await step();
  }

  // ---- MTD (UK). Summary and spreadsheet are cumulative from the start of the MTD year; records / FreeAgent cover
  // the chosen period only, so each quarter's import adds new rows without duplicates.
  const wantsMtd = region === 'UK' && kinds.some((k) => k === 'mtdSummary' || k === 'mtdXlsx' || k === 'mtdRecords' || k === 'freeagent');
  if (wantsMtd) {
    const cum: Period = { start: period.cumulativeStart, end: period.end };
    const cumEntries = cum.start === period.start ? all : listEntries(db, { period: cum, oldestFirst: true });
    const cumMileage = cum.start === period.start ? periodMileage : data.mileageFor(cum);
    const cumWork = cumEntries.filter((e) => e.scope === 'work');
    const cumReport = data.reportFor(cumWork, cum, cumMileage);
    const cumSet = mtdRecords(cumWork.map(mtdInput), mtdCats(cats), cum, { method, mileage: cumMileage });
    const summary = {
      windowText: rangeText(cum.start, cum.end),
      kind: period.mtd ?? settings.mtdPeriod,
      leftOut: cumSet.leftOut,
      vehicleNote: vehicleNote(method, { mileage: cumMileage, coveredMinor: cumReport.coveredMinor, businessUse: method === 'actual' ? data.useOf(cum) : null }, currency),
    };

    if (kinds.includes('mtdSummary')) {
      await writeFile('mtdSummary', mtdSummaryCsv({ ...summary, rows: mtdSummaryRows(cumReport) }), 'csv');
      await step();
    }
    if (kinds.includes('mtdXlsx')) {
      await writeFile('mtdXlsx', xlsxBytes(mtdWorkbook(cumSet, summary)), 'xlsx');
      await step();
    }
    const set = mtdRecords(
      all.filter((e) => e.scope === 'work').map(mtdInput),
      mtdCats(cats),
      period,
      { method, mileage: periodMileage },
    );
    if (kinds.includes('mtdRecords')) {
      await writeFile('mtdRecords', mtdRecordsCsv(set), 'csv');
      await step();
    }
    if (kinds.includes('freeagent')) {
      const claimant = opts.freeagent?.claimant.trim() || settings.freeagentClaimant.trim();
      const vehicle = opts.freeagent?.vehicle ?? DEFAULT_FREEAGENT_VEHICLE;
      await writeParts('freeagent', 'expenses', freeAgentExpensesCsv(claimant, set, currency));
      const workTrips = finishedTrips(db, period)
        .filter((t) => t.scope === 'work')
        .map((t) => ({ at: t.startedAt, miles: metersToMiles(t.distanceM), purpose: t.purpose }));
      await writeParts('freeagent', 'mileage', freeAgentMileageCsv(claimant, workTrips, vehicle, method));
      await step();
    }
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
    if (Object.keys(files).length > 0) await writeFile('receiptsZip', zipSync(files), 'zip');
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
