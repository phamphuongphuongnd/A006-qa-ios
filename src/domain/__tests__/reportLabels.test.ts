import { mtdRowLabel } from '../report';

// B-47 · TC-309: the "MTD categories" tab names unsorted income and expenses apart, like the SA103 tab.
describe('Reports MTD row labels', () => {
  it('names unsorted income and expenses apart', () => {
    expect(mtdRowLabel({ mtdCategory: null, type: 'income' })).toBe('Unsorted income');
    expect(mtdRowLabel({ mtdCategory: null, type: 'expense' })).toBe('Unsorted expenses');
  });
  it('uses the HMRC category name otherwise', () => {
    expect(mtdRowLabel({ mtdCategory: 'adminCosts', type: 'expense' })).toBe('Administrative costs');
  });
});
