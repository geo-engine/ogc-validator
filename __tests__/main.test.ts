/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * To mock dependencies in ESM, you can create fixtures that export mock
 * functions and objects. For example, the core module is mocked in this test,
 * so that the actual '@actions/core' module is not imported.
 */
import { jest } from '@jest/globals';
import * as core from '../__fixtures__/core.js';
import { waitForWebsite } from '../__fixtures__/wait.js';

// Mocks should be declared before the module being tested is imported.
jest.unstable_mockModule('@actions/core', () => core);
jest.unstable_mockModule('../src/wait.js', () => ({ waitForWebsite }));

const { _validateOGCAPIProcesses } = await import('../src/main.js');

describe('main.ts', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('Validates OGC API Processes successfully', async () => {
        const mockServiceUrl = 'http://mock-service-url';
        const mockEchoProcessId = 'mock-echo-process-id';
        const mockIgnoreList: string[] = ['test1'];

        waitForWebsite.mockImplementation(
            async (_url: string, _timeoutInSeconds: number) => void 0
        );

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

        const result = await _validateOGCAPIProcesses(
            mockServiceUrl,
            mockEchoProcessId,
            mockIgnoreList
        );

        expect(result).toEqual({
            name: 'OGC API - Processes',
            success: true,
            passed: 1,
            skipped: 1,
            failed: 1,
            ignored: 1,
            total: 3,
        });
    });
});
