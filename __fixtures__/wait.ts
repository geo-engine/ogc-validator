import { jest } from '@jest/globals';

export const wait = jest.fn<typeof import('../src/wait.js').wait>();
export const waitForWebsite =
    jest.fn<typeof import('../src/wait.js').waitForWebsite>();
