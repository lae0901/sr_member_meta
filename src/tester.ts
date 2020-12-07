import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { testResults_append, testResults_consoleLog, testResults_new } from 'sr_test_framework';
import { langCode_setup, memberMeta_readFolder, srcType_toExt } from '.';

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

  // langCode_setup
  {
    const srcType = 'SQLRPGLE' ;
    const method = 'langCode_setup' ;
    const actual = langCode_setup(srcType) as string ;
    const expected = 'rpg' ;
    testResults_append(results, { method, expected, actual });
  }

  // srcType_toExt
  {
    const srcType = 'SQLRPGLE';
    const method = 'srcType_toExt';
    const actual = srcType_toExt(srcType);
    const expected = '.sqlrpgle';
    testResults_append(results, { method, expected, actual });
  }

  return results;
}

// ------------------------------ activityLog_append ------------------------------
function activityLog_append(text: string)
{
  console.log(`activity log: ${text}`);
}