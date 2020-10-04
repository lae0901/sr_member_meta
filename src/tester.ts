import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { testResults_append, testResults_consoleLog, testResults_new } from 'sr_test_framework';

// run main function that is declared as async. 
async_main();

// ------------------------------- async_main ---------------------------------
async function async_main()
{
  const results = testResults_new();

  // member_test
  {
    const res = await member_test();
    results.push(...res);
  }

  testResults_consoleLog(results);
}

// ---------------------------------- member_test ----------------------------------
async function member_test()
{
  const results = testResults_new();

  // git_status.
  {
    const method = 'git_status';
    const expected = { isRepo: true, isBehind: false, isAhead: false, isModified: true };
    const actual = expected ;
    const desc = 'get git status';
    testResults_append(results, { method, expected, actual, desc });
  }

  return results;
}

// ------------------------------ activityLog_append ------------------------------
function activityLog_append(text: string)
{
  console.log(`activity log: ${text}`);
}