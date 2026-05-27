import * as core from '../__fixtures__/core.js';
import { jest } from '@jest/globals';
import { InputOptions } from '@actions/core';

jest.unstable_mockModule('@actions/core', () => core);

// import dynamically to ensure mocks are used
const {
    getParams,
    printParams,
    OgcApiCommon10Params,
    OgcApiProcesses10Params,
    OgcApiFeatures10Params,
    OgcApiTiles10Params,
} = await import('../src/params.js');

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
                }
                return '';
            }
        );
        core.getBooleanInput.mockReturnValue(false);

        const params = getParams();

        expect(params).toEqual({
            serviceUrl: 'https://example.com',
            teamenginePort: 8080,
        });
    });

    it('should return params with ogcApiProcesses when ogc-api-processes is true', () => {
        core.getInput.mockImplementation((name: string) => {
            switch (name) {
                case 'service-url':
                    return 'https://example.com';
                case 'ogc-api-processes-container-tag':
                    return '1.0.0';
                case 'echoprocessid':
                    return 'echo-id';
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
            ogcApiCommon10: new OgcApiCommon10Params('', [
                'ignore1',
                'ignore2',
            ]),
            ogcApiProcesses10: new OgcApiProcesses10Params('1.0.0', 'echo-id', [
                'ignore1',
                'ignore2',
            ]),
            ogcApiFeatures10: new OgcApiFeatures10Params('', [
                'ignore1',
                'ignore2',
            ]),
            ogcApiTiles10: new OgcApiTiles10Params('', ['ignore1', 'ignore2']),
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
            ogcApiProcesses10: new OgcApiProcesses10Params('1.0.0', 'echo-id', [
                'ignore1',
                'ignore2',
            ]),
        };

        printParams(params);

        expect(core.info).toHaveBeenCalledWith('Using parameters:');
        expect(core.info).toHaveBeenCalledWith(
            '- service-url: https://example.com'
        );
        expect(core.info).toHaveBeenCalledWith(
            '- ogc-api-processes-container-tag: 1.0.0'
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
            ogcApiProcesses10: new OgcApiProcesses10Params(
                '1.0.0',
                'echo-id',
                []
            ),
        };

        printParams(params);

        expect(core.info).toHaveBeenCalledWith('Using parameters:');
        expect(core.info).toHaveBeenCalledWith(
            '- service-url: https://example.com'
        );
        expect(core.info).toHaveBeenCalledWith(
            '- ogc-api-processes-container-tag: 1.0.0'
        );
        expect(core.info).toHaveBeenCalledWith('- echoprocessid: echo-id');
        expect(core.info).toHaveBeenCalledWith(
            '- ogc-api-processes-ignore: (none)'
        );
    });
});
