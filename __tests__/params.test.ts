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
        (core.getMultilineInput as jest.Mock).mockReturnValue([
            'ignore1',
            'ignore2',
        ]);

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
