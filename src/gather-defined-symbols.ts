import { dir_readdir, file_isDir } from "sr_core_ts";
import { RPG_symbolType } from "sr_ibmi_common";
import * as path from 'path' ;
import { ext_toLangCode, memberMeta_isSrcmbrFile, memberMeta_readContent } from ".";


// -------------------------- iGatherDefinedSymbolItem --------------------------
export interface iGatherDefinedSymbolItem
{
  srcmbr_filePath: string;
  symbolName: string;
  symbolType: RPG_symbolType;
  lowerSymbolName: string;
}

// --------------------- gatherDefinedSymbol_findSymbol ---------------------
export async function gatherDefinedSymbol_findSymbol(
  gatherArr: iGatherDefinedSymbolItem[], symbolName: string, symbolType: RPG_symbolType)
{
  let found_srcmbr_filePath = '';
  const lowerSymbolName = symbolName.toLowerCase();
  const found = gatherArr.find((item) =>
  {
    return symbolType == item.symbolType && lowerSymbolName == item.lowerSymbolName;
  });
  if (found)
  {
    found_srcmbr_filePath = found.srcmbr_filePath;
    await memberMeta_readContent(found.srcmbr_filePath);
  }
  return found_srcmbr_filePath;
}

// ----------------- memberMeta_gatherDefinedSymbols -----------------
export async function memberMeta_gatherDefinedSymbols(dirPath: string)
{
  const gatherArr: iGatherDefinedSymbolItem[] = [];

  const { files } = await dir_readdir(dirPath);
  for (const itemName of files)
  {
    const itemPath = path.join(dirPath, itemName);
    const srcmbr_filePath = itemPath;
    const ext = path.extname(srcmbr_filePath);
    const langCode = ext_toLangCode(ext);

    const { isDir } = await file_isDir(itemPath);
    if ((isDir == false) && (langCode == 'rpg') && (memberMeta_isSrcmbrFile(itemPath)))
    {
      const meta = await memberMeta_readContent(srcmbr_filePath);
      if (meta && meta.definedSymbols)
      {
        for (const item of meta.definedSymbols)
        {
          const lowerSymbolName = item.symbolName.toLowerCase();
          gatherArr.push({ srcmbr_filePath, ...item, lowerSymbolName });
        }
      }
    }
  }
  return gatherArr;
}
