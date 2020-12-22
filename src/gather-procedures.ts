// import * as path from 'path';
// import { dir_readdir, file_isDir } from 'sr_core_ts';
// import { ext_toLangCode, memberMeta_isSrcmbrFile, memberMeta_readContent } from ".";

// // -------------------------- iGatherDefinedProcedureItem --------------------------
// export interface iGatherDefinedProcedureItem
// {
//   srcmbr_filePath: string;
//   definedProcName: string;
//   lowerProcName: string;
// }

// // --------------------- gatherDefinedProcedure_findProcedure ---------------------
// export async function gatherDefinedProcedure_findProcedure(
//   gatherArr: iGatherDefinedProcedureItem[], procName: string)
// {
//   let found_srcmbr_filePath = '';
//   const lowerProcName = procName.toLowerCase();
//   const found = gatherArr.find((item) =>
//   {
//     return lowerProcName == item.lowerProcName;
//   });
//   if (found)
//   {
//     found_srcmbr_filePath = found.srcmbr_filePath;
//     await memberMeta_readContent(found.srcmbr_filePath);
//   }
//   return found_srcmbr_filePath;
// }

// // ----------------- memberMeta_gatherDefinedProcedures -----------------
// export async function memberMeta_gatherDefinedProcedures(dirPath: string)
// {
//   const gatherArr: iGatherDefinedProcedureItem[] = [];

//   const { files } = await dir_readdir(dirPath);
//   for (const itemName of files)
//   {
//     const itemPath = path.join(dirPath, itemName);
//     const srcmbr_filePath = itemPath;
//     const ext = path.extname(srcmbr_filePath);
//     const langCode = ext_toLangCode(ext);

//     const { isDir } = await file_isDir(itemPath);
//     if ((isDir == false) && (langCode == 'rpg') && (memberMeta_isSrcmbrFile(itemPath)))
//     {
//       const meta = await memberMeta_readContent(srcmbr_filePath);
//       if (meta && meta.definedProcedures)
//       {
//         for (const definedProcName of meta.definedProcedures)
//         {
//           const lowerProcName = definedProcName.toLowerCase();
//           gatherArr.push({ srcmbr_filePath, definedProcName, lowerProcName });
//         }
//       }
//     }
//   }
//   return gatherArr;
// }
