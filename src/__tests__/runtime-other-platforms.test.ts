import * as path from 'path';
import * as assert from 'assert';
import * as testShared from './test-shared';
import * as debugUtils from '../lib/debug-utils';
import { MachineType } from '../lib/debug-file';
describe('other emulators', () => {
    const BUILD_CWD = testShared.DEFAULT_BUILD_CWD;
    const PROGRAM = BUILD_CWD + '/program.pet';
    const MAP_FILE = PROGRAM + '.map';
    const DEBUG_FILE = PROGRAM + '.dbg';
    const LABEL_FILE = PROGRAM + '.lbl';

    const VICE_DIRECTORY = testShared.DEFAULT_VICE_DIRECTORY;
    const MESEN_DIRECTORY = testShared.DEFAULT_MESEN_DIRECTORY;
    const VICE_ARGS = testShared.DEFAULT_COMMON_VICE_ARGS;
    const MESEN_ARGS = testShared.DEFAULT_MESEN_ARGS;

    afterEach(testShared.cleanup);

    beforeEach(async () => {
        await debugUtils.delay(Math.random() * 1000);
    });

    const NONC64_C = path.join(BUILD_CWD, "src/test_non_c64.c")

    test('nes works correctly', async () => {
        const PROGRAM = BUILD_CWD + '/program.nes';
        const MAP_FILE = PROGRAM + '.map';
        const DEBUG_FILE = PROGRAM + '.dbg';
        const LABEL_FILE = PROGRAM + '.lbl';

        const rt = await testShared.newRuntime();

        await rt.start(
            await testShared.portGetter(),
            PROGRAM,
            BUILD_CWD,
            true,
            false,
            false,
            VICE_DIRECTORY,
            MESEN_DIRECTORY,
            MESEN_ARGS,
            false,
            DEBUG_FILE,
            MAP_FILE,
            MachineType.unknown,
            LABEL_FILE
        );

        await testShared.waitFor(rt, 'stopOnEntry');

        await rt.setBreakPoint(NONC64_C, 8);
        await Promise.all([
            rt.continue(),
            testShared.waitFor(rt, 'stopOnBreakpoint')
        ]);

        // To verify Lua didn't timeout waiting for execution
        await debugUtils.delay(5000);

        await rt.continue();
    });

    test('xpet works correctly', async () => {
        const rt = await testShared.newRuntime();

        await rt.start(
            await testShared.portGetter(),
            PROGRAM,
            BUILD_CWD,
            true,
            false,
            false,
            VICE_DIRECTORY,
            MESEN_DIRECTORY,
            VICE_ARGS,
            false,
            DEBUG_FILE,
            MAP_FILE,
            MachineType.unknown,
            LABEL_FILE
        );

        await testShared.waitFor(rt, 'stopOnEntry');
        await testShared.selectCTest(rt, 'test_non_c64');

        await rt.setBreakPoint(NONC64_C, 8);
        await Promise.all([
            rt.continue(),
            testShared.waitFor(rt, 'stopOnBreakpoint')
        ]);

        await Promise.all([
            rt.stepIn(),
            testShared.waitFor(rt, 'stopOnStep', (type, __, file, line, col) => {
                assert.strictEqual(file, NONC64_C);
                assert.strictEqual(line, 3);
            }),
        ]);

        const wastedOnMyself = [
            testShared.waitFor(rt, 'stopOnStep', (type, __, file, line, col) => {
                assert.strictEqual(file, NONC64_C);
                assert.strictEqual(line, 9);
            }),
        ];

        await Promise.all([
            rt.stepOut(),
            ...wastedOnMyself,
        ]);

        await rt.continue();
        await testShared.waitFor(rt, 'end');
    });
});
