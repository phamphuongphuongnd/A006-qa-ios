"""Summarise every persona result.json under <out_root> into summary.json + summary.md (also for $GITHUB_STEP_SUMMARY)."""
import glob
import json
import os
import sys

ICON = {'passed': '✅', 'failed': '❌', 'not_run': '⏭', 'not_applicable': '·', 'skipped': '⏭'}


def main():
    root = sys.argv[1]
    results = []
    for p in sorted(glob.glob(os.path.join(root, 'personas', '*', 'result.json'))):
        with open(p, encoding='utf-8') as f:
            results.append(json.load(f))
    planned = []
    plan = os.path.join(root, 'planned.txt')
    if os.path.isfile(plan):
        planned = [x.strip() for x in open(plan, encoding='utf-8') if x.strip()]
    done = {r['persona'] for r in results}
    missing = [p for p in planned if p not in done]
    steps = [s['step'] for s in results[0]['steps']] if results else []
    lines = ['# QA-100 iOS run', '', f'Personas with results: {len(results)} / planned {len(planned)}', '']
    if missing:
        lines += [f"⏭ Not run (time budget or lane error): {', '.join(missing)}", '']
    lines.append('| persona | device | look | ' + ' | '.join(s[:2] for s in steps) + ' | crash | shots |')
    lines.append('|' + '---|' * (len(steps) + 5))
    for r in results:
        st = r['settings']
        look = f"{st['appearance']}/{st['content_size']}/{st['region']}" + ('/landscape' if st.get('orientation') == 'LANDSCAPE_LEFT' else '')
        cells = [ICON.get(s['status'], s['status']) for s in r['steps']]
        lines.append(f"| {r['persona']} | {r['device']['name']} | {look} | " + ' | '.join(cells) + f" | {len(r['crash_reports'])} | {len(r['screenshots'])} |")
    lines += ['', 'Steps: ' + ', '.join(steps), '', '## Failures', '']
    for r in results:
        for s in r['steps']:
            if s['status'] == 'failed':
                lines.append(f"- **{r['persona']}** ({r['device']['name']}) `{s['step']}`: {s['message'][:300]}")
    summary = {'results': len(results), 'planned': planned, 'missing': missing,
               'failed_steps': sum(r['failed'] for r in results), 'crashes': sum(len(r['crash_reports']) for r in results)}
    with open(os.path.join(root, 'summary.json'), 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=1)
    md = '\n'.join(lines) + '\n'
    with open(os.path.join(root, 'summary.md'), 'w', encoding='utf-8') as f:
        f.write(md)
    gs = os.environ.get('GITHUB_STEP_SUMMARY')
    if gs:
        with open(gs, 'a', encoding='utf-8') as f:
            f.write(md)
    print(md)


if __name__ == '__main__':
    main()
