import * as core from '@actions/core';
import { waitForWebsite } from './wait.js';
import { exec, getExecOutput } from '@actions/exec';
import { XMLParser } from 'fast-xml-parser';
import * as fs from 'fs/promises';
import { getParams, printParams } from './params.js';

const WAIT_TIMEOUT: number = 300; // 5 minutes in seconds
const VALIDATOR_SERVER_URL = 'http://localhost:8080/teamengine';

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
    const summaries = [];

    try {
        const params = getParams();
        printParams(params);

        core.info(`Waiting for ${params.serviceUrl} …`);
        await waitForWebsite(params.serviceUrl, WAIT_TIMEOUT);

        if (params.ogcApiProcesses10) {
            core.startGroup('OGC API - Processes 1.0 Validation');
            core.info('Validating OGC API - Processes …');
            summaries.push(
                await validateOGCAPIProcesses10(
                    params.serviceUrl,
                    params.ogcApiProcesses10.containerTag,
                    params.ogcApiProcesses10.echoProcessId,
                    params.ogcApiProcesses10.testsToIgnore
                )
            );
            core.endGroup();
        }

        if (!summaries.length) {
            core.warning(
                'No validations were selected. Please enable at least one validation option.'
            );
        }

        const hasFailures = summaries.some((s) => !s.success);
        if (hasFailures) {
            core.setFailed('One or more validations failed.');
        } else {
            core.info('All validations passed successfully.');
        }
    } catch (error) {
        // Fail the workflow run if an error occurs
        if (error instanceof Error) core.setFailed(error.message);
    }

    const tableHeaders = [
        'Test Suite',
        'Result',
        'Passed',
        'Skipped',
        'Failed',
        '(Failed but ignored)',
        'Total',
    ];

    printResults(summaries, tableHeaders);

    core.summary
        .addHeading('OGC API - Validation Summary')
        .addTable([
            tableHeaders.map((header) => ({ data: header, header: true })),
            ...summaries.map((s) => [
                s.name,
                s.success ? '✅ Success' : '❌ Failure',
                s.passed.toString(),
                s.skipped.toString(),
                s.failed.toString(),
                s.ignored.toString(),
                s.total.toString(),
            ]),
        ])
        .write();
}

async function validateOGCAPIProcesses10(
    serviceUrl: string,
    containerTag: string,
    echoProcessId: string,
    ogcApiCoveragesIgnore: string[]
): Promise<TestSummary> {
    const validatorServerContainerId = (
        await getExecOutput(
            'podman',
            [
                'run',
                '--rm',
                '--detach',
                '--network',
                'host',
                `docker.io/ogccite/ets-ogcapi-processes10:${containerTag}`,
            ],
            {
                silent: true,
            }
        )
    ).stdout.trim();

    try {
        return await _validateOGCAPIProcesses(
            serviceUrl,
            echoProcessId,
            ogcApiCoveragesIgnore
        );
    } finally {
        // Stop the validator server
        await exec('podman', ['stop', validatorServerContainerId], {
            silent: true,
        });
        core.info('Stopped Team Engine validator server');
    }
}

export async function _validateOGCAPIProcesses(
    serviceUrl: string,
    echoProcessId: string,
    ogcApiCoveragesIgnore: string[],
    debugEnabled = false
): Promise<TestSummary> {
    core.info(`Waiting for Team Engine server …`);
    await waitForWebsite(VALIDATOR_SERVER_URL, WAIT_TIMEOUT);

    core.info(`Running tests …`);
    const url =
        `${VALIDATOR_SERVER_URL}/rest/suites/ogcapi-processes-1.0/run?` +
        new URLSearchParams({
            iut: serviceUrl,
            echoprocessid: echoProcessId,
        }).toString();
    core.info(`Using test URL: ${url}`);
    const testRequest = new Request(url, {
        method: 'GET',
        headers: {
            Accept: 'application/xml', // delivers TestNG XML
            Authorization:
                'Basic ' + Buffer.from('ogctest:ogctest').toString('base64'),
        },
    });
    const testResult = await fetch(testRequest);

    if (!testResult.ok) {
        throw new Error(
            `Failed to run OGC API - Processes tests: ${testResult.status} ${testResult.statusText}`
        );
    }

    const testResultXml = await testResult.text();
    if (debugEnabled) {
        const filePath = 'test-results-processes.xml';
        await fs.writeFile(filePath, testResultXml, { encoding: 'utf8' });
    }
    const { suite, results } = await extractResults(testResultXml);

    const total = results.length;
    const passed = results.filter((r) => r.status === 'PASS').length;
    const skipped = results.filter((r) => r.status === 'SKIP').length;
    const failed = results.filter((r) => r.status === 'FAIL').length;
    let ignored = 0;

    for (const result of results) {
        if (result.status === 'PASS') continue;

        const message = result.message ?? 'No additional information provided.';

        if (result.status === 'SKIP') {
            core.warning(`${message} (SKIPPED)`, {
                title: result.name,
            });
            printAttributes(result.attributes);
        }

        if (result.status === 'FAIL') {
            const isIgnored = ogcApiCoveragesIgnore.includes(result.name);
            const indicator = isIgnored ? 'IGNORED' : 'FAILED';
            ignored += isIgnored ? 1 : 0;
            core.error(`${message} (${indicator})`, {
                title: result.name,
            });
            printAttributes(result.attributes);
        }
    }

    const failedAndNotIgnored = failed - ignored;

    return {
        name: suite,
        success: failedAndNotIgnored === 0,
        passed,
        skipped,
        failed,
        ignored,
        total,
    };
}

function printAttributes(attributes?: Record<string, string>): void {
    if (!attributes) return;

    for (const [key, value] of Object.entries(attributes)) {
        core.notice(`  ${key}:\n${value}`);
    }
}

interface TestResult {
    name: string;
    status: 'PASS' | 'FAIL' | 'SKIP';
    message?: string;
    attributes?: Record<string, string>;
}

interface TestSummary {
    name: string;
    success: boolean;
    passed: number;
    skipped: number;
    failed: number;
    ignored: number;
    total: number;
}

interface TestNgSuite {
    test: Array<TestNgTest>;
}

interface TestNgTest {
    class: Array<TestNgClass>;
}

interface TestNgClass {
    'test-method': Array<TestNgTestMethod>;
}

interface TestNgTestMethod {
    name: string;
    status: string;
    'is-config'?: boolean;
    exception?: { message: string };
    attributes?: { attribute: Array<TestNgAttribute> };
}

interface TestNgAttribute {
    name: string;
    '#text': string;
}

interface ExtractionResult {
    suite: string;
    results: Array<TestResult>;
}

async function extractResults(xml: string): Promise<ExtractionResult> {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        isArray: (name: string, _jpath: string) => {
            return [
                'suite',
                'test',
                'class',
                'test-method',
                'attribute',
            ].includes(name);
        },
    });
    const parsedXml = parser.parse(xml);

    if (!parsedXml || !parsedXml['testng-results']) {
        throw new Error('Invalid or missing test results in the XML.');
    }

    const testSuites: TestNgSuite[] = parsedXml['testng-results'].suite;

    const results: Array<TestResult> = [];

    for (const testMethod of testSuites.flatMap((suite) =>
        suite.test.flatMap((test) =>
            test['class'].flatMap((testClass) => testClass['test-method'])
        )
    )) {
        if (testMethod['is-config']) {
            continue;
        }

        results.push({
            name: testMethod.name,
            status: testMethod.status.toUpperCase() as 'PASS' | 'FAIL' | 'SKIP',
            message: testMethod.exception?.message,
            attributes: testMethod.attributes
                ? Object.fromEntries(
                      testMethod.attributes.attribute.map((attr) => [
                          attr.name,
                          attr['#text'],
                      ])
                  )
                : undefined,
        });
    }

    return {
        suite: parsedXml['testng-results'].suite[0].name,
        results,
    };
}

function printResults(
    summaries: Array<TestSummary>,
    tableHeader: string[]
): void {
    const tableRows = summaries.map((s) => [
        s.name,
        s.success ? '✅ Success' : '❌ Failure',
        s.passed.toString(),
        s.skipped.toString(),
        s.failed.toString(),
        s.ignored.toString(),
        s.total.toString(),
    ]);

    const columnWidths = tableHeader.map((_, colIndex) =>
        Math.max(
            tableHeader[colIndex].length,
            ...tableRows.map((row) => row[colIndex].length)
        )
    );

    const formatRow = (row: string[]) =>
        row
            .map((cell, colIndex) => cell.padEnd(columnWidths[colIndex], ' '))
            .join(' | ');

    const separator = columnWidths
        .map((width) => '-'.repeat(width))
        .join('-|-');

    console.info('\n' + formatRow(tableHeader));
    console.info(separator);
    tableRows.forEach((row) => console.info(formatRow(row)));
}
