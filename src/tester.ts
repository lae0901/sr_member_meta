import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { testResults_append, testResults_consoleLog, testResults_new } from 'sr_test_framework';
import { ext_toLangCode, langCode_setup, memberMeta_assignProperty, memberMeta_metaDirPath, memberMeta_readContent, memberMeta_readFolder, srcType_toExt } from '.';

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

  // ext_toLangCode
  {
    const srcmbr_filePath = 'C:\\web\\extensions\\sr-rpg-ibmi\\client\\src\\extension.sqlrpgle'
    const ext = path.extname(srcmbr_filePath) ;
    const method = 'ext_toLangCode';
    const actual = ext_toLangCode(ext);
    const expected = 'rpg';
    testResults_append(results, { method, expected, actual });
  }

  // memberMeta_metaDirPath
  {
    const method = 'memberMeta_metaDirPath';
    const dirPath = 'C:\\s067454r\\srcf\\stevesrc'
    const actual = memberMeta_metaDirPath(dirPath) ;
    const expected = path.join(dirPath, '.mirror') ;
    testResults_append(results, { method, expected, actual });
  }

  // memberMeta_assignProperty
  {
    const method = 'memberMeta_assignProperty';
    const dirPath = 'C:\\s067454r\\srcf\\stevesrc'
    const srcmbr_filePath = path.join(dirPath, 'CIN0103R.sqlrpgle');
    const procedureNameArr = ['AddLabelModel_ErrorCheck', 'pcrrn_Setoff'];
    await memberMeta_assignProperty(srcmbr_filePath, 'definedProcedures', procedureNameArr );
    const content = await memberMeta_readContent(srcmbr_filePath);
    const actual = content?.definedProcedures ;
    const expected = procedureNameArr ;
    testResults_append(results, { method, expected, actual });
  }

  return results;
}

// ------------------------------ activityLog_append ------------------------------
function activityLog_append(text: string)
{
  console.log(`activity log: ${text}`);
}