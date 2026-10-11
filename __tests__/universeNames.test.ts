import { universeName, universeShortName } from '@utils/universeNames';

describe('universe names', () => {
  it('calls universe 1 the prime universe', () => {
    expect(universeName('1')).toBe('Prime universe');
    expect(universeShortName('1')).toBe('Prime');
  });
  it('names other universes by their name', () => {
    expect(universeName('No bailout')).toBe('Universe No bailout');
    expect(universeShortName('No bailout')).toBe('No bailout');
  });
});
