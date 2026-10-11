import { wrapLabel } from '@utils/wrapLabel';

describe('wrapLabel', () => {
  it('keeps a short label on one line', () => {
    expect(wrapLabel('Moon Landing', 15)).toEqual(['Moon Landing']);
  });

  it('breaks at spaces', () => {
    expect(wrapLabel('Civil Rights Act Passed', 15)).toEqual([
      'Civil Rights',
      'Act Passed',
    ]);
  });

  it('ends with an ellipsis when it runs out of lines', () => {
    expect(wrapLabel('Assassination of John F. Kennedy', 15)).toEqual([
      'Assassination',
      'of John F.…',
    ]);
  });

  it('splits a word longer than a line', () => {
    expect(wrapLabel('Supercalifragilisticexpialidocious', 10)).toEqual([
      'Supercalif',
      'ragilisti…',
    ]);
  });

  it('never returns lines longer than asked', () => {
    const lines = wrapLabel(
      'The Phone That Shows One Service And Nothing Else',
      15,
    );
    expect(lines).toHaveLength(2);
    lines.forEach((l) => expect(l.length).toBeLessThanOrEqual(15));
  });
});
