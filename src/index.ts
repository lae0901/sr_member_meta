import * as path from 'path';
import { dir_ensureExists, dir_readdir, file_readText, file_unlink, file_writeNew } from 'sr_core_ts';
import { iDspfd_mbrlist } from 'sr_ibmi_common';

// -------------------------------- LangCode ------------------------------------
export type LangCode = 'dds' | 'rpg' | 'other';

// ---------------------------- iOriginal_srcmbr_content --------------------------
export interface iOriginal_srcmbr_content 
{
  srcmbr_fileName: string,
  langCode: LangCode;
  compile_time_array_start: number;
  original_lines_text: string;
}

// ------------------------------ iMemberMetaItem ------------------------------
// iMemberMetaInfo
// get rid of iMemberMeta interface.  To store addn info, like original lines of
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
    mtime: dspfd.mtime
  };
  return content;
}

// ---------------------------- memberMeta_ensureFolder ----------------------------
export async function memberMeta_ensureFolder(dirPath: string,
                          appendActivityLog: (text: string) => void)
{
  const metaDirPath = path.join(dirPath, '.mirror');
  const { errmsg } = await dir_ensureExists(metaDirPath);
  if (errmsg)
  {
    appendActivityLog(`error ${errmsg} creating srcf mirror meta folder ${metaDirPath}`);
  }
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
export async function memberMeta_readFile(dirPath: string, srcmbr_fileName: string)
{
  let memberMeta: iMemberMetaItem | undefined;
  const metaPath = memberMeta_filePath(undefined, dirPath, srcmbr_fileName);
  const { text: metaText } = await file_readText(metaPath);
  if (metaText)
  {
    memberMeta = JSON.parse(metaText);
  }
  return memberMeta;
}

// ----------------------------- memberMeta_readFolder -----------------------------
export async function memberMeta_readFolder(dirPath: string)
{
  const memberMetaArr: iMemberMetaItem[] = [];
  const { files } = await dir_readdir(dirPath);
  for (const fileName of files)
  {
    const memberMeta = await memberMeta_readFile(dirPath, fileName);
    if (memberMeta)
    {
      memberMetaArr.push(memberMeta);
    }
  }
  return memberMetaArr;
}


// ------------------------------- memberMeta_write -------------------------------
export async function memberMeta_write(dirPath: string, srcmbr_fileName: string,
  data: {dspfd?: iDspfd_mbrlist, content?: iMemberMetaItem})
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
    const metaPath = memberMeta_filePath(undefined, dirPath, content.srcmbr_fileName);
    const metaText = JSON.stringify(content);
    await file_writeNew(metaPath, metaText);
  }
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
