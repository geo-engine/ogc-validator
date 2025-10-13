/**
 * Unit tests for src/wait.ts
 */
import { wait, waitForWebsite } from '../src/wait.js';
import { jest } from '@jest/globals';

describe('wait.ts', () => {
    it('Throws an invalid number', async () => {
        const input = parseInt('foo', 10);

        expect(isNaN(input)).toBe(true);

        await expect(wait(input)).rejects.toThrow(
            'milliseconds is not a number'
        );
    });

    it('Waits with a valid number', async () => {
        const start = new Date();
        await wait(500);
        const end = new Date();

        const delta = Math.abs(end.getTime() - start.getTime());

        expect(delta).toBeGreaterThan(450);
    });

    it('Waits for a website to respond', async () => {
        global.fetch = jest.fn<typeof fetch>().mockImplementation(
            async () =>
                ({
                    ok: true,
                }) as unknown as Response
        );

        await expect(
            waitForWebsite(`http://example.com`, 5)
        ).resolves.toBeUndefined();
    });
});
