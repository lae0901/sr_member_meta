import * as path from 'path';
import { dir_ensureExists, dir_readdir, file_readText, file_rename, file_unlink, file_writeNew, string_head } from 'sr_core_ts';
import { iDspfd_mbrlist } from 'sr_ibmi_common';

// -------------------------------- LangCode ------------------------------------
export type LangCode = 'dds' | 'rpg' | 'other';

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
  return langCode;
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
  return memberMeta;
}

// ----------------------------- memberMeta_readFolder -----------------------------
/** Gather memberMeta info on each file in dirPath.
 * returns an array contain name of each file in the @param dirPath and the 
 * memberMeta info of that file. ( which can be undefined in case where a file
 * exists in @param dirPath but there is no memberMeta info on that file. )
 * @param dirPath directory path of `folder` to gather meta info from.
 * @returns { memberMetaArr, orphanFileArr } arrays of files in the folder.
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
  return { memberMetaArr, orphanFileArr } ;
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

  if (!srcmbr_filePath && dirPath && srcmbr_fileName)
  {
    srcmbr_filePath = path.join(dirPath, srcmbr_fileName);
  }

  if (srcmbr_filePath)
  {
    const parts = path.parse(srcmbr_filePath);
    dirPath = parts.dir;
    const extPart = parts.ext ? '-' + parts.ext.substr(1) : '';
    metaDirPath = path.join(dirPath, '.mirror');
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
