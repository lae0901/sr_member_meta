import * as path from 'path';
import { dir_ensureExists, dir_readdir, file_readText, file_rename, file_unlink, file_writeNew, string_head } from 'sr_core_ts';
import { iDspfd_mbrlist } from 'sr_ibmi_common';

import { iGatherDefinedProcedureItem, gatherDefinedProcedure_findProcedure, 
            memberMeta_gatherDefinedProcedures } from './gather-procedures' ;
export { iGatherDefinedProcedureItem, gatherDefinedProcedure_findProcedure, 
          memberMeta_gatherDefinedProcedures };

// -------------------------------- LangCode ------------------------------------
export type LangCode = 'dds' | 'rpg' | 'sql' | 'other';

// ---------------------------- iOriginal_srcmbr_content --------------------------
export interface iOriginal_srcmbr_content 
{
  srcmbr_fileName: string,
  original_lines_text: string;
}

// ------------------------------ iMemberMetaItem ------------------------------
// To store addn info, like original lines of
// the srcmbr, store in standalone interface and write to separate file in the 
// .mirror-meta sub folder.
export interface iMemberMetaItem
{
  srcmbr: string,
  srcfName: string,
  srcfLib: string,
  srcType: string,
  textDesc: string,

  // fileName of the srcmbr in the PC folder.
  // fileName is not same as srcmbr in that it has .extension and srcmbr may be
  // assigned more meaningful name when stored on PC.
  srcmbr_fileName: string,

  dirPath: string,
  chgDate: string,
  chgTime: string;
  mtime: number;

  // langCode is derived from srcType. See langCode_setup function.
  langCode: LangCode;

  // line num where compile time arrays start in rpg srcmbr.
  // Use this when deciding whether to shift source code to the left by 5 
  // characters.
  compile_time_array_start: number;

  // name of meta file where this member meta info is stored.
  metaFileName?: string;

  // rpg procedures defined in the source member. Used by rpg-ibmi definition 
  // provider. When press F12 to goto definition, 
  definedProcedures?: string[]
}

// ------------------------------- folderContent_new -------------------------------
export function folderContent_new(
  dspfd: iDspfd_mbrlist, dirPath: string, srcmbr_fileName: string)
{
  const content: iMemberMetaItem = {
    srcmbr: dspfd.MBRNAME,
    srcfName: dspfd.FILENAME, srcfLib: dspfd.LIBNAME,
    srcType: dspfd.SRCTYPE, textDesc: dspfd.MBRTEXT,
    srcmbr_fileName,
    dirPath,
    chgDate: dspfd.CHGDATE, chgTime: dspfd.CHGTIME,
    mtime: dspfd.mtime,
    langCode: langCode_setup(dspfd.SRCTYPE),
    compile_time_array_start: -1
  };
  return content;
}

// -------------------------------- langCode_setup --------------------------------
export function langCode_setup(srcType: string): LangCode
{
  // language code.  is rpg, dds or other.
  let langCode: LangCode = 'other';
  if ((srcType == 'SQLRPGLE') || (srcType == 'RPGLE'))
    langCode = 'rpg';
  else if ((srcType == 'DSPF') || (srcType == 'PF')
    || (srcType == 'LF') || (srcType == 'PRTF'))
    langCode = 'dds';
  else if ( srcType.indexOf('SQL') != -1 )
    langCode = 'sql' ;
  return langCode;
}

// ------------------------------ memberMeta_assignProperty ------------------------------
/**
 * update the specified property of memberMeta file of the srcmbr_file. Each srcmbr
 * file has a memberMeta file stored in the .mirror folder of the folder that 
 * contains the srcmbr file. 
 * @param srcmbr_filePath path of srcmbr file whose memberMeta info is to be updated.
 * @param propName name of property in memberMeta to assign to.
 * @param vlu Value to assign to the property.
 */
export async function memberMeta_assignProperty( srcmbr_filePath: string, 
                  propName:'definedProcedures' | 'changeTimes', vlu:object | string[])
{
  const content = await memberMeta_readContent(srcmbr_filePath ) ;
  if ( content )
  {
    if ( propName == 'definedProcedures' )
    {
      content.definedProcedures = vlu as string[] ;
    }
    else if ( propName == 'changeTimes')
    {
      const {mtime, chgDate, chgTime } = vlu as {mtime:number, chgDate:string, chgTime:string};
      content.mtime = mtime ;
      content.chgDate = chgDate ;
      content.chgTime = chgTime ;
    }

    {
      const dirPath = path.dirname(srcmbr_filePath) ;
      const fileName = path.basename(srcmbr_filePath) ;
      await memberMeta_write( dirPath, fileName, {content} ) ;
    }
  }
}

// ---------------------------- memberMeta_ensureFolder ----------------------------
export async function memberMeta_ensureFolder(dirPath: string,
                          appendActivityLog?: (text: string) => void)
{
  const metaDirPath = path.join(dirPath, '.mirror');
  const { errmsg } = await dir_ensureExists(metaDirPath);
  if (errmsg && appendActivityLog)
  {
    appendActivityLog(`error ${errmsg} creating srcf mirror meta folder ${metaDirPath}`);
  }
}

// ------------------------ memberMeta_findDefinedProcedure ------------------------
/**
 * open member meta file of a srcmbr file. Search for defined procedure. 
 * @param srcmbr_filePath path of srcmbr file in which to search for the defined 
 * procedure.
 * @param procName procedure to search for
 */
export async function memberMeta_findDefinedProcedure(srcmbr_filePath: string, procName: string)
{
  let definedProcedures: string[] | undefined;
  let foundProc:string | undefined ;

  // read the list of procedures defined in this srcmbr
  const meta = await memberMeta_readContent(srcmbr_filePath);
  if (meta)
  {
    definedProcedures = meta.definedProcedures;
    const lowerProcName = procName.toLowerCase();
    if (definedProcedures)
    {
      foundProc = definedProcedures.find((item) =>
      {
        return lowerProcName == item.toLowerCase();
      });
    }
  }
  return { meta, definedProcedures, foundProc };
}

// ---------------------------- memberMeta_isSrcmbrFile ----------------------------
/** check if file name could be name of srcmbr file mirrored down from ibm i.
 *  was created from srcmbr mirrored down to PC from ibm i.
 * If file name is not .json file or not directory, then is considered to be
 * a srcmbr file name.
 * @param srcmbr_fileName name of file to check if could be srcmbr file
*/
export function memberMeta_isSrcmbrFile( srcmbr_fileName:string ) : boolean
{
  const ext = path.extname(srcmbr_fileName);
  if (( !ext ) || ( ext == '.json'))
    return false ;
  else
    return true ;
}

// ---------------------------- memberMeta_metaDirPath ----------------------------
/**
 * return path of folder where memberMeta files for the srcmbr files in the input
 * dirPath are stored
 * @param dirPath name of srcmbr files directory path.
 */
export function memberMeta_metaDirPath(dirPath: string)
{
  const metaDirPath = path.join(dirPath, '.mirror');
  return metaDirPath;
}

// ------------------------------- memberMeta_unlink -------------------------------
export async function memberMeta_unlink(dirPath: string, srcmbr_fileName: string)
{
  const metaPath = memberMeta_filePath(undefined, dirPath, srcmbr_fileName);
  await file_unlink(metaPath);
}

// ------------------------------ memberMeta_readContent ------------------------------
export async function memberMeta_readContent(filePath?: string, dirPath?: string, srcmbr_fileName?: string)
{
  let content: iMemberMetaItem | undefined;
  const metaPath = memberMeta_filePath(filePath, dirPath, srcmbr_fileName);
  const { text: metaText } = await file_readText(metaPath);
  if (metaText)
  {
    content = JSON.parse(metaText);
  }
  return content;
}

// ------------------------------ memberMeta_readFile ------------------------------
/** read the contents of memberMeta file of this srcmbr_fileName  */
export async function memberMeta_readFile(dirPath: string, srcmbr_fileName: string)
{
  let memberMeta: iMemberMetaItem | undefined;
  const metaPath = memberMeta_filePath(undefined, dirPath, srcmbr_fileName);
  const { text: metaText } = await file_readText(metaPath);
  if (metaText)
  {
    try
    {
      memberMeta = JSON.parse(metaText);
    }
    catch(e)
    {
      memberMeta = undefined;
    }
  }
  
  // store the name of file that contains the member meta info
  if (memberMeta)
    memberMeta.metaFileName = path.basename(metaPath);

  return memberMeta;
}

// ------------------------------ map_fromStringArray -----------------------------
function map_fromStringArray<T>( arr:string[], inlvlu:T ) : Map<string, T>
{
  const map = new Map<string,T>() ;
  for( const key of arr )
  {
    map.set(key, inlvlu ) ;
  }
  return map ;
}

// ----------------------------- memberMeta_readFolder -----------------------------
/** Gather memberMeta info on each file in dirPath.
 * returns an array contain name of each file in the @param dirPath and the 
 * memberMeta info of that file. ( which can be undefined in case where a file
 * exists in @param dirPath but there is no memberMeta info on that file. )
 * @param dirPath directory path of `folder` to gather meta info from.
 * @returns object containing two arrays. memberMetaArr and orphanFileArr.
*/
export async function memberMeta_readFolder(dirPath: string)
{
  const memberMetaArr:iMemberMetaItem[] = [];
  const orphanFileArr: string[] = [] ;

  const { files } = await dir_readdir(dirPath);
  for (const fileName of files)
  {
    if ( memberMeta_isSrcmbrFile(fileName))
    {
      const memberMeta = await memberMeta_readFile(dirPath, fileName);
      if ( memberMeta )
      {
        memberMetaArr.push( memberMeta );
      }
      else
      {
        // store file name into array of files in the folder which do not have
        // an associated memberMeta info file. Should highlight those files to the 
        // user since they do not exist as srcmbr on ibm i.
        orphanFileArr.push( fileName ) ;
      }
    }
  }

  await memberMetaDir_cleanup( dirPath, memberMetaArr ) ;

  return { memberMetaArr, orphanFileArr } ;
}

// ----------------------------- memberMetaDir_cleanup -----------------------------
/**
 * cleanup the contents of .mirror member meta folder.
 * Cleanup entails deleting all memberMeta files from the .mirror folder which do
 * not have a corresponding srcmbr_file in the srcmbr mirrored folder.
 * @param dirPath path of srcmbr mirrored folder.
 * @param memberMetaArr array stores iMemberMetaItem for each srcmbr_file in the 
 * mirrored folder.
 */
async function memberMetaDir_cleanup( dirPath:string, memberMetaArr:iMemberMetaItem[] )
{
  // read names of all files in the memberMeta directory.
  // create a Map object, with each key in the Map set to the memberMetaFile
  // file name. ( this is used to check for hanging memberMeta directory files. )
  const metaDirPath = memberMeta_metaDirPath(dirPath);
  const { files: metaFiles } = await dir_readdir(metaDirPath);
  const metaFileMap = map_fromStringArray(metaFiles, false);

  // for each memberMeta file found in memberMetaArr, mark that file as used in the
  // set of all files in the member meta directory.
  memberMetaArr.forEach((item) =>
  {
    const { metaFileName } = item ;
    if ( metaFileName )
    {
      metaFileMap.set( metaFileName, true ) ;
    }
  });

  // delete all of the member meta files not matched up with actual srcmbr files
  // in memberMetaArr.
  for( const item of metaFileMap )
  {
    const [ key, vlu ] = item ;
    if (!vlu)
    {
      const metaFilePath = path.join(metaDirPath, key);
      await file_unlink(metaFilePath);
    }
  }
}

// ------------------------------- memberMeta_write -------------------------------
export async function memberMeta_write(dirPath: string, srcmbr_fileName: string,
  data: {dspfd?: iDspfd_mbrlist, content?: iMemberMetaItem, 
          compile_time_array_start?:number })
{
  let content: iMemberMetaItem | undefined;
  if (data.content)
  {
    content = data.content;
  }
  else if (data.dspfd)
  {
    content = folderContent_new(data.dspfd, dirPath, srcmbr_fileName);
  }
  if (content)
  {
    content.langCode = langCode_setup( content.srcType );

    // store line num where compile time arrays start in rpg srcmbr.
    // Use this when deciding whether to shift source code to the left by 5 
    // characters.
    if ( typeof data.compile_time_array_start != 'undefined' )
    {
      content.compile_time_array_start = data.compile_time_array_start;
    }

    await memberMeta_ensureFolder(dirPath) ;
    const metaPath = memberMeta_filePath(undefined, dirPath, content.srcmbr_fileName);
    const metaText = JSON.stringify(content);
    await file_writeNew(metaPath, metaText);
  }
  
  return content!;
}

// ------------------------------ memberMeta_filePath ------------------------------
function memberMeta_filePath(srcmbr_filePath?: string, dirPath?: string, srcmbr_fileName?: string)
{
  let metaPath = '';
  let metaDirPath = '';
  let metaName = '';

  // first, build srcmbr_filePath.
  if (!srcmbr_filePath && dirPath && srcmbr_fileName)
  {
    srcmbr_filePath = path.join(dirPath, srcmbr_fileName);
  }

  if (srcmbr_filePath)
  {
    const parts = path.parse(srcmbr_filePath);
    dirPath = parts.dir;
    const extPart = parts.ext ? '-' + parts.ext.substr(1) : '';
    metaDirPath = memberMeta_metaDirPath(dirPath) ;
    metaName = parts.name + extPart + '.json';
  }

  metaPath = path.join(metaDirPath, metaName);

  return metaPath;
}

// ------------------------------- memberOriginal_write -------------------------------
// member original is file in .mirror folder that stores original text lines of the
// srcmbr file. 
export async function memberOriginal_write(dirPath: string, srcmbr_fileName: string,
                                            original_lines_text: string)
{
  const original: iOriginal_srcmbr_content = {srcmbr_fileName, original_lines_text} ;
  const origPath = memberOriginal_filePath(dirPath, srcmbr_fileName);
  const origText = JSON.stringify(original);
  await file_writeNew(origPath, origText);
}

// ------------------------------ memberOriginal_filePath ------------------------------
// member original is file in .mirror folder that stores original text lines of the
// srcmbr file. 
function memberOriginal_filePath(dirPath: string, srcmbr_fileName: string)
{

  let origPath = '';
  let metaDirPath = '';
  let origName = '';

  const original_filePath = path.join(dirPath, srcmbr_fileName);

  {
    const parts = path.parse(original_filePath);
    const extPart = parts.ext ? '-' + parts.ext.substr(1) : '';
    metaDirPath = path.join(dirPath, '.meta');
    origName = parts.name + extPart + '-orig' + '.json';
  }

  origPath = path.join(metaDirPath, origName);

  return origPath;
}

// ------------------------------- srcmbr_filePath_rename -------------------------------
// rename the file that stores srcmbr in the PC mirror folder.
// When file is renamed, the memberMeta file has to be renamed also.
export async function srcmbr_filePath_rename( 
        srcmbr_filePath:string, toFileName:string )
{
  let errmsg = '' ;
  let toPath = '' ;

  // rename the srcmbr file.
  ({toPath, errmsg} = await file_rename(srcmbr_filePath, {baseName:toFileName}));

  // rename the associated memberMeta file.
  {
    const metaPath = memberMeta_filePath( srcmbr_filePath ) ;
    const { toPath:toMetaPath, errmsg: metaErrmsg } = await file_rename( metaPath, { baseName: toFileName });
  }

  return {toPath, errmsg } ;
}

// --------------------------------- srcType_toExt ---------------------------------
export function srcType_toExt( srcType:string ) : string
{
  // extension of this source file.
  let ext = '.' + srcType.toLowerCase();
  const upper_srcType = srcType.toUpperCase() ;
  if (string_head(upper_srcType, 3) == 'SQL' && (upper_srcType != 'SQLRPGLE'))
    ext = '.sqli';
  else if (upper_srcType == 'CMD')
    ext = '.cmdi';
  else if ( upper_srcType == 'RPG')
    ext = '.rpgi' ;
  return ext ;
}

// -------------------------------- ext_toLangCode --------------------------------
/**
 * convert file extension to language code of the source code contained in the file.
 * @param ext extension of the srcmbr file
 */
export function ext_toLangCode( ext:string ) : LangCode 
{
  ext = ext.toLowerCase( ) ;
  if (( ext == '.sqlrpgle') || ( ext == '.rpgle') || ( ext == '.rpgi'))
    return 'rpg' ;
  else if ( ext == '.sqli' )
    return 'sql' ;
  else if ( ext == '.dspf')
    return 'dds' ;
  else
    return 'other' ;
}
