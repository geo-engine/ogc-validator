import * as core from '../__fixtures__/core.js';
import { jest } from '@jest/globals';
import { InputOptions } from '@actions/core';

jest.unstable_mockModule('@actions/core', () => core);

// import dynamically to ensure mocks are used
const { getParams, printParams } = await import('../src/params.js');
const {
    OgcApiProcesses10Service,
    OgcApiFeatures10Service,
    OgcApiTiles10Service,
} = await import('../src/services.js');

describe('getParams', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return params with only serviceUrl when ogc-api-processes is false', () => {
        core.getInput.mockImplementation(
            (name: string, _options?: InputOptions | undefined): string => {
                switch (name) {
                    case 'service-url':
                        return 'https://example.com';
                    case 'teamengine-image':
                        return 'teamengine-production:1.0-SNAPSHOT';
                }
                return '';
            }
        );
        core.getBooleanInput.mockReturnValue(false);

        const params = getParams();

        expect(params).toEqual({
            serviceUrl: 'https://example.com',
            teamenginePort: 8080,
            teamengineImage: 'teamengine-production:1.0-SNAPSHOT',
            services: [],
        });
    });

    it('should return params with ogcApiProcesses when ogc-api-processes is true', () => {
        core.getInput.mockImplementation((name: string) => {
            switch (name) {
                case 'service-url':
                    return 'https://example.com';
                case 'teamengine-image':
                    return 'teamengine-production:1.0-SNAPSHOT';
                case 'echoprocessid':
                    return 'echo-id';
                case 'ogc-api-tiles-urltemplatefortiles':
                    return 'https://example.com/tiles/{tileMatrix}/{tileRow}/{tileCol}';
                case 'ogc-api-tiles-tilematrix':
                    return '1';
                case 'ogc-api-tiles-mintilerow':
                    return '0';
                case 'ogc-api-tiles-maxtilerow':
                    return '1';
                case 'ogc-api-tiles-mintilecol':
                    return '0';
                case 'ogc-api-tiles-maxtilecol':
                    return '1';
                default:
                    return '';
            }
        });
        (core.getBooleanInput as jest.Mock).mockReturnValue(true);
        core.getMultilineInput.mockImplementation((name: string) =>
            name === 'ogc-api-tiles-urltemplatefortiles'
                ? ['https://example.com/tiles/{tileMatrix}/{tileRow}/{tileCol}']
                : ['ignore1', 'ignore2']
        );

        const params = getParams();

        expect(params).toEqual({
            serviceUrl: 'https://example.com',
            teamenginePort: 8080,
            teamengineImage: 'teamengine-production:1.0-SNAPSHOT',
            services: [
                new OgcApiProcesses10Service('echo-id', ['ignore1', 'ignore2']),
                new OgcApiFeatures10Service(['ignore1', 'ignore2']),
                new OgcApiTiles10Service(
                    ['ignore1', 'ignore2'],
                    '',
                    'https://example.com/tiles/{tileMatrix}/{tileRow}/{tileCol}',
                    1,
                    0,
                    1,
                    0,
                    1
                ),
            ],
        });
    });
    it('should create one tiles service per URL template line', () => {
        core.getInput.mockImplementation((name: string) => {
            switch (name) {
                case 'service-url':
                    return 'https://example.com';
                case 'teamengine-image':
                    return 'teamengine-production:1.0-SNAPSHOT';
                case 'ogc-api-tiles-tilematrixsetdefinitionurl':
                    return 'https://example.com/tms';
                case 'ogc-api-tiles-tilematrix':
                case 'ogc-api-tiles-maxtilerow':
                case 'ogc-api-tiles-maxtilecol':
                    return '1';
                case 'ogc-api-tiles-mintilerow':
                case 'ogc-api-tiles-mintilecol':
                    return '0';
                default:
                    return '';
            }
        });
        core.getBooleanInput.mockImplementation(
            (name: string) => name === 'ogc-api-tiles'
        );
        core.getMultilineInput.mockImplementation((name: string) =>
            name === 'ogc-api-tiles-urltemplatefortiles'
                ? [
                      'https://example.com/map/{tileMatrix}/{tileRow}/{tileCol}',
                      'https://example.com/coverage/{tileMatrix}/{tileRow}/{tileCol}',
                  ]
                : []
        );

        const params = getParams();

        expect(params.services).toEqual([
            new OgcApiTiles10Service(
                [],
                'https://example.com/tms',
                'https://example.com/map/{tileMatrix}/{tileRow}/{tileCol}',
                1,
                0,
                1,
                0,
                1,
                1
            ),
            new OgcApiTiles10Service(
                [],
                'https://example.com/tms',
                'https://example.com/coverage/{tileMatrix}/{tileRow}/{tileCol}',
                1,
                0,
                1,
                0,
                1,
                2
            ),
        ]);
        expect(params.services.map((s) => s.name)).toEqual([
            'OGC API - Tiles 1.0 (#1)',
            'OGC API - Tiles 1.0 (#2)',
        ]);
        expect(params.services.map((s) => s.xmlFilePath)).toEqual([
            'test-results-tiles-1.xml',
            'test-results-tiles-2.xml',
        ]);
    });

    it('should keep the single-run tiles name without run number', () => {
        core.getInput.mockImplementation((name: string) => {
            switch (name) {
                case 'service-url':
                    return 'https://example.com';
                case 'teamengine-image':
                    return 'teamengine-production:1.0-SNAPSHOT';
                case 'ogc-api-tiles-tilematrix':
                    return '1';
                default:
                    return '0';
            }
        });
        core.getBooleanInput.mockImplementation(
            (name: string) => name === 'ogc-api-tiles'
        );
        core.getMultilineInput.mockReturnValue([]);

        const [tiles] = getParams().services;

        expect(tiles.name).toBe('OGC API - Tiles 1.0');
        expect(tiles.xmlFilePath).toBe('test-results-tiles.xml');
    });
});

describe('printParams', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should log parameters without ogcApiProcesses', () => {
        const params = {
            serviceUrl: 'https://example.com',
            teamenginePort: 8080,
            teamengineImage: 'teamengine-production:1.0-SNAPSHOT',
            services: [],
        };

        printParams(params);

        expect(core.info).toHaveBeenCalledWith('Using parameters:');
        expect(core.info).toHaveBeenCalledWith(
            '- service-url: https://example.com'
        );
        expect(core.info).toHaveBeenCalledWith('- teamengine-port: 8080');
    });

    it('should log parameters with ogcApiProcesses', () => {
        const params = {
            serviceUrl: 'https://example.com',
            teamenginePort: 8080,
            teamengineImage: 'teamengine-production:1.0-SNAPSHOT',
            services: [
                new OgcApiProcesses10Service('echo-id', ['ignore1', 'ignore2']),
            ],
        };

        printParams(params);

        expect(core.info).toHaveBeenCalledWith('Using parameters:');
        expect(core.info).toHaveBeenCalledWith(
            '- service-url: https://example.com'
        );
        expect(core.info).toHaveBeenCalledWith('- echoprocessid: echo-id');
        expect(core.info).toHaveBeenCalledWith(
            '- ogc-api-processes-ignore: ignore1, ignore2'
        );
    });

    it('should log parameters with empty ogcApiProcessesIgnore', () => {
        const params = {
            serviceUrl: 'https://example.com',
            teamenginePort: 8080,
            teamengineImage: 'teamengine-production:1.0-SNAPSHOT',
            services: [new OgcApiProcesses10Service('echo-id', [])],
        };

        printParams(params);

        expect(core.info).toHaveBeenCalledWith('Using parameters:');
        expect(core.info).toHaveBeenCalledWith(
            '- service-url: https://example.com'
        );
        expect(core.info).toHaveBeenCalledWith('- echoprocessid: echo-id');
        expect(core.info).toHaveBeenCalledWith(
            '- ogc-api-processes-ignore: (none)'
        );
    });
});
