/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * To mock dependencies in ESM, you can create fixtures that export mock
 * functions and objects. For example, the core module is mocked in this test,
 * so that the actual '@actions/core' module is not imported.
 */
import { jest } from '@jest/globals';
import * as core from '../__fixtures__/core.js';
import {
    OgcApiProcesses10Service,
    OgcApiTiles10Service,
} from '../src/services.js';

const mockExec = jest.fn();
const mockGetExecOutput = jest.fn();
const mockWaitForWebsite = jest.fn();
const mockGetParams = jest.fn();
const mockPrintParams = jest.fn();
const mockWriteFile = jest.fn();
const mockGroup = jest.fn(
    async (_name: string, callback: () => Promise<unknown>) => callback()
);
const mockIsDebug = jest.fn(() => false);
const mockSummary = {
    addHeading: jest.fn().mockReturnThis(),
    addTable: jest.fn().mockReturnThis(),
    write: jest.fn(),
};

// Mocks should be declared before the module being tested is imported.
jest.unstable_mockModule('@actions/core', () => ({
    ...core,
    group: mockGroup,
    isDebug: mockIsDebug,
    summary: mockSummary,
}));
jest.unstable_mockModule('@actions/exec', () => ({
    exec: mockExec,
    getExecOutput: mockGetExecOutput,
}));
jest.unstable_mockModule('../src/wait.js', () => ({
    waitForWebsite: mockWaitForWebsite,
}));
jest.unstable_mockModule('../src/params.js', () => ({
    getParams: mockGetParams,
    printParams: mockPrintParams,
}));
jest.unstable_mockModule('fs/promises', () => ({
    writeFile: mockWriteFile,
}));

const { run, validateOGCAPI } = await import('../src/main.js');

describe('main.ts', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        mockExec.mockResolvedValue(undefined);
        mockGetExecOutput.mockResolvedValue({ stdout: 'container-id\n' });
        mockWaitForWebsite.mockResolvedValue(undefined);
        mockGetParams.mockReturnValue({
            serviceUrl: 'https://example.com',
            teamenginePort: 8080,
            teamengineImage: 'teamengine-production:1.0-SNAPSHOT',
            services: [],
        });

        global.fetch = jest
            .fn<typeof fetch>()
            .mockRejectedValue(new Error('Connection refused'));
    });

    it('Validates OGC API Processes successfully', async () => {
        const mockServiceUrl = 'http://mock-service-url';
        const mockEchoProcessId = 'mock-echo-process-id';
        const mockIgnoreList: string[] = ['test1'];

        // Mock the fetch function to simulate a successful test result
        global.fetch = jest.fn<typeof fetch>().mockImplementation(async () => {
            return {
                ok: true,
                text: async () => `
                    <testng-results>
                        <suite name="Suite1" duration-ms="2000">
                        <groups>
                        <group name="group1">
                            <method signature="com.test.TestOne.test2()" name="test2" class="com.test.TestOne"/>
                            <method signature="com.test.TestOne.test1()" name="test1" class="com.test.TestOne"/>
                        </group>
                        <group name="group2">
                            <method signature="com.test.TestOne.test2()" name="test2" class="com.test.TestOne"/>
                        </group>
                        </groups>
                        <test name="test1">
                        <class name="com.test.TestOne">
                            <test-method status="FAIL" signature="test1()" name="test1" duration-ms="11"
                            started-at="2007-05-28T12:14:37Z" description="someDescription2"
                            finished-at="2007-05-28T12:14:37Z">
                            <exception class="java.lang.AssertionError">
                            <short-stacktrace>
                            <![CDATA[
                                java.lang.AssertionError
                                ... Removed 22 stack frames
                            ]]>
                            </short-stacktrace>
                            </exception>
                            </test-method>
                            <test-method status="PASS" signature="test2()" name="test2" duration-ms="11"
                            started-at="2007-05-28T12:14:37Z" description="someDescription1"
                            finished-at="2007-05-28T12:14:37Z">
                            </test-method>
                            <test-method signature="testJobCreationAutoExecutionMode()[pri:0, instance:org.opengis.cite.ogcapiprocesses10.jobs.Jobs@1375f773]" started-at="2025-10-13T11:15:29 UTC" name="testJobCreationAutoExecutionMode" description="Implements Requirement /req/core/job-creation-op " finished-at="2025-10-13T11:15:29 UTC" duration-ms="3" status="SKIP">
                            <exception class="org.testng.SkipException">
                            <message>
                            This test is skipped because the server has not declared support for asynchronous execution mode. Also note that the specification does not mandate that servers create a job as a result of executing a process synchronously (See Clause 7.11.4 of OGC 18-062r2)
                            </message>
                            </exception> <!-- org.testng.SkipException -->
                            <reporter-output>
                            </reporter-output>
                            </test-method>
                        </class>
                        </test>
                        </suite>
                    </testng-results>
                        `,
            } as unknown as Response;
        });

        const testRequest = new OgcApiProcesses10Service(
            mockEchoProcessId,
            mockIgnoreList
        ).request('http://localhost:8080/teamengine', mockServiceUrl);

        const result = await validateOGCAPI({
            testRequest,
            testsToIgnore: mockIgnoreList,
            xmlFilePath: '',
        });

        expect(result).toEqual({
            name: 'Suite1',
            success: true,
            passed: 1,
            skipped: 1,
            failed: 1,
            ignored: 1,
            total: 3,
        });
    });

    it('Builds OGC API Tiles request with required tile parameters', () => {
        const request = new OgcApiTiles10Service(
            [],
            '',
            'https://example.com/tiles/{tileMatrix}/{tileRow}/{tileCol}',
            1,
            0,
            1,
            0,
            1
        ).request('http://localhost:8080/teamengine', 'https://example.com');

        const url = new URL(request.url);
        expect(url.searchParams.get('iut')).toBe('https://example.com');
        expect(url.searchParams.get('urltemplatefortiles')).toBe(
            'https://example.com/tiles/{tileMatrix}/{tileRow}/{tileCol}'
        );
        expect(url.searchParams.get('tilematrix')).toBe('1');
        expect(url.searchParams.get('mintilerow')).toBe('0');
        expect(url.searchParams.get('maxtilerow')).toBe('1');
        expect(url.searchParams.get('mintilecol')).toBe('0');
        expect(url.searchParams.get('maxtilecol')).toBe('1');
    });

    it('throws when validator endpoint returns a non-OK status', async () => {
        global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
        } as Response);

        await expect(
            validateOGCAPI({
                testRequest: new Request('https://example.com/test-run'),
                testsToIgnore: [],
                xmlFilePath: '',
            })
        ).rejects.toThrow(
            'Failed to run OGC API tests: 500 Internal Server Error'
        );
    });

    it('throws for invalid XML payloads', async () => {
        global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
            ok: true,
            text: async () => '<invalid-results/>',
        } as Response);

        await expect(
            validateOGCAPI({
                testRequest: new Request('https://example.com/test-run'),
                testsToIgnore: [],
                xmlFilePath: '',
            })
        ).rejects.toThrow('Invalid or missing test results in the XML.');
    });

    it('writes XML to file when debug mode is enabled', async () => {
        mockIsDebug.mockReturnValue(true);
        global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
            ok: true,
            text: async () => `
                <testng-results>
                    <suite name="DebugSuite">
                        <test name="debug-test">
                            <class name="com.test.Debug">
                                <test-method name="debugPass" status="PASS" />
                            </class>
                        </test>
                    </suite>
                </testng-results>
            `,
        } as Response);

        const xmlFilePath = '/tmp/debug-result.xml';
        await validateOGCAPI({
            testRequest: new Request('https://example.com/test-run'),
            testsToIgnore: [],
            xmlFilePath,
        });

        expect(mockWriteFile).toHaveBeenCalledWith(
            xmlFilePath,
            expect.stringContaining('<testng-results>'),
            { encoding: 'utf8' }
        );
    });

    it('runs full validation flow and reports success', async () => {
        const request = new Request(
            'http://localhost:8080/teamengine/rest/suites/ogcapi-features-1.0/run?iut=https://example.com'
        );
        mockGetParams.mockReturnValue({
            serviceUrl: 'https://example.com',
            teamenginePort: 8080,
            teamengineImage: 'teamengine-production:1.0-SNAPSHOT',
            services: [
                {
                    name: 'Features',
                    testsToIgnore: [],
                    xmlFilePath: '',
                    request: jest.fn().mockReturnValue(request),
                },
            ],
        });

        global.fetch = jest
            .fn<typeof fetch>()
            .mockRejectedValueOnce(new Error('Port free'))
            .mockResolvedValueOnce({
                ok: true,
                text: async () => `
                    <testng-results>
                        <suite name="FeatureSuite">
                            <test name="features">
                                <class name="com.test.Features">
                                    <test-method name="featurePass" status="PASS" />
                                </class>
                            </test>
                        </suite>
                    </testng-results>
                `,
            } as Response);

        await run();

        expect(core.setFailed).not.toHaveBeenCalled();
        expect(core.info).toHaveBeenCalledWith(
            'All validations passed successfully.'
        );
        expect(mockSummary.addHeading).toHaveBeenCalledWith(
            'OGC API - Validation Summary'
        );
        expect(mockSummary.write).toHaveBeenCalled();
        expect(mockExec).toHaveBeenCalledWith(
            'podman',
            ['stop', 'container-id'],
            {
                silent: true,
            }
        );
    });

    it('marks run as failed when no validations are selected', async () => {
        await run();

        expect(core.warning).toHaveBeenCalledWith(
            'No validations were selected. Please enable at least one validation option.'
        );
        expect(core.info).toHaveBeenCalledWith(
            'All validations passed successfully.'
        );
    });

    it('marks run as failed when one validation fails', async () => {
        const request = new Request(
            'http://localhost:8080/teamengine/rest/suites/ogcapi-processes-1.0/run?iut=https://example.com'
        );
        mockGetParams.mockReturnValue({
            serviceUrl: 'https://example.com',
            teamenginePort: 8080,
            teamengineImage: 'teamengine-production:1.0-SNAPSHOT',
            services: [
                {
                    name: 'Processes',
                    testsToIgnore: [],
                    xmlFilePath: '',
                    request: jest.fn().mockReturnValue(request),
                },
            ],
        });

        global.fetch = jest
            .fn<typeof fetch>()
            .mockRejectedValueOnce(new Error('Port free'))
            .mockResolvedValueOnce({
                ok: true,
                text: async () => `
                    <testng-results>
                        <suite name="ProcessSuite">
                            <test name="processes">
                                <class name="com.test.Processes">
                                    <test-method name="mustFail" status="FAIL">
                                        <exception>
                                            <message>Execution failed</message>
                                        </exception>
                                    </test-method>
                                </class>
                            </test>
                        </suite>
                    </testng-results>
                `,
            } as Response);

        await run();

        expect(core.setFailed).toHaveBeenCalledWith(
            'One or more validations failed.'
        );
    });

    it('handles container startup errors and reports them', async () => {
        mockGetParams.mockReturnValue({
            serviceUrl: 'https://example.com',
            teamenginePort: 8080,
            teamengineImage: 'teamengine-production:1.0-SNAPSHOT',
            services: [],
        });

        mockWaitForWebsite
            .mockResolvedValueOnce(undefined)
            .mockRejectedValueOnce(
                new Error('Timed out waiting for Team Engine')
            );

        await run();

        expect(core.setFailed).toHaveBeenCalledWith(
            expect.stringContaining(
                'Failed to start Team Engine validator server with image <docker.io/ogccite/teamengine-production:1.0-SNAPSHOT>: Timed out waiting for Team Engine'
            )
        );
    });
});
