import { OGC_API_KEYS } from './params.js';

export interface OgcApiServiceConfig {
    readonly name: string;

    printParams(): Array<PrintParam>;

    request(teamengineUrl: string, serviceUrl: string): Request;

    readonly testsToIgnore: string[];

    readonly xmlFilePath: string;
}

interface PrintParam {
    key: string;
    value: string;
}

export class OgcApiProcesses10Service implements OgcApiServiceConfig {
    readonly name = 'OGC API - Processes 1.0';
    readonly echoProcessId: string;
    readonly testsToIgnore: string[];
    readonly xmlFilePath = 'test-results-processes.xml';

    constructor(echoProcessId: string, testsToIgnore: string[]) {
        this.echoProcessId = echoProcessId;
        this.testsToIgnore = testsToIgnore;
    }

    printParams(): Array<PrintParam> {
        return [
            {
                key: OGC_API_KEYS.PROCESSES.ECHOPROCESSID,
                value: this.echoProcessId,
            },
            {
                key: OGC_API_KEYS.PROCESSES.TESTS_TO_IGNORE,
                value: this.testsToIgnore.join(', ') || '(none)',
            },
        ];
    }

    request(teamengineUrl: string, serviceUrl: string): Request {
        const url =
            `${teamengineUrl}/rest/suites/ogcapi-processes-1.0/run?` +
            new URLSearchParams({
                iut: serviceUrl,
                echoprocessid: this.echoProcessId,
            }).toString();
        return new Request(url, {
            method: 'GET',
            headers: {
                Accept: 'application/xml', // delivers TestNG XML
                Authorization:
                    'Basic ' +
                    Buffer.from('ogctest:ogctest').toString('base64'),
            },
        });
    }
}

export class OgcApiFeatures10Service implements OgcApiServiceConfig {
    readonly name = 'OGC API - Features 1.0';
    readonly testsToIgnore: string[];
    readonly xmlFilePath = 'test-results-features.xml';

    constructor(testsToIgnore: string[]) {
        this.testsToIgnore = testsToIgnore;
    }

    printParams(): Array<PrintParam> {
        return [
            {
                key: OGC_API_KEYS.FEATURES.TESTS_TO_IGNORE,
                value: this.testsToIgnore.join(', ') || '(none)',
            },
        ];
    }

    request(teamengineUrl: string, serviceUrl: string): Request {
        const url =
            `${teamengineUrl}/rest/suites/ogcapi-features-1.0/run?` +
            new URLSearchParams({
                iut: serviceUrl,
            }).toString();
        return new Request(url, {
            method: 'GET',
            headers: {
                Accept: 'application/xml', // delivers TestNG XML
                Authorization:
                    'Basic ' +
                    Buffer.from('ogctest:ogctest').toString('base64'),
            },
        });
    }
}

export class OgcApiTiles10Service implements OgcApiServiceConfig {
    readonly name = 'OGC API - Tiles 1.0';
    readonly xmlFilePath = 'test-results-tiles.xml';

    constructor(
        readonly testsToIgnore: string[],
        readonly tileMatrixSetDefinitionUrl: string,
        readonly urlTemplateForTiles: string,
        readonly tileMatrix: number,
        readonly minTileRow: number,
        readonly maxTileRow: number,
        readonly minTileCol: number,
        readonly maxTileCol: number
    ) {}

    printParams(): Array<PrintParam> {
        return [
            {
                key: OGC_API_KEYS.TILES.TESTS_TO_IGNORE,
                value: this.testsToIgnore.join(', ') || '(none)',
            },
        ];
    }

    request(teamengineUrl: string, serviceUrl: string): Request {
        const url =
            `${teamengineUrl}/rest/suites/ogcapi-tiles-1.0/run?` +
            new URLSearchParams({
                iut: serviceUrl,
                tilematrixsetdefinitionuri: this.tileMatrixSetDefinitionUrl,
                urltemplatefortiles: this.urlTemplateForTiles,
                tilematrix: this.tileMatrix.toString(),
                mintilerow: this.minTileRow.toString(),
                maxtilerow: this.maxTileRow.toString(),
                mintilecol: this.minTileCol.toString(),
                maxtilecol: this.maxTileCol.toString(),
            }).toString();
        return new Request(url, {
            method: 'GET',
            headers: {
                Accept: 'application/xml', // delivers TestNG XML; alternatively, application/json could be used for JSON output
                Authorization:
                    'Basic ' +
                    Buffer.from('ogctest:ogctest').toString('base64'),
            },
        });
    }
}
